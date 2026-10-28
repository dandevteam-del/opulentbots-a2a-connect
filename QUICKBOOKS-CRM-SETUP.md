# Great Impressions CRM + QuickBooks: setup we do together

**For Carolyn's assistant, working with `opulentbots/claude-code` on hub task `35751c95-5ff9-4cb7-be75-8ffb97b333e0`.**

**The goal:** all of Carolyn's QuickBooks Online customers, estimates, invoices, payments and items
flow into her own CRM. There she can look up past clients, run outreach and manage jobs. Customers
can pay invoices online, and those payments land in QuickBooks automatically.

**Everything is in Carolyn's own accounts:**

| What | Owner | Why |
|---|---|---|
| Supabase (the CRM's database) | **Carolyn** (free plan) | Her client data lives in her account. OpulentBots is invited as a member to build it, and she can remove us any time |
| Intuit developer account + app | **Carolyn** (free) | The QuickBooks connection is her app. She can switch it off any time |
| The CRM | https://great-impressions-crm.vercel.app | Hosted by OpulentBots, with sign-in required |

**How we work together:** do one phase, then reply on the hub task with the line under
**"Reply"**. I do my part and reply with what's next. Use the ZDAL pack ([zdal-pack/README.md](zdal-pack/README.md))
for the browser work. **Carolyn types every password and every 2FA code herself.** Never put a
password, key, secret or database password in the chat, a file or a hub message. Where a key is
needed, this guide says exactly where Carolyn pastes it herself.

---

## Phase 1: Supabase account and project (you + Carolyn, ~10 min)

1. Open https://supabase.com/dashboard/sign-up in your Edge window. Carolyn signs up with
   **cwalker@greatimpress.com** and her own password, then confirms the email Supabase sends her.
2. **New organization:** name `Great Impressions`, type **Company**, plan **Free**.
3. **New project:**
   - Name: `great-impressions-crm`
   - Database password: click **Generate a password**. Carolyn saves it in her password manager.
     Don't put it in the chat; nobody needs it after this.
   - Region: **East US (North Virginia)**
   - **Create new project.** It takes about 2 minutes.
4. **Invite OpulentBots:** Organization settings → **Team** → **Invite** → `dandevteam@gmail.com`,
   role **Administrator** → Send. Administrator lets us set up the tables, sign-in and keys. Carolyn
   can lower it to Developer after launch, or remove us.
5. Copy the **project reference** (Project Settings → General → "Reference ID", ~20 letters). It
   isn't a secret.

**Reply:** `Phase 1 done. Supabase project ref: <reference ID>. Invite sent to dandevteam@gmail.com.`

**Then I:** accept the invite, build the tables, turn on sign-in (invite only, with no public
sign-ups), lock every table so only signed-in Great Impressions staff can read it, connect the CRM to
her database, and send Carolyn her CRM login invite by email.

## Phase 2: Intuit developer account and app (you + Carolyn, ~10 min)

Can run while I'm on my part of Phase 1.

1. Open https://developer.intuit.com → **Sign in**. Carolyn signs in with **the same Intuit account
   she uses for QuickBooks Online**. If asked, she accepts the developer terms. That creates her
   free developer account.
2. **Dashboard → Create an app → QuickBooks Online and Payments.**
   - App name: `Great Impressions CRM`
   - Scopes: **com.intuit.quickbooks.accounting** (Accounting) only
   - Create.
3. **Development settings → Keys & credentials → Redirect URIs → Add URI:**
   `https://great-impressions-crm.vercel.app/api/qbo/callback` (exactly this, no trailing slash) → **Save**.
4. Don't copy the keys anywhere yet.

**Reply:** `Phase 2 done. Intuit app "Great Impressions CRM" created, development redirect URI saved.`

## Phase 3: Test with Intuit's sample company (Carolyn, ~5 min)

After I've replied that her CRM login works:

1. Carolyn signs in to https://great-impressions-crm.vercel.app and opens **Integrations**.
2. In a second tab, at developer.intuit.com → her app → **Development settings → Keys & credentials**,
   she copies the **Client ID** and **Client Secret** and pastes them herself into the CRM's
   **QuickBooks app keys** form, environment **Sandbox** → **Save**.
3. **Connect QuickBooks** → pick the **sandbox company** Intuit made for her → **Connect**.
4. **Sync now.**

**Reply:** `Phase 3 done. Sandbox connected and synced: <the row counts the Integrations page shows>.`

**Then I:** check the sample data landed correctly in every screen.

## Phase 4: Go live with her real QuickBooks (you + Carolyn, ~15 min)

1. developer.intuit.com → her app → **Production settings → Keys & credentials**. Intuit asks a few
   questions about the app first. Use these answers:

   | Intuit asks | Answer |
   |---|---|
   | Host domain | `great-impressions-crm.vercel.app` |
   | Launch URL | `https://great-impressions-crm.vercel.app/integrations` |
   | Disconnect URL | `https://great-impressions-crm.vercel.app/disconnected` |
   | End-user license agreement | `https://great-impressions-crm.vercel.app/legal/terms` |
   | Privacy policy | `https://great-impressions-crm.vercel.app/legal/privacy` |
   | Who uses the app | Only her own company (internal use) |
   | Where it's hosted | Vercel (United States). Data in Supabase (United States) |
   | Any other question | Stop and ask on the task. **Don't guess compliance answers** |

2. **Production settings → Redirect URIs:** add the same
   `https://great-impressions-crm.vercel.app/api/qbo/callback` → Save.
3. Carolyn pastes the **Production** Client ID and Secret into the CRM's QuickBooks app keys form,
   environment **Production** → Save → **Connect QuickBooks** → her real company → **Sync now**.

**Reply:** `Phase 4 done. Production connected and synced: <row counts>.`

## Phase 5: Online payments (Carolyn, ~5 min)

Customers pay through QuickBooks' own invoice payment page, so payments record in QuickBooks
themselves and the CRM picks them up on its next sync.

1. In QuickBooks Online: **Settings (gear) → Account and settings → Payments**. If QuickBooks
   Payments isn't on, Carolyn decides whether to turn it on. It's Intuit's merchant service with its
   own fees and terms, so it's her call.
2. **Sales → Online delivery / payments:** allow **card** and **bank transfer (ACH)** on invoices.
3. The CRM's **Pay an invoice** page (`https://great-impressions-crm.vercel.app/pay`) lets a customer
   enter their invoice number and email, then sends them to QuickBooks' payment page for that invoice.
   Carolyn can put a "Pay an invoice" button on her website pointing to it.

**Reply:** `Phase 5 done. QuickBooks Payments is on / off (Carolyn's choice).`

---

## What the CRM brings in from QuickBooks

| QuickBooks | CRM screen |
|---|---|
| Customers | Companies + Contacts (typed Customer) |
| Products & services | Products |
| Estimates | Quotes |
| Invoices (with balance and due date) | Invoices + A/R aging |
| Payments | Payments |

Re-syncing updates records in place, so nothing is duplicated. QuickBooks stays the source of truth
for money. The CRM adds what QuickBooks doesn't have: pipeline, jobs, tasks and outreach.
