# CCGEP FFB Tuner

Static TypeScript port of the `FFB Player` sheet and VBA simulator from
`GTR2_CCGEP_FFB_info.xlsb`. It runs entirely in the browser: no Excel, backend,
database, or file upload required.

## Included

- Original 51-point GTR2 tire-slip curve
- Original three front-tire load pairs and load-sensitivity approximation
- CCGEP `FFB_3` steering torque calculation
- Workbook-compatible auto-gain normalization to 10,000
- Live SVG chart for low, medium, and high tire load, grip, and clipping
- Copy-ready `ccgep.ini` and suggested LeoFFB snippets
- Local browser persistence

The workbook's `MyPLRfile` and `My ccgep.ini settings` sheets are reference text,
not part of the simulator, so they are not reproduced as editors.

## Run locally

```bash
pnpm install
pnpm dev
```

## Verify and build

```bash
pnpm test
pnpm build
```

Vite writes the GitHub Pages-ready site to `dist/`.

## Deploy to GitHub Pages

1. Push the repository to GitHub with `main` as its default branch.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main` or run the **Deploy to GitHub Pages** workflow manually.

`vite.config.ts` uses relative asset URLs, so the build works at both a user site
and a repository subpath.
