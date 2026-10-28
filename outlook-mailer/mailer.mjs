#!/usr/bin/env node
// outlook-mailer — send email from YOUR Outlook / Microsoft 365 mailbox, in YOUR HTML template.
//
// Signs in as you (Microsoft device-code login, delegated Mail.Send), so mail leaves your own
// mailbox, is DKIM-signed by Microsoft, and shows in your Sent Items. No password is stored;
// only Microsoft's refresh token, in .token-cache.json (owner-only file permissions).
//
//   node mailer.mjs login                         one-time sign-in (opens a code to enter at microsoft.com/devicelogin)
//   node mailer.mjs whoami                        which mailbox is signed in
//   node mailer.mjs templates                     list templates and the {{fields}} each one needs
//   node mailer.mjs preview  --template t --vars v.json [--subject s]      writes previews/<t>.html to open
//   node mailer.mjs preview  --text note.txt                       a plain note, wrapped in templates/_shell.html
//   node mailer.mjs send     --template t --vars v.json --to a@b.com --subject s [--cc ..] [--bcc ..] [--attach f ...] --yes
//   node mailer.mjs send     --text note.txt --to a@b.com --subject s --yes      quick note, branded by the shell
//   node mailer.mjs test     --template t --vars v.json [--subject s]      sends to yourself only
//   node mailer.mjs history  [--to a@b.com]          what was sent, to whom, when
//   node mailer.mjs suppress a@b.com|@domain.com     never email this address (or domain) again
//
// Templates: drop an .html file in templates/. Write {{field}} where text should be filled in
// (HTML-escaped) and {{{field}}} for trusted HTML. Sending refuses if any field is left unfilled.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PublicClientApplication } from "@azure/msal-node";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const TPL_DIR = path.join(DIR, "templates");
const CACHE = path.join(DIR, ".token-cache.json");
const LOG = path.join(DIR, "sent-log.ndjson");
const SCOPES = ["Mail.Send", "User.Read", "offline_access"];

// .env next to this file (no dependency for it)
try {
  for (const line of fs.readFileSync(path.join(DIR, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const DAILY_CAP = Number(process.env.MAILER_DAILY_CAP || 50);
const MAX_RCPT = Number(process.env.MAILER_MAX_RECIPIENTS || 10);
const COOLDOWN_DAYS = Number(process.env.MAILER_COOLDOWN_DAYS || 3);
const SUPPRESS = path.join(DIR, "do-not-email.txt");

// ── sign-in ────────────────────────────────────────────────────────────────────
function app() {
  const tenant = process.env.MS_TENANT_ID, clientId = process.env.MS_CLIENT_ID;
  if (!tenant || !clientId) throw new Error("MS_TENANT_ID and MS_CLIENT_ID are not set — copy .env.example to .env (SETUP.md, Part 1)");
  return new PublicClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenant}` },
    cache: { cachePlugin: {
      beforeCacheAccess: async (c) => { if (fs.existsSync(CACHE)) c.tokenCache.deserialize(fs.readFileSync(CACHE, "utf8")); },
      afterCacheAccess: async (c) => { if (c.cacheHasChanged) fs.writeFileSync(CACHE, c.tokenCache.serialize(), { mode: 0o600 }); },
    } },
  });
}

export async function login(onCode = (msg) => console.log(msg)) {
  const r = await app().acquireTokenByDeviceCode({ scopes: SCOPES, deviceCodeCallback: (d) => onCode(d.message) });
  return { ok: true, signedInAs: r.account?.username };
}

async function token() {
  const pca = app();
  const [account] = await pca.getTokenCache().getAllAccounts();
  if (!account) throw new Error("Not signed in — run: node mailer.mjs login");
  try { return (await pca.acquireTokenSilent({ account, scopes: SCOPES })).accessToken; }
  catch { throw new Error("Sign-in expired — run: node mailer.mjs login"); }
}

async function graph(p, opts = {}) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${p}`, {
    ...opts, headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json", ...(opts.headers || {}) } });
  if (r.status === 202 || r.status === 204) return {};
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Microsoft Graph ${r.status}: ${b.error?.message || r.statusText}`);
  return b;
}

export async function whoami() {
  const me = await graph("/me?$select=displayName,mail,userPrincipalName");
  return { ok: true, name: me.displayName, mailbox: me.mail || me.userPrincipalName };
}

// ── templates ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tplPath = (name) => {
  const base = path.basename(String(name || "")).replace(/\.html?$/i, "");
  const f = path.join(TPL_DIR, `${base}.html`);
  if (!base || !fs.existsSync(f)) throw new Error(`No template "${name}" in templates/ — run: node mailer.mjs templates`);
  return f;
};
// Plain HTML comments are notes, so {{...}} inside them is ignored. Outlook's conditional
// comments (<!--[if mso]> ... <![endif]-->) carry real markup and are filled like the rest.
const NOTE = /<!--(?!\[if)[\s\S]*?-->/g;
export function fieldsOf(html) {
  return [...new Set([...html.replace(NOTE, "").matchAll(/\{\{\{?\s*([a-zA-Z0-9_.-]+)\s*\}?\}\}/g)].map((m) => m[1]))];
}
export function listTemplates() {
  if (!fs.existsSync(TPL_DIR)) return [];
  return fs.readdirSync(TPL_DIR).filter((f) => /\.html?$/i.test(f)).map((f) => {
    const html = fs.readFileSync(path.join(TPL_DIR, f), "utf8");
    return { template: f.replace(/\.html?$/i, ""), fields: fieldsOf(html), sizeKB: Math.round(html.length / 1024) };
  });
}
export function render(name, vars = {}) {
  let html = fs.readFileSync(tplPath(name), "utf8");
  const missing = fieldsOf(html).filter((k) => vars[k] === undefined || vars[k] === null || vars[k] === "");
  if (missing.length) throw new Error(`Template "${name}" needs: ${missing.join(", ")}`);
  const fill = (part) => part
    .replace(/\{\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}\}/g, (_, k) => String(vars[k]))
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, k) => esc(vars[k]));
  let out = "", last = 0;
  for (const m of html.matchAll(NOTE)) { out += fill(html.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
  return out + fill(html.slice(last));
}
// ── the shell: quick notes look like the brand too ────────────────────────────
// templates/_shell.html is her email design with the middle cut out: header and footer kept, and
// {{{body_html}}} where the message goes. Any plain note (a reply, a quick update) is dropped into
// it, so every email from the assistant looks like hers, not just the big templated ones. The
// footer IS the signature, so a typed sign-off ("Thanks, Carolyn") at the end is removed to avoid
// signing twice. Same approach OpulentBots uses for its own brands.
const SIGNOFF = /\n\s*(?:thanks|thank you|best|best regards|regards|kind regards|warm regards|sincerely|cheers)[,!.]?\s*(?:\n.*){0,3}\s*$/i;
export function shell(text, vars = {}) {
  if (!fs.existsSync(path.join(TPL_DIR, "_shell.html"))) throw new Error('No templates/_shell.html yet. Make it from the owner\'s template (SETUP.md, part J), or send with a template instead.');
  const body = String(text || "").replace(/\r/g, "").trim().replace(SIGNOFF, "").trim();
  if (!body) throw new Error("The note is empty");
  const body_html = body.split(/\n\s*\n/).map((p) =>
    `<p style="margin:0 0 16px 0;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
  return render("_shell", { ...vars, body_html });
}

export function preview(name, vars = {}, text) {
  const html = text ? shell(text, vars) : render(name, vars);
  name = text ? "_note" : name;
  const out = path.join(DIR, "previews", `${path.basename(name).replace(/\.html?$/i, "")}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return { ok: true, preview: out, bytes: html.length };
}
const textOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|h\d|li)>/gi, "\n")
  .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

// ── send ───────────────────────────────────────────────────────────────────────
const list = (v) => (Array.isArray(v) ? v : String(v || "").split(/[,;]/)).map((s) => s.trim()).filter(Boolean);
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function sentToday() {
  if (!fs.existsSync(LOG)) return 0;
  const day = new Date().toISOString().slice(0, 10);
  return fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes(`"day":"${day}"`)).length;
}

// ── send-guard: one person, not a list ────────────────────────────────────────────
// Same rules OpulentBots runs on its own mail: never email anyone on the do-not-email list, and
// don't email the same person again within MAILER_COOLDOWN_DAYS unless the owner says this is a
// deliberate follow-up (followUp:true). The guard is per ADDRESS across every email sent.
const norm = (a) => String(a || "").trim().toLowerCase();
function suppressed() {
  if (!fs.existsSync(SUPPRESS)) return [];
  return fs.readFileSync(SUPPRESS, "utf8").split("\n").map((l) => norm(l.replace(/#.*/, ""))).filter(Boolean);
}
export function suppress(entry) {
  const e = norm(entry);
  if (!EMAIL.test(e) && !/^@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`"${entry}" is not an email address or an @domain`);
  if (!suppressed().includes(e)) fs.appendFileSync(SUPPRESS, `${e}  # added ${new Date().toISOString().slice(0, 10)}\n`);
  return { ok: true, suppressed: e };
}
const blocked = (a, list) => list.includes(norm(a)) || list.includes("@" + norm(a).split("@")[1]);
function sentLog() {
  if (!fs.existsSync(LOG)) return [];
  return fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
export function history({ to } = {}) {
  const want = to ? norm(to) : null;
  return sentLog().filter((r) => !want || [...r.to, ...(r.cc || [])].map(norm).includes(want))
    .map((r) => ({ at: r.at, to: r.to, cc: r.cc, subject: r.subject, template: r.template })).slice(-100);
}
function lastSentTo(addr) {
  const a = norm(addr);
  const hits = sentLog().filter((r) => !r.test && [...r.to, ...(r.cc || [])].map(norm).includes(a));
  return hits.length ? hits[hits.length - 1].at : null;
}

export async function send({ template, vars = {}, html, text, to, cc, bcc, subject, attachments = [], confirm = false, toSelf = false, followUp = false }) {
  if (!html && !template && !text) throw new Error("Give a template, or text for a quick note");
  if (!subject) throw new Error("subject is required");
  const me = await whoami();
  const rcpt = toSelf ? [me.mailbox] : list(to);
  const all = [...rcpt, ...list(cc), ...list(bcc)];
  if (!rcpt.length) throw new Error("to is required");
  const bad = all.filter((a) => !EMAIL.test(a));
  if (bad.length) throw new Error(`Not valid email addresses: ${bad.join(", ")}`);
  if (all.length > MAX_RCPT) throw new Error(`${all.length} recipients is over the limit of ${MAX_RCPT} per email (MAILER_MAX_RECIPIENTS). Send separately.`);
  if (!toSelf && !confirm) throw new Error("Not sent: confirm is required. Show the owner the preview and recipients first, then send with confirm (CLI: --yes).");
  if (sentToday() >= DAILY_CAP) throw new Error(`Daily cap of ${DAILY_CAP} emails reached (MAILER_DAILY_CAP).`);
  if (!toSelf) {
    const sup = suppressed();
    const no = all.filter((a) => blocked(a, sup));
    if (no.length) throw new Error(`Not sent: ${no.join(", ")} ${no.length > 1 ? "are" : "is"} on the do-not-email list (do-not-email.txt).`);
    if (!followUp) {
      const recent = all.map((a) => [a, lastSentTo(a)]).filter(([, at]) => at && Date.now() - Date.parse(at) < COOLDOWN_DAYS * 864e5);
      if (recent.length) throw new Error(`Not sent: already emailed ${recent.map(([a, at]) => `${a} (${at.slice(0, 10)})`).join(", ")} in the last ${COOLDOWN_DAYS} days. If the owner wants this follow-up, send again with followUp (CLI: --follow-up).`);
    }
  }

  const body = html ?? (template ? render(template, vars) : shell(text, vars));
  const files = attachments.map((f) => {
    const buf = fs.readFileSync(f);
    if (buf.length > 3 * 1024 * 1024) throw new Error(`${path.basename(f)} is over 3 MB`);
    return { "@odata.type": "#microsoft.graph.fileAttachment", name: path.basename(f), contentBytes: buf.toString("base64") };
  });
  const addr = (a) => ({ emailAddress: { address: a } });
  await graph("/me/sendMail", { method: "POST", body: JSON.stringify({
    message: { subject, body: { contentType: "HTML", content: body },
      toRecipients: rcpt.map(addr), ccRecipients: list(cc).map(addr), bccRecipients: list(bcc).map(addr),
      ...(files.length ? { attachments: files } : {}) },
    saveToSentItems: true }) });
  fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), day: new Date().toISOString().slice(0, 10), from: me.mailbox, to: rcpt, cc: list(cc), bcc: list(bcc).length, subject, template: template || (text ? "_shell" : null), ...(toSelf ? { test: true } : {}) }) + "\n");
  return { ok: true, from: me.mailbox, to: rcpt, subject, savedToSentItems: true };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
  const many = (k) => rest.flatMap((v, i) => (rest[i - 1] === `--${k}` ? [v] : []));
  const vars = () => (opt("vars") ? JSON.parse(fs.readFileSync(opt("vars"), "utf8")) : {});
  const note = () => (opt("text") ? fs.readFileSync(opt("text"), "utf8") : undefined);
  const run = {
    login: () => login(),
    whoami: () => whoami(),
    templates: () => listTemplates(),
    history: () => history({ to: opt("to") }),
    suppress: () => suppress(rest[0]),
    preview: () => preview(opt("template"), vars(), note()),
    test: () => send({ template: opt("template"), text: note(), vars: vars(), subject: opt("subject") || "[TEST] template preview", toSelf: true }),
    send: () => send({ template: opt("template"), text: note(), vars: vars(), to: opt("to"), cc: opt("cc"), bcc: opt("bcc"), subject: opt("subject"),
      attachments: many("attach"), confirm: rest.includes("--yes"), followUp: rest.includes("--follow-up") }),
  }[cmd];
  if (!run) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 20).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(1); }
  Promise.resolve().then(run).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error("✗", e.message); process.exit(1); });
}
