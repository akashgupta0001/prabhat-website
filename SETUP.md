# Putting the website online (free)

You need: this GitHub repository (done), a free Cloudflare account, and your domain.
Allow about 30 minutes. Nothing here costs money.

## 1. Create the Cloudflare project

1. Sign up or log in at https://dash.cloudflare.com
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Choose GitHub, allow access, and select the repository **prabhat-website**.
4. Build settings: Framework preset **None**, Build command **leave empty**, Build output directory **public**.
5. Click **Save and Deploy**. The first deploy shows a link like `prabhat-website.pages.dev`. The site will not fully work until steps 2 and 3 are done.

## 2. Create the database and connect it

1. In Cloudflare go to **Storage & databases** → **D1 SQL database** → **Create database**. Name it `prabhat-db`.
2. Open your Pages project → **Settings** → **Bindings** → **Add** → **D1 database**.
3. Variable name: `DB` (capital letters, exactly). Database: `prabhat-db`. Save.

The tables and starter content are created automatically the first time anyone opens the site.

## 3. Set your admin username and password

1. In the same project: **Settings** → **Variables and secrets** → **Add**.
2. Add a variable named `ADMIN_USER` with the username you want. Choose type **Secret**.
3. Add a variable named `ADMIN_PASSWORD` with a long password (12 or more characters). Type **Secret**.
4. Go to **Deployments** and **Retry deployment** on the latest one (or push any change) so the settings take effect.

## 4. Check it works

- Open `https://<your-project>.pages.dev` to see the website.
- Open `https://<your-project>.pages.dev/admin` and sign in.
- In the control panel add a product, then reload the website catalogue.

## 5. Make supremlite.com open this website

This moves your domain's DNS (its address book) from GoDaddy to Cloudflare. You keep owning and renewing the domain at GoDaddy. There is no old website or email on the domain, so there is nothing to protect.

1. In Cloudflare: **Add a domain** → `supremlite.com` → **Free** plan → Continue. If it lists old GoDaddy parking records, you can delete them.
2. Cloudflare shows two **nameservers** (like `xxx.ns.cloudflare.com`). Copy both.
3. In GoDaddy: **My Products** → your domain → **DNS** → **Nameservers** → **Change nameservers** → **Enter my own nameservers** → paste both → Save.
4. Wait until Cloudflare shows the domain as **Active** (usually under an hour, up to a day).
5. In your Pages project: **Custom domains** → **Set up a custom domain** → `supremlite.com`, then again for `www.supremlite.com`. Cloudflare adds the records and free HTTPS.
6. Open https://supremlite.com to check. The control panel is at https://supremlite.com/admin.

## Day to day

- Edit everything in `/admin`. Changes show on the website within about a minute.
- Photos: any size is fine, they are shrunk automatically.
- Homepage changes: edit the draft, check the preview, then press **Publish**.
- Forgot the password? Change `ADMIN_PASSWORD` in Cloudflare (step 3) and redeploy.
- Enquiries from the website forms appear under Customer Enquiries and Wholesale Enquiries.

## Free limits (plenty for this site)

D1 free plan: 5 GB storage and 5 million row reads a day. Pages free plan: unlimited site visits, 100,000 function calls a day. If the site ever grows past that, Cloudflare's paid plan is about $5 a month.

## Important notes

- The control panel can only be used by someone who knows the username and password. Do not share them.
- The email address and street address are not published until you add them in General Settings.
- Back up your product list now and then using **Products → Export CSV**.
