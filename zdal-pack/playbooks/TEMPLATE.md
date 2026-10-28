# Playbook: <site or app name>

Copy this file to `playbooks\<site>.md` after a task works, and keep it current. It's the agent's
memory of how this site works, so the next run follows the same steps instead of re-learning it.
**Never put a password, card number, code or key in a playbook.**

| | |
|---|---|
| Site | https://… |
| Signed in as | which account (no password) |
| Last worked | YYYY-MM-DD |
| Needs Carolyn for | e.g. login, the code texted to her phone, final "Place order" |

## Task: <what it does, e.g. "reorder 100lb gloss cover stock">

1. Go to … (`browser_navigate`)
2. Snapshot. Click **…** (button text, so the ref can be found again)
3. Fill: field "…" = … (where the value comes from: Carolyn, the order, the price list)
4. **Check:** the page shows … (what proves the step worked)
5. **Stop for Carolyn's OK** before … (submit / pay / send)
6. **Done when:** … (the confirmation screen, the email, the number)

## Gotchas

- e.g. "The Continue button is greyed out until the delivery date is picked."
- e.g. "Session times out after 15 minutes. Snapshot again before acting."
