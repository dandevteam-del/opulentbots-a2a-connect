#!/usr/bin/env node
// MCP server: gives Claude Desktop / Claude Code / Codex / Cursor the mailer as tools.
// Same code path as the CLI (mailer.mjs). Sending to anyone but yourself needs confirm:true.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { whoami, listTemplates, preview, send, render, history, suppress } from "./mailer.mjs";

const TOOLS = [
  { name: "mail_whoami", description: "Which Outlook mailbox the mailer is signed in as.", inputSchema: { type: "object", properties: {} } },
  { name: "mail_templates", description: "List the email templates in templates/ and the {{fields}} each needs.", inputSchema: { type: "object", properties: {} } },
  { name: "mail_preview", description: "Fill a template and save an HTML preview file to show the owner before sending. Returns the file path and the filled HTML.",
    inputSchema: { type: "object", properties: { template: { type: "string" }, vars: { type: "object" } }, required: ["template"] } },
  { name: "mail_test", description: "Send the filled template to the owner's own mailbox only, to check how it looks in Outlook.",
    inputSchema: { type: "object", properties: { template: { type: "string" }, vars: { type: "object" }, subject: { type: "string" } }, required: ["template"] } },
  { name: "mail_send", description: "Send a filled template from the owner's Outlook mailbox. Only set confirm:true after the owner has approved this exact preview, subject and recipient list. Max recipients and a daily cap apply.",
    inputSchema: { type: "object", properties: {
      template: { type: "string" }, vars: { type: "object" }, to: { type: "string", description: "comma-separated" },
      cc: { type: "string" }, bcc: { type: "string" }, subject: { type: "string" },
      attachments: { type: "array", items: { type: "string" }, description: "absolute file paths, 3 MB max each" },
      confirm: { type: "boolean" },
      followUp: { type: "boolean", description: "true only when the owner wants to email someone again within the cooldown" } }, required: ["template", "to", "subject", "confirm"] } },
  { name: "mail_history", description: "What was sent, to whom and when (optionally for one address). Check before emailing someone.",
    inputSchema: { type: "object", properties: { to: { type: "string" } } } },
  { name: "mail_suppress", description: "Put an address (or @domain) on the do-not-email list, e.g. when someone asks not to be emailed. Sends to it are refused from then on.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] } },
];

const server = new Server({ name: "outlook-mailer", version: "1.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: a = {} } }) => {
  try {
    const r = await ({
      mail_whoami: () => whoami(),
      mail_templates: async () => listTemplates(),
      mail_preview: async () => ({ ...preview(a.template, a.vars || {}), html: render(a.template, a.vars || {}).slice(0, 20000) }),
      mail_test: () => send({ template: a.template, vars: a.vars || {}, subject: a.subject || "[TEST] template preview", toSelf: true }),
      mail_send: () => send({ template: a.template, vars: a.vars || {}, to: a.to, cc: a.cc, bcc: a.bcc, subject: a.subject, attachments: a.attachments || [], confirm: a.confirm === true, followUp: a.followUp === true }),
      mail_history: async () => history({ to: a.to }),
      mail_suppress: async () => suppress(a.address),
    }[name] ?? (async () => { throw new Error(`unknown tool ${name}`); }))();
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: e.message }] };
  }
});
await server.connect(new StdioServerTransport());
