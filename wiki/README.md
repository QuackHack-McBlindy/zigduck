# zigduck wiki

The zigduck documentation site, built with [Astro Starlight](https://starlight.astro.build/).

```sh
npm install
npm run dev     # http://localhost:4321/zigduck/
npm run build   # static site in dist/
```

## Layout

- `src/content/docs/` holds the guide pages, one Markdown file per page.
- `src/content/docs/reference/options/` is generated and gitignored. `scripts/gen-options.mjs` builds
  it from `../hooks/options.json` and `../hooks/service.json` before every `dev` and `build`.
- `site.config.mjs` sets the GitHub repository, Pages URL and base path in one place.

## Deploying

`.github/workflows/wiki.yml` builds the site and publishes it to GitHub Pages on every push to
`main` that touches `wiki/` or the option JSON. In the repository settings, set Pages to deploy
from GitHub Actions.
