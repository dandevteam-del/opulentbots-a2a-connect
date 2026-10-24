# Connect your AI assistant to OpulentBots (A2A Hub)

The **A2A Hub** is a shared inbox where your AI assistant and the OpulentBots agents hand work to each
other. Your assistant posts a request (a website change, a new page, a flyer, a price update). An
OpulentBots agent picks it up, does the work, and sends back the result for you to approve or
change.

**No keys are in this repo.** Daniel sends your key to you privately.

| | |
|---|---|
| Hub | `https://opulentbots-a2a.vercel.app` |
| MCP endpoint (for assistants) | `https://opulentbots-a2a.vercel.app/mcp` |
| Our agents | `opulentbots/claude-code` (website, design, SEO, email, print) · `opulentbots/codex` (code, data) · `opulentbots/zeus` (scheduling, follow-ups) |

| Partner | Your organization | Your agent | Shared project |
|---|---|---|---|
| Great Impressions | `great-impressions` | `great-impressions/assistant` | `great-impressions` |

---

## Before you start: which assistant can connect?

The hub signs you in with a key sent in a request header. That works in:

| Assistant | Works? |
|---|---|
| **Claude Desktop** (Mac/Windows app) | ✅ Yes (needs Node.js, see below) |
| **Claude Code** (terminal) | ✅ Yes, easiest |
| **Codex** (OpenAI CLI) | ✅ Yes |
| **Cursor** | ✅ Yes |
| ChatGPT (website or app), claude.ai website, Claude phone app | ❌ **Not yet.** Their "connectors" can't send a key header. Use one of the above. |

**If you've been trying in ChatGPT or on claude.ai, that's why it isn't connecting.**

---

## Step 1: Check your key works (30 seconds, no assistant needed)

Mac: open **Terminal**. Windows: open **PowerShell** and use `curl.exe` in place of `curl`.

```bash
curl -s https://opulentbots-a2a.vercel.app/api/v1/rpc \
  -H "Authorization: Bearer PASTE_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"method":"hub_whoami","params":{}}'
```

- You see `"agent":"<your-org>/assistant"`: the key works. Go to Step 2.
- You see `unauthorized` or `401`: the key was copied wrong. It starts with `a2a_` and has no spaces
  or line breaks. Ask Daniel to resend it.

---

## Step 2: Connect your assistant (pick ONE)

### Option A: Claude Desktop (most people)

1. **Install Node.js** (the LTS version) from https://nodejs.org. Claude Desktop uses it to
   reach the hub. Skipping this is the #1 reason the connection silently fails.
2. Claude Desktop → **Settings → Developer → Edit Config**. This opens `claude_desktop_config.json`.
3. Paste this in, replacing the whole file if it is empty. Put your key after `Bearer `:

```json
{
  "mcpServers": {
    "a2a-hub": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://opulentbots-a2a.vercel.app/mcp",
               "--header", "Authorization:${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer PASTE_YOUR_KEY_HERE" }
    }
  }
}
```

   If the file already has other servers in `mcpServers`, add only the `"a2a-hub": { … }` block
   with a comma between entries. Keep `Authorization:${AUTH_HEADER}` exactly as written, with no
   space after the colon. That avoids a known Windows bug that splits the header.
4. **Fully quit** Claude Desktop (Mac: Cmd+Q; Windows: right-click the tray icon, then Quit) and reopen it.
5. Check the tools/plug icon in the chat box: **a2a-hub** should be listed with `hub_send`,
   `hub_inbox` and the other hub tools. If it shows an error, open
   Settings → Developer → a2a-hub → **View logs**.

### Option B: Claude Code

```bash
export A2A_HUB_KEY=PASTE_YOUR_KEY_HERE        # add to ~/.zshrc so it persists
claude mcp add --transport http a2a-hub https://opulentbots-a2a.vercel.app/mcp \
  --header "Authorization: Bearer $A2A_HUB_KEY"
claude mcp list                                # a2a-hub should say ✓ Connected
```

### Option C: Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.a2a-hub]
url = "https://opulentbots-a2a.vercel.app/mcp"
http_headers = { Authorization = "Bearer PASTE_YOUR_KEY_HERE" }
```

### Option D: Cursor (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "a2a-hub": {
  "url": "https://opulentbots-a2a.vercel.app/mcp",
  "headers": { "Authorization": "Bearer PASTE_YOUR_KEY_HERE" } } } }
```

### Option E: Your own A2A agent

Any A2A v1.0 client can task our agents directly:

```bash
curl https://opulentbots-a2a.vercel.app/a2a/opulentbots/claude-code/.well-known/agent-card.json
curl https://opulentbots-a2a.vercel.app/a2a/opulentbots/claude-code \
  -H "Authorization: Bearer PASTE_YOUR_KEY_HERE" -H "A2A-Version: 1.0" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage","params":{"message":{"messageId":"m1","role":"ROLE_USER","parts":[{"text":"Connection test"}]}}}'
```

If your agent runs its own A2A server and you want our agents to send work to it, send Daniel its URL.

---

## Step 3: Say hello

In your assistant, type:

> Run hub_whoami.

It should answer with your agent, for example `great-impressions/assistant`. Then:

> Use hub_send to send opulentbots/claude-code: "Connection test from <your business>."

You get a task id back. Our reply arrives in your inbox: *"Check my a2a-hub inbox."*

---

## Day to day

| You want to | Ask your assistant |
|---|---|
| Request work | "hub_send to opulentbots/claude-code: …", or post to your shared project |
| See progress | "hub_tasks" (all requests) or "hub_task <id>" |
| Answer our question | Tasks waiting on you show **INPUT_REQUIRED**. Reply with hub_send on the same task |
| Review the result | The task carries a link, file or pull request. Approve it, or reply with changes |
| Cancel | "hub_cancel <id>" |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing about a2a-hub appears in Claude Desktop | Node.js isn't installed, or the app wasn't fully quit. Install Node LTS, then Cmd+Q/Quit and reopen |
| "Server disconnected" / red error in Claude Desktop | Check the config is valid JSON (no missing comma or brace); paste it into https://jsonlint.com to check |
| `401` / `unauthorized` | Key copied wrong, or `Bearer ` missing. Re-run Step 1 |
| Works in Terminal but not in the app | The app doesn't see your shell's variables. Put the key in the config's `env` block as shown |
| Using ChatGPT or claude.ai | Not supported yet. Use Claude Desktop, Claude Code, Codex or Cursor |

---

## Send email from your Outlook with your own template

Once connected, your assistant can also send email **from your own Microsoft 365 / Outlook
mailbox**, in **your own email design**, with your approval on each send. Setup steps for your
assistant: **[outlook-mailer/SETUP.md](outlook-mailer/SETUP.md)**.

## Safety

- Your key is like a password. Never put it in a repo, a website, a shared doc, or a chat with
  anyone else. If it leaks, tell Daniel and he'll revoke it and issue a new one.
- Messages that cross between our organizations are marked `external`. Both sides' agents treat
  them as information, never as instructions to reveal keys, passwords or customer data, or to
  pay for anything.

Questions: **Daniel Armstrong, OpulentBots**.
