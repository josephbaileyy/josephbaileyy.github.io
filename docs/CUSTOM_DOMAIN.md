# Moving to a custom domain

Steps for when you buy a domain (e.g. `josephbailey.dev`). Total time: ~15
minutes plus DNS propagation.

## 1. Buy the domain

Any registrar works (Cloudflare Registrar and Porkbun sell at cost; Namecheap
and Google-successor Squarespace are fine). `.dev` domains are HTTPS-only,
which is ideal here.

## 2. DNS records at the registrar

For the apex domain (`josephbailey.dev`):

| Type  | Name | Value                   |
| ----- | ---- | ----------------------- |
| A     | @    | 185.199.108.153         |
| A     | @    | 185.199.109.153         |
| A     | @    | 185.199.110.153         |
| A     | @    | 185.199.111.153         |
| AAAA  | @    | 2606:50c0:8000::153     |
| AAAA  | @    | 2606:50c0:8001::153     |
| AAAA  | @    | 2606:50c0:8002::153     |
| AAAA  | @    | 2606:50c0:8003::153     |
| CNAME | www  | josephbaileyy.github.io |

(Verify the IPs against GitHub's current docs before entering them:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## 3. Tell GitHub Pages about it

- Repo → **Settings → Pages → Custom domain** → enter `josephbailey.dev`,
  save, wait for the DNS check, then tick **Enforce HTTPS**.
- Add the domain under **Settings → Pages** verification if prompted (a TXT
  record — GitHub shows the exact value).
- Create `public/CNAME` containing exactly one line — `josephbailey.dev` — so
  every deploy keeps the domain (the Pages artifact must include it):

  ```
  josephbailey.dev
  ```

## 4. Update hardcoded URLs in this repo

`https://josephbaileyy.github.io` is hardcoded in these places — search and
replace with the new origin:

- `index.html` (canonical, og:url, og:image, JSON-LD)
- `scripts/generate-about.mjs` (canonical, og tags, JSON-LD, footer)
- `scripts/generate-notes.mjs` (`ORIGIN` constant — feeds canonicals and sitemap.xml)
- `public/robots.txt` (sitemap URL)
- `README.md`

The old `josephbaileyy.github.io` URLs will 301-redirect to the new domain
automatically once the custom domain is active, so existing links keep working.

## 5. Third-party allowlists

- **GoatCounter**: dashboard → Settings → add the new domain (analytics are
  filtered by site code, not domain, so this is mostly for the visitor-path
  display — but do update it).
- **Cesium ion token**: the Community token is restricted to
  `https://josephbaileyy.github.io` — add/replace with the new origin in the
  Cesium ion dashboard, or detailed Earth exploration will fall back.

## 6. Afterwards

- Google Search Console: add the new domain as a property and submit
  `https://<domain>/sitemap.xml` to carry over indexing quickly.
- Update the CV PDF, GitHub profile, and LinkedIn to the new URL.
