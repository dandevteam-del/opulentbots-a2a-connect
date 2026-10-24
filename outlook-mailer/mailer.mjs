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
//   node mailer.mjs send     --template t --vars v.json --to a@b.com --subject s [--cc ..] [--bcc ..] [--attach f ...] --yes
//   node mailer.mjs test     --template t --vars v.json [--subject s]      sends to yourself only
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
export function preview(name, vars = {}) {
  const html = render(name, vars);
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

export async function send({ template, vars = {}, html, to, cc, bcc, subject, attachments = [], confirm = false, toSelf = false }) {
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

  const body = html ?? render(template, vars);
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
  fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), day: new Date().toISOString().slice(0, 10), from: me.mailbox, to: rcpt, cc: list(cc), bcc: list(bcc).length, subject, template: template || null }) + "\n");
  return { ok: true, from: me.mailbox, to: rcpt, subject, savedToSentItems: true };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
  const many = (k) => rest.flatMap((v, i) => (rest[i - 1] === `--${k}` ? [v] : []));
  const vars = () => (opt("vars") ? JSON.parse(fs.readFileSync(opt("vars"), "utf8")) : {});
  const run = {
    login: () => login(),
    whoami: () => whoami(),
    templates: () => listTemplates(),
    preview: () => preview(opt("template"), vars()),
    test: () => send({ template: opt("template"), vars: vars(), subject: opt("subject") || "[TEST] template preview", toSelf: true }),
    send: () => send({ template: opt("template"), vars: vars(), to: opt("to"), cc: opt("cc"), bcc: opt("bcc"), subject: opt("subject"),
      attachments: many("attach"), confirm: rest.includes("--yes") }),
  }[cmd];
  if (!run) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(1); }
  Promise.resolve().then(run).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error("✗", e.message); process.exit(1); });
}
