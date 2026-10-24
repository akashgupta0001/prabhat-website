# Putting the website online (free)

You need: this GitHub repository (done), a free Cloudflare account, and your domain.
Allow about 30 minutes. Nothing here costs money.

## 1. Create the Cloudflare project

Cloudflare's current "Workers & Pages" screen creates a **Worker**. This repository is set up for that: `wrangler.jsonc` and `worker.js` already connect the database named `prabhat-db`, so you do not add the database by hand.

1. Sign up or log in at https://dash.cloudflare.com
2. **Workers & Pages** → **Create** → **Import a repository** → choose GitHub → **prabhat-website**.
3. Project name `prabhat-website`. Leave the build command empty and keep the default deploy command (`npx wrangler deploy`). Click **Deploy**.
4. Create the database once: **Storage & databases** → **D1 SQL database** → **Create database** named `prabhat-db` (already done for you). The tables and starter content are created automatically the first time anyone opens the site.

## 2. Set your admin username and password

1. Open the **prabhat-website** Worker → **Settings** → **Variables and Secrets** → **Add**.
2. Add `ADMIN_USER` with your chosen username. Type **Secret**.
3. Add `ADMIN_PASSWORD` with a long password (12 or more characters). Type **Secret**.
4. Save and deploy.

## 3. Your site address

Open **Settings** → **Domains & Routes** to see the free address `prabhat-website.<your-name>.workers.dev`.

## 4. Check it works

- Open your workers.dev address to see the website.
- Open the same address followed by `/admin` and sign in.
- In the control panel add a product, then reload the website catalogue.

## 5. Make supremlite.com open this website

This moves your domain's DNS (its address book) from GoDaddy to Cloudflare. You keep owning and renewing the domain at GoDaddy. There is no old website or email on the domain, so there is nothing to protect.

1. In Cloudflare: **Add a domain** → `supremlite.com` → **Free** plan → Continue. If it lists old GoDaddy parking records, you can delete them.
2. Cloudflare shows two **nameservers** (like `xxx.ns.cloudflare.com`). Copy both.
3. In GoDaddy: **My Products** → your domain → **DNS** → **Nameservers** → **Change nameservers** → **Enter my own nameservers** → paste both → Save.
4. Wait until Cloudflare shows the domain as **Active** (usually under an hour, up to a day).
5. In the Worker: **Settings** → **Domains & Routes** → **Add** → **Custom domain** → `supremlite.com`, then again for `www.supremlite.com`. Cloudflare adds the records and free HTTPS.
6. Open https://supremlite.com to check. The control panel is at https://supremlite.com/admin.

## Day to day

- Edit everything in `/admin`. Changes show on the website within about a minute.
- Photos: any size is fine, they are shrunk automatically.
- Homepage changes: edit the draft, check the preview, then press **Publish**.
- Forgot the password? Change `ADMIN_PASSWORD` in Cloudflare (step 3) and redeploy.
- Enquiries from the website forms appear under Customer Enquiries and Wholesale Enquiries.

## Free limits (plenty for this site)

D1 free plan: 5 GB storage and 5 million row reads a day. Workers free plan: 100,000 requests a day (website files are free and not counted). If the site ever grows past that, Cloudflare's paid plan is about $5 a month.

## Important notes

- The control panel can only be used by someone who knows the username and password. Do not share them.
- The email address and street address are not published until you add them in General Settings.
- Back up your product list now and then using **Products → Export CSV**.
