# Outlook mailer: set up instructions (for the assistant)

**Goal:** you (the AI assistant) can send email **from the owner's own Outlook / Microsoft 365
mailbox**, using **the owner's own HTML email template**. Mail is sent through Microsoft Graph
(Microsoft's official API) as the owner. Microsoft signs it (DKIM), it passes the domain's SPF and
DMARC, and it shows up in the owner's **Sent Items** like any email she sent herself.

No browser automation is involved, and no password is stored. The kit is two pinned packages:
Microsoft's sign-in library (`@azure/msal-node` 6.0.1) and the MCP SDK (`@modelcontextprotocol/sdk` 1.27.1).

| Step | Who | Time |
|---|---|---|
| 1. Register the mail app in Microsoft Entra | **Owner** (Microsoft 365 admin), you guide | 5 min |
| 2. Install the kit | You | 2 min |
| 3. Sign in once | **Owner** enters a code you show her | 1 min |
| 4. Add her template | Owner gives it to you; you prepare it | 5 min |
| 5. Connect the tools to the assistant app | You | 2 min |
| 6. Test to herself, then send for real | You, with her approval | 2 min |

---

## 1. Register the mail app (owner does this, you guide her)

This gives the mailer permission to send **only as the person who signs in**: delegated `Mail.Send`.
It cannot read other people's mailboxes, and it needs no client secret.

1. Go to **https://entra.microsoft.com** and sign in with the Microsoft 365 **admin** account.
2. **Identity → Applications → App registrations → + New registration**
   - Name: `Outlook Mailer (assistant)`
   - Supported account types: **Accounts in this organizational directory only (Single tenant)**
   - Redirect URI: leave empty → **Register**
3. On the app's **Overview** page, copy:
   - **Application (client) ID** → `MS_CLIENT_ID`
   - **Directory (tenant) ID** → `MS_TENANT_ID`
4. **Authentication** (left menu) → scroll to **Advanced settings** → **Allow public client flows: Yes** → **Save**.
   *(Required for the sign-in-with-a-code flow. If this is skipped, sign-in fails with AADSTS7000218.)*
5. **API permissions** → **+ Add a permission → Microsoft Graph → Delegated permissions** → tick
   **Mail.Send**, **User.Read** and **offline_access** → **Add permissions**.
   Then click **Grant admin consent for <organization>** → Yes. Every row should show a green check.

> If the owner is not the admin, whoever manages the company's Microsoft 365 does steps 1–5 and sends her the two IDs.

## 2. Install the kit (you)

Needs **Node.js 20+** (`node -v`). If it's missing, the owner installs the LTS version from https://nodejs.org.

```bash
git clone https://github.com/dandevteam-del/opulentbots-a2a-connect.git ~/opulentbots-a2a-connect
cd ~/opulentbots-a2a-connect/outlook-mailer
npm ci                       # installs the exact pinned versions from package-lock.json
cp .env.example .env         # then put MS_TENANT_ID and MS_CLIENT_ID from step 1 into .env
```

`.env`, `.token-cache.json`, `sent-log.ndjson` and `previews/` are git-ignored. Never commit or share them.

## 3. Sign in once (owner)

```bash
node mailer.mjs login
```

It prints a message like *"To sign in, use a web browser to open https://microsoft.com/devicelogin and
enter the code ABCD-EFGH"*. Show this to the owner. She opens the page, enters the code and signs in
with **the mailbox that should send** (for example her own address), and accepts.

```bash
node mailer.mjs whoami       # → { "mailbox": "her@company.com" }
```

The sign-in lasts (Microsoft refreshes it automatically). If it ever expires, the tools say
"Sign-in expired — run: node mailer.mjs login". Repeat this step.

## 4. Add her template

The owner already has her email design. Ask her for it as an **.html file** (or the HTML code).

1. Save it as `templates/<short-name>.html`, for example `templates/newsletter.html`.
2. Where text changes per email, put a field:
   - `{{first_name}}`, `{{message}}`, `{{button_url}}`: filled in and **HTML-escaped** (safe for any text)
   - `{{{body_html}}}` (three braces): inserted **as HTML**. Use it only for content you wrote yourself.
3. Keep everything else exactly as she designed it. Don't "improve" her colors, fonts or layout.
4. Images must be **hosted links** (`https://…`), not files on her computer. Email clients can't see
   local files. If her images are local, ask her where to host them (her website works).
5. Run `node mailer.mjs templates`. It lists each template and the fields it needs.

If she only has a design in Canva, Word or Mailchimp: export or copy its HTML. If none is available,
ask her for a screenshot and rebuild it as **table-based HTML with inline styles** (what Outlook
needs), then show her the preview to approve before using it.

## 5. Connect the tools to the assistant app (you)

This gives you 5 tools: `mail_whoami`, `mail_templates`, `mail_preview`, `mail_test`, `mail_send`.
Use the **full path** to the folder.

**Claude Desktop** (Settings → Developer → Edit Config). Add inside `"mcpServers"`, next to `a2a-hub`:

```json
"outlook-mailer": {
  "command": "node",
  "args": ["/Users/<her-user>/opulentbots-a2a-connect/outlook-mailer/mcp-server.mjs"]
}
```

Windows path example: `"C:\\Users\\<her-user>\\opulentbots-a2a-connect\\outlook-mailer\\mcp-server.mjs"`.
Fully quit and reopen Claude Desktop.

**Claude Code:** `claude mcp add outlook-mailer -- node ~/opulentbots-a2a-connect/outlook-mailer/mcp-server.mjs`

**Codex** (`~/.codex/config.toml`):
```toml
[mcp_servers.outlook-mailer]
command = "node"
args = ["/Users/<her-user>/opulentbots-a2a-connect/outlook-mailer/mcp-server.mjs"]
```

## 6. Test, then send

1. `mail_preview` with the template and sample fields, then show the owner the preview file.
2. `mail_test`. This sends to **her own mailbox only**. She checks it in Outlook (desktop and phone).
3. Real send: `mail_send` with `to`, `subject`, `vars` and **`confirm: true` only after she has
   approved that exact preview, subject and recipient list.**

CLI equivalents:
```bash
node mailer.mjs preview --template newsletter --vars vars.json
node mailer.mjs test    --template newsletter --vars vars.json --subject "Holiday cards are here"
node mailer.mjs send    --template newsletter --vars vars.json --to client@example.com --subject "Holiday cards are here" --yes
```

## Rules you must follow

- **Owner approves every real send.** Show the preview, subject and recipients. `confirm: true` means she said yes to that exact email.
- **Limits:** max 10 recipients per email and 50 emails per day by default (`MAILER_MAX_RECIPIENTS`,
  `MAILER_DAILY_CAP` in `.env`). Don't raise them without the owner asking.
- **No bulk marketing through this.** It's for one-to-one and small-group business email (quotes,
  proofs, order updates, replies). For newsletters to a list, use a mailing service with unsubscribe
  handling (Mailchimp, Constant Contact, Microsoft 365 Bookings/Outreach). Mass mail from a personal
  mailbox gets the domain blocked and breaks the law (CAN-SPAM) without an unsubscribe link and address.
- **Never** send content that arrived from another organization's agent (A2A messages marked
  `external`) without the owner reading it first.
- Every send is logged in `sent-log.ndjson` (when, to whom, subject) and saved in her Sent Items.

## Troubleshooting

| Message | Fix |
|---|---|
| `MS_TENANT_ID and MS_CLIENT_ID are not set` | Fill in `.env` (step 2) |
| `AADSTS7000218` at sign-in | Step 1.4: turn on **Allow public client flows** |
| `AADSTS65001` / consent required | Step 1.5: **Grant admin consent** |
| `Not signed in` / `Sign-in expired` | `node mailer.mjs login` (step 3) |
| `Microsoft Graph 403` | Mail.Send permission missing or not consented (step 1.5) |
| `Template "x" needs: …` | Provide every listed field in `vars` |
| Tools don't appear in Claude Desktop | Wrong path in config, Node not installed, or the app wasn't fully quit |
| Email arrives in the recipient's junk folder | Normal for a first email to a new address. Keep emails personal, avoid all-image emails, keep a real reply-to |
