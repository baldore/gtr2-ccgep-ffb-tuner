# CCGEP FFB Tuner

## Credits and provenance

This is an AI-assisted browser translation of the supplied workbook. The web
port adds no new force-feedback research; it reproduces the workbook behavior
without Excel.

- **Force model — Niels Heusinkveld** — steering-force math, tuning
  methodology, workbook model, and parameter guidance
- **GTR2 integration — The Iron Wolf** — CCGEP creator who brought the force
  model into GTR2 and extended it with gamma and steering geometry
- **Track testing — @shovas and @chriss4303** — testing and feedback credited
  with the CCGEP steering-force release
- **Community — Crew Chief and GTR2 modders** — distribution, documentation,
  troubleshooting, and years of keeping GTR2 alive

Upstream resources: [latest FFB workbook](https://thecrewchief.org/downloads/gtr2/ffb-heusinkveld-tiw.xlsb),
[CCGEP manual](https://thecrewchief.org/downloads/gtr2/GTR2_CC_EP.pdf),
[project thread](https://thecrewchief.org/showthread.php?2012-Crew-Chief-GTR2-Enhancements-Plugin-Setup-Instructions-Known-Issues-and-Changelog),
and [Niels' setup video](https://www.youtube.com/watch?v=hAptvoash58).

## About this tuner

Static TypeScript port of the `FFB Player` sheet and VBA simulator from
`ffb-heusinkveld-tiw.xlsb`. It runs entirely in the browser: no Excel, backend,
database, or file upload required.

Use it online: [baldore.github.io/gtr2-ccgep-ffb-tuner](https://baldore.github.io/gtr2-ccgep-ffb-tuner/)

## Included

- Latest 151-point GTR2 tire-slip curve
- Original three front-tire load pairs and load-sensitivity approximation
- CCGEP `FFB_4` steering-force calculation
- Gamma shaping plus caster, KPI, scrub, and steering-arm geometry
- Tire spin inertia export (documented workbook reference value; config only)
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

The included GitHub Actions workflow tests, builds, and deploys the site on every
push to `main`. It can also be run manually from the repository's **Actions** tab.

`vite.config.ts` uses relative asset URLs, so the build works at both a user site
and a repository subpath.
