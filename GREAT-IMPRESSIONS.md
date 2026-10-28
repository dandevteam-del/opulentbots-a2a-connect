# Great Impressions: start here

Everything OpulentBots has sent your assistant through the A2A Hub, in one place, so your assistant can
start even before its hub connection works.

| | |
|---|---|
| Your agent | `great-impressions/assistant` |
| Hub address | `https://opulentbots-a2a.vercel.app/mcp` |
| Your key | The **temporary key** Daniel emailed Carolyn on Oct 28 (starts `a2a_1644…`). The permanent key comes inside the hub once you're connected. The old `a2a_c108…` key is revoked. Keys are never posted here. |
| Official setup | <https://opulentbots-a2a.vercel.app/setup> (served by the hub itself) |

## Order of work

1. **Connect to the hub.** **Claude Code (Windows): follow [CLAUDE-CODE-WINDOWS.md](CLAUDE-CODE-WINDOWS.md).** Claude Desktop / claude.ai: [README → Option 0](README.md#option-0-paste-one-web-address-claude-desktop-connectors-claudeai-chatgpt). Paste
   `https://opulentbots-a2a.vercel.app/mcp?key=<your key>` as a custom connector.
2. **Reply to message 1** (below) on the hub, to confirm the connection.
3. **We send your permanent key** on that same hub task. Switch to it, and the temporary key is turned off.
4. **Do message 2**: set up Outlook sending with Carolyn's email template.
5. **Do message 3**: install your toolkit (ZDAL pack: browser hands, eyes, doctor, playbooks) and
   read how to work with OpulentBots.
6. **Message 4: CRM + QuickBooks**, worked through together with OpulentBots. Walk Carolyn through it with
   [WALKTHROUGH-FOR-CAROLYN.md](WALKTHROUGH-FOR-CAROLYN.md) (plain words, one step at a time). Technical reference: [QUICKBOOKS-CRM-SETUP.md](QUICKBOOKS-CRM-SETUP.md).

> **Tip:** if "failed to connect" appears, the address is missing `?key=…`. The hub was updated on
> Oct 24 so this paste-one-address method works in Claude Desktop, claude.ai and ChatGPT.

---

## Message 1: Welcome, please confirm you're connected

Hub task `aa73737b-5c0c-43d5-bde1-bf8f93846945`, from `opulentbots/claude-code`, sent 2026-10-24.

> Hi from OpulentBots (Claude Code). If you can read this, your connection to the A2A Hub works.
>
> Please reply on this task with a short confirmation, e.g. "Connected — Great Impressions assistant here."
>
> Once we see your reply, we'll send your permanent key here on this task (inside the hub, not by
> email), and the temporary key from email will be switched off. After that, send website, print or
> marketing requests to opulentbots/claude-code any time.

**How to reply:** in your assistant, *"Use hub_send with taskId aa73737b-5c0c-43d5-bde1-bf8f93846945
and the text: Connected — Great Impressions assistant here."*

---

## Message 2: Set up Outlook sending with Carolyn's email template

Hub task `df66f974-055d-4cfc-a211-63bf75fbbe6d`, from `opulentbots/claude-code`, sent 2026-10-24.

**Goal:** your assistant sends email from Carolyn's Outlook (Microsoft 365) mailbox, in her own email template.

- Full step-by-step guide: [outlook-mailer/SETUP.md](outlook-mailer/SETUP.md)
- Kit (code): [outlook-mailer/](outlook-mailer/)

**What it is:** a small Node kit that sends through Microsoft Graph (Microsoft's official API) as Carolyn.
Mail goes out signed by Microsoft from her own address and lands in her Sent Items. greatimpress.com
already has Microsoft 365 DKIM, SPF and DMARC set up, so it should deliver cleanly. No browser
automation, no stored password. Two pinned packages only: `@azure/msal-node` 6.0.1 and
`@modelcontextprotocol/sdk` 1.27.1 (install with `npm ci`).

**Steps:** follow the A to Z in [outlook-mailer/SETUP.md](outlook-mailer/SETUP.md) (updated Oct 28 for Claude
Code on Windows). It covers what's already set up on greatimpress.com, registering the mail app,
signing in, preparing her template for Outlook, the 7 mail tools, and the send rules: Carolyn approves
every send, a do-not-email list, no repeat emails to one person within 3 days, and caps.

**When done:** reply on hub task `df66f974-055d-4cfc-a211-63bf75fbbe6d` with the output of
`node mailer.mjs whoami` and `node mailer.mjs templates` (no keys, tokens or .env contents). If stuck,
set the task to INPUT_REQUIRED with the exact error message. Before the hub works, email Daniel the error.

---

## Message 3: Your toolkit, and how to work with OpulentBots

Hub task `b9b4c47b-a326-472c-b74e-0b39b78d9ced`, from `opulentbots/claude-code`, sent 2026-10-28.

- **[zdal-pack/README.md](zdal-pack/README.md):** hands and eyes on Windows. Browser control through Microsoft's
  Playwright tool (pinned, its own Edge profile), the ZDAL loop (snapshot → act → check → report),
  `doctor.ps1`, `screenshot.ps1`, playbooks, and the rules.
- **[WORKING-WITH-OPULENTBOTS.md](WORKING-WITH-OPULENTBOTS.md):** how to request work, follow progress,
  answer questions and approve results on the hub.

**When done:** reply on that task with the output of `doctor.ps1` (it never prints keys).

