# Custom domain

The site is served at **josephrbailey.com** (registered and managed on Cloudflare),
published from this repo with GitHub Pages and GitHub Actions.

## Setup recap

1. **DNS (Cloudflare).** Apex records pointing at GitHub Pages, plus a `www` CNAME
   to `josephbaileyy.github.io`. Verify the values against GitHub's current docs:
   https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

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

2. **GitHub.** Repo → Settings → Pages → Custom domain: `josephrbailey.com`, then
   tick Enforce HTTPS once the DNS check passes. Because the site deploys through
   Actions, no `CNAME` file is needed in the repo.

## Where the domain appears in the repo

Canonical links, `og:url`, `og:image`, and JSON-LD `url` in `v4/index.html`,
`v4/about.html`, `v4/lab/index.html`, `v4/notes/*.html`; the origin in
`v4/content/note-pages.js` (which feeds note pages and the sitemap);
`v4/content/profile.js` (footer text); `v4/public/sitemap.xml`; and
`v4/public/robots.txt`. Change them together if the domain ever changes.

## Other places to keep in sync

- Google Search Console: a property for `josephrbailey.com`, with
  `https://josephrbailey.com/sitemap.xml` submitted.
- The CV PDF, GitHub profile and LinkedIn should link to the new domain.
