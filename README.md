# ferrus-docs

Documentation site for [**ferrus**](https://github.com/RomanEmreis/ferrus) —
deterministic orchestration of AI agents for real software work.

Built with [Docusaurus](https://docusaurus.io/) and deployed to
[GitHub Pages](https://romanemreis.github.io/ferrus-docs/).

## Local development

```bash
npm install
npm start
```

Opens at <http://localhost:3000/ferrus-docs/>.

## Build

```bash
npm run build
npm run serve
```

`npm run build` produces static files in `build/`. The
[`deploy.yml`](./.github/workflows/deploy.yml) workflow rebuilds and
publishes the site to GitHub Pages on every push to `main`.

## Structure

```
docs/                    # content (markdown)
src/
├── components/
│   ├── FerrusLogo/      # the terminal block-character FERRUS banner
│   └── IsoGrid/         # 8-bit isometric grid background
├── css/custom.css       # black/orange theme
└── pages/index.tsx      # homepage
static/img/favicon.svg
docusaurus.config.ts
sidebars.ts
```
