# CCGEP FFB Tuner

Static TypeScript port of the `FFB Player` sheet and VBA simulator from
`GTR2_CCGEP_FFB_info.xlsb`. It runs entirely in the browser: no Excel, backend,
database, or file upload required.

Use it online: [baldore.github.io/gtr2-ccgep-ffb-tuner](https://baldore.github.io/gtr2-ccgep-ffb-tuner/)

## Included

- Original 51-point GTR2 tire-slip curve
- Original three front-tire load pairs and load-sensitivity approximation
- CCGEP `FFB_3` steering torque calculation
- Workbook-compatible auto-gain normalization to 10,000
- Live SVG chart for low, medium, and high tire load, grip, and clipping
- Copy-ready `ccgep.ini` and suggested LeoFFB snippets
- Local browser persistence

## Credits

- **Niels Heusinkveld** — CCGEP steering-force math, tuning methodology,
  workbook model, and parameter guidance
- **The Iron Wolf** — Crew Chief GTR2 Enhancements Plugin creator and GTR2
  integration
- **@shovas and @chriss4303** — testing and feedback credited with the
  steering-force release
- **Crew Chief and GTR2 modding communities** — distribution, documentation,
  troubleshooting, and long-term support

This web version is an AI-assisted TypeScript translation of the supplied
workbook. It adds no original force-feedback research and exists to make the
workbook behavior usable without Excel.

Upstream resources: [CCGEP manual](https://thecrewchief.org/downloads/gtr2/GTR2_CC_EP.pdf),
[project thread](https://thecrewchief.org/showthread.php?2012-Crew-Chief-GTR2-Enhancements-Plugin-Setup-Instructions-Known-Issues-and-Changelog),
and [Niels' setup video](https://www.youtube.com/watch?v=hAptvoash58).

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

The included GitHub Actions workflow tests, builds, and deploys the site on every
push to `main`. It can also be run manually from the repository's **Actions** tab.

`vite.config.ts` uses relative asset URLs, so the build works at both a user site
and a repository subpath.
