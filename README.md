# Prabhat Industries website

Website and control panel for PRABHAT INDUSTRIES (SUPREMLITE and STON), hosted free on Cloudflare (Workers with static assets and D1).

- **Public website**: `public/` (home, catalogue with filters, product pages, company pages, enquiry forms)
- **Control panel**: `public/admin/` at `/admin` (products, categories, varieties, features, homepage slider, pages, menu, brands, enquiries, settings)
- **Photo Studio**: `/admin/photostudio.html` (Catalogue Management → Photo Studio). Removes photo backgrounds with an AI model that runs in the browser, enhances and changes the background. The models live in `models/` (outside the website) and load from jsDelivr's GitHub mirror. By default it stores nothing: results are downloaded to the device. Saving to a product is an opt-in switch that replaces the main photo and deletes the old one, so storage does not grow
- **Backend**: `worker.js`, `functions/` and `lib/`, using a D1 database for all content and images
- **Sign-in**: username and password, stored as Cloudflare secrets

Everything you edit in the control panel appears on the live website within about a minute.

To put the site online, follow **[SETUP.md](SETUP.md)**.

## How it fits together

| Part | Where | Notes |
| --- | --- | --- |
| Content (products, pages, menu, settings) | D1 table `docs` | Created automatically on first visit, with starter content |
| Images | D1 table `images` | Photos are shrunk in the browser before upload |
| Login | `functions/api/login.js` | 8 wrong attempts locks that connection for 15 minutes; sessions last 12 hours |
| Public data | `functions/api/public/data.js` | Cached for 60 seconds at Cloudflare |
| Enquiry forms | `functions/api/enquiry.js` | Saved as enquiries in the control panel; spam trap and rate limit included |
