# josephrbailey.com

Joseph Bailey's personal site: a list-first portfolio of research, projects and
hobbies, with an About page, Markdown notes, and an educational OmniFold demo.
Hosted on GitHub Pages at [josephrbailey.com](https://josephrbailey.com).

The site lives in [`v4/`](v4/). Its [README](v4/README.md) covers content editing,
the unfolding demo and the browser checks. Research contributions, dates, reports
and code are readable without JavaScript, and the interactive demo loads only when
its explanation is opened.

## Run it

```sh
npm install
npm run dev       # http://localhost:5177
npm run build     # production build to v4/dist
npm run preview   # http://localhost:4177
npm test          # unit tests
npm run lint
npm run test:e2e  # browser checks, with the preview server running
```

## Where things are

- `v4/content/`: copy and records (research, projects, experience, coursework)
- `v4/public/`: papers, CV, images, audio, data and fonts served as-is
- `v4/lab/`: the earlier collision-chamber game, still served at `/lab/`
- `v4/notes/` and `src/content/notes/`: Markdown notes and their generated pages
- `scripts/`: build helpers

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds
`v4/` and publishes `v4/dist` to GitHub Pages. The custom domain is configured in
the repository's Pages settings, with DNS on Cloudflare. See
[docs/CUSTOM_DOMAIN.md](docs/CUSTOM_DOMAIN.md).

Page `<link rel="canonical">`, Open Graph URLs, the JSON-LD `url`, `sitemap.xml`
and `robots.txt` all use `https://josephrbailey.com`; update them together if the
domain ever changes.

## Older versions

Earlier iterations of the site are kept in git history rather than the working
tree: the zoomable universe (`archive/universe-site`), the Event Lens monograph
(`v3-site`) and the scroll-driven worldline (`worldline-rebuild`).
