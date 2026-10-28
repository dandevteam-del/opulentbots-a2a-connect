# Walkthrough: set up Carolyn's CRM and QuickBooks connection

**For Carolyn's assistant.** Use this page to guide Carolyn through the setup in plain, simple words.
It covers the same steps as [QUICKBOOKS-CRM-SETUP.md](QUICKBOOKS-CRM-SETUP.md), written so anyone can
follow them. Read the **"Say"** parts to her almost word for word.

## How to coach Carolyn (read this first, assistant)

- **One step at a time.** Give her one step, then wait until she says "done" before the next one.
- **Short sentences.** No tech words. If you have to use one, explain it right away.
- **Tell her what she should see** after each step, so she knows it worked.
- **If the screen looks different** from this page, ask her for a screenshot, or run
  `zdal-pack\screenshot.ps1 -Primary` and look. Then guide her from what you actually see. Don't guess.
- **Passwords and codes are hers.** Never ask her to tell you a password or a code. She types them
  into the website herself.
- **Do the clicking for her** in your own browser window (the ZDAL pack) when you can. When a page
  needs her password or a code, hand it to her.
- **Celebrate small wins.** "That worked. Nice." It keeps it easy.
- **Breaks are fine.** Each part can be done on a different day. Note where you stopped.
- **Report on the hub** at the end of each part, on task `35751c95-5ff9-4cb7-be75-8ffb97b333e0`,
  with the "Tell OpulentBots" line.

---

## Part 0: Start (about 2 minutes)

**Say:**
> "We're going to connect your QuickBooks to your new customer system, called the CRM. When we're
> done, all your past customers, quotes, invoices and payments will be in one place. You'll be able
> to look anyone up and follow up with them. Customers will also be able to pay invoices online.
>
> It's 5 short parts. You'll type your own passwords. I'll never ask you for them. Ready?"

**Before Part 1, check her PC has the programs** (assistant): run
`zdal-pack\install.ps1`. It adds Node.js, Git and Python if they're missing.
> **Say:** "I'm installing a few free programs your assistant needs. If Windows asks 'Do you want to
> allow this app to make changes?', click **Yes**."

**What she needs nearby:**
- her **QuickBooks login** (email and password)
- her **phone**, for security codes
- about **30 minutes** in total. It can be split up.

---

## Part 1: Make the CRM's filing cabinet (about 10 minutes)

**What this is, if she asks:** "Supabase is the online filing cabinet where your CRM keeps its
information. It's yours, and it's free."

**Step 1.1.** Open https://supabase.com/dashboard/sign-up
> **Say:** "Sign up with your work email, cwalker@greatimpress.com, and make up a new password. Write
> the password down somewhere safe. Don't tell it to me."

✅ She should see: "Check your email to confirm."

**Step 1.2.**
> **Say:** "Open your email, find the one from Supabase, and click the confirm link."

✅ She should see the Supabase dashboard.

**Step 1.3.** Make the organization (the folder everything goes in).
> **Say:** "Where it asks for an organization name, type **Great Impressions**. Pick **Company** and
> the **Free** plan. Then click **Create organization**."

**Step 1.4.** Make the project (the filing cabinet).
> **Say:** "Now click **New project**. For the name, type **great-impressions-crm**."
> "Next to Database Password, click **Generate a password**, then click **Copy** and paste it into
> your notes. You'll probably never need it, but keep it safe."
> "For Region, pick **East US (North Virginia)**. Then click **Create new project**."

✅ She should see the project starting up. That takes about 2 minutes. **Say:** "Perfect. It's
building. Let's do the next step while it works."

**Step 1.5.** Let OpulentBots in to build it.
> **Say:** "Click your organization's name at the top, then **Settings**, then **Team**. Click
> **Invite**, type **dandevteam@gmail.com**, pick **Administrator**, and click **Send invite**.
> That lets OpulentBots set up the inside of your filing cabinet. You can remove them any time."

✅ She should see dandevteam@gmail.com listed as "Invited".

**Step 1.6.** Get the project's ID (it's not a secret).
> **Say:** "Click your project, then **Project Settings** (the gear), then **General**. Copy the
> **Reference ID**. It's about 20 letters. You can paste that one to me. It's safe."

**Tell OpulentBots** (on the hub task):
`Phase 1 done. Supabase project ref: <the Reference ID>. Invite sent to dandevteam@gmail.com.`

> **Say:** "Part 1 is done. OpulentBots will now build the inside. When they're done, you'll get an
> email to sign in to your CRM. Let's do Part 2 while we wait."

---

## Part 2: Make your QuickBooks connection app (about 10 minutes)

**What this is, if she asks:** "Intuit makes QuickBooks. To let your CRM read your QuickBooks, you
make a small 'connection app' in your Intuit account. It's free, it's yours, and you can turn it off
any time."

**Step 2.1.** Open https://developer.intuit.com and click **Sign in**.
> **Say:** "Sign in with the **same email and password you use for QuickBooks**. If it texts you a
> code, type the code in yourself."

✅ If it asks her to agree to developer terms: **Say:** "This makes your free developer account.
Click agree." Then she should see a **Dashboard**.

**Step 2.2.**
> **Say:** "Click **Create an app**. Pick **QuickBooks Online and Payments**."

**Step 2.3.**
> **Say:** "For the app name, type **Great Impressions CRM**."
> "When it asks what the app can do, tick **Accounting** only. Then click **Create app**."

✅ She should see her new app's page.

**Step 2.4.** Tell the app where to come back to. This address has to be exactly right, so it's
best if you (the assistant) type or paste it for her.
> **Say:** "On the left, under **Development settings**, click **Keys and credentials**. Scroll to
> **Redirect URIs** and click **Add URI**. I'll paste the address in for you."

Paste exactly: `https://great-impressions-crm.vercel.app/api/qbo/callback`
(no space at the start or end, and no slash at the end)
> **Say:** "Now click **Save**."

✅ The address shows in the list.

> **Say:** "Leave this page open. Don't copy anything yet. We'll use it in Part 3."

**Tell OpulentBots:**
`Phase 2 done. Intuit app "Great Impressions CRM" created, development redirect URI saved.`

---

## Part 3: Practice with Intuit's sample company (about 5 minutes)

**Wait** until OpulentBots replies on the hub that her CRM login is ready. She'll also get an email
with a sign-in link.

**What this is, if she asks:** "Before we touch your real QuickBooks, we practise with a pretend
company Intuit gives you. Nothing real changes."

**Step 3.1.**
> **Say:** "Open your email and click the sign-in link for the Great Impressions CRM." (Or go to
> https://great-impressions-crm.vercel.app, type your email, and click **Email me a sign-in link**.)

✅ She should see the CRM dashboard.

**Step 3.2.**
> **Say:** "On the left, click **Integrations**. You'll see a box that says **QuickBooks app keys**.
> Set Environment to **Sandbox**."

**Step 3.3.** She copies the two keys herself. This is the only tricky part, so go slowly.
> **Say:** "Go back to the Intuit tab. Under **Development settings → Keys and credentials** you'll
> see a **Client ID** and a **Client Secret**. They're like a username and password for the app, so
> you copy them yourself and you don't send them to me or anyone."
> "Click the copy button next to **Client ID**, go to the CRM tab, and paste it in the **Client ID**
> box."
> "Do the same with **Client Secret**. You may need to click 'show' first. Paste it in the **Client
> Secret** box."
> "Click **Save keys**."

✅ She should see "App keys saved … ready to connect."
If it says a key "doesn't look right": **Say:** "No problem. That happens. Copy it again with the
copy button and paste it again."

**Step 3.4.**
> **Say:** "Click **Connect QuickBooks**. Intuit will ask which company. Pick the **sandbox
> company**, the pretend one. Then click **Connect**."

✅ She should see "QuickBooks connected" with a check mark.

**Step 3.5.**
> **Say:** "Click **Back to the CRM**, then **Sync now**. It copies the pretend company's
> information into your CRM. Then look at Contacts and Invoices. You'll see the pretend customers."

**Tell OpulentBots:** `Phase 3 done. Sandbox connected and synced: <the numbers in the QuickBooks box>.`

> **Say:** "The practice worked. Next time we do the same thing with your real QuickBooks."

---

## Part 4: Connect her real QuickBooks (about 15 minutes)

**Wait** until OpulentBots says the practice data looks right.

**Step 4.1.** Intuit asks a few questions before it gives the "real" keys. You (the assistant) can
fill these in. Carolyn just watches and confirms.
> **Say:** "Intuit wants a few answers about the app before it lets it see your real books. I'll
> fill them in and show you before we submit."

In her Intuit app, open **Production settings** and answer with exactly these:

| Question | Answer |
|---|---|
| Host domain | `great-impressions-crm.vercel.app` |
| Launch URL | `https://great-impressions-crm.vercel.app/integrations` |
| Disconnect URL | `https://great-impressions-crm.vercel.app/disconnected` |
| End-user license agreement | `https://great-impressions-crm.vercel.app/legal/terms` |
| Privacy policy | `https://great-impressions-crm.vercel.app/legal/privacy` |
| Who uses it | Only her own company |
| Hosting | Vercel and Supabase, United States |

**If Intuit asks anything else, stop.** Ask OpulentBots on the hub task (set it to INPUT_REQUIRED).
Don't guess these answers.

> **Say:** "Before we send it, please open the Privacy and Terms links and read them. They say what
> the CRM does with your information. Tell me if anything isn't right."

**Step 4.2.** In **Production settings → Keys and credentials → Redirect URIs**, add the same
address again: `https://great-impressions-crm.vercel.app/api/qbo/callback` → **Save**.

**Step 4.3.** Same as Part 3, but real.
> **Say:** "In the CRM, on Integrations, click **Change app keys**. This time set Environment to
> **Production**. Copy the **Production** Client ID and Secret from Intuit and paste them in, just
> like before. Click **Save keys**."
> "Click **Connect QuickBooks**, and this time pick **Great Impressions**, your real company."
> "Then click **Sync now**. This copy can take a few minutes because you have years of customers."

✅ She should see her real customers in **Contacts** and **Companies**, and her invoices in
**Invoices**.

**Tell OpulentBots:** `Phase 4 done. Production connected and synced: <the numbers>.`

> **Say:** "That's the big one. All your QuickBooks customers are now in your CRM, and it checks
> QuickBooks again by itself every morning."

---

## Part 5: Online invoice payments (optional, about 5 minutes)

**Say:**
> "Last part, and it's your choice. Your customers can pay an invoice online with a card or bank
> account. The money goes through QuickBooks Payments, which is Intuit's service, with its own fees.
> Do you want that turned on?"

**If she says no:** that's fine. **Tell OpulentBots:** `Phase 5: Carolyn chose not to turn on online payments for now.`

**If she says yes:**
1. **Say:** "In QuickBooks, click the **gear** at the top right, then **Account and settings**, then
   **Payments**. If it isn't on yet, it will walk you through turning it on. That part is between
   you and Intuit."
2. **Say:** "Still in settings, under **Sales**, find **Online delivery** or **Payments**, and allow
   **cards** and **bank transfer** on invoices."
3. **Say:** "Your customers can now go to **great-impressions-crm.vercel.app/pay**, type their
   invoice number and email, and pay. You can put a 'Pay an invoice' button on your website that
   links there."

**Tell OpulentBots:** `Phase 5 done. QuickBooks Payments is on.`

---

## All done

> **Say:** "You did it! Your QuickBooks and your CRM are connected. Every morning the CRM checks
> QuickBooks for new customers, invoices and payments. If you ever want to stop it, go to
> Integrations and click **Disconnect**."

## If something goes wrong

| What she sees | What to do |
|---|---|
| A code she didn't get | Wait a minute, then click "resend". Check her phone and her email's Junk folder |
| "That Client ID doesn't look right" | Copy it again with the copy button. Don't select the text by hand |
| "Not connected" or "security check failed" | Start again with **Connect QuickBooks** in the CRM |
| No sign-in email from the CRM | Check Junk. If it's not there after 5 minutes, tell OpulentBots on the hub |
| Anything else | Take a screenshot, cover any passwords or keys, and put it on the hub task with INPUT_REQUIRED |
