# Monorepo scaffold

Visorium keeps the core package at the repository root and keeps optional
spatial/VR support in a separate workspace package.

```text
.
├── package.json                  # visorium core CLI/server + flat gallery
├── src/
├── dist/                         # core browser bundle; no Three/Spark
├── packages/
│   └── spatial/                  # @visorium/spatial (private for now)
│       ├── src/
│       ├── vite.config.ts
│       └── dist/                 # optional spatial/VR browser assets
├── pnpm-workspace.yaml
├── release-please-config.json
└── .release-please-manifest.json
```

## Why this layout

- `npx visorium` installs only the core package.
- The core package does not include Three, R3F, XR, or Spark.
- `@visorium/spatial` is built separately and contains only prebuilt browser
  assets. It has no runtime npm dependencies.
- The planned install command for spatial users is:

  ```bash
  npx -p visorium -p @visorium/spatial visorium
  ```

- The planned `visorium vr` flow will prompt, then re-exec through npx with both
  packages. Npm owns the cache and prompt.

## Current scaffold status

`@visorium/spatial` is published as an experimental add-on. It contains the
initial lazy-loaded 3D viewer for images, videos, and GLB models; splat
rendering, richer XR controls, and headset validation are still pending.

The release workflow uses release-please manifest mode and publishes both
packages in lockstep. The spatial package is published first so core never
points at a missing matching version.

## Development

```bash
pnpm install
pnpm build:all
pnpm test
pnpm test:typecheck
pnpm --filter @visorium/spatial test:typecheck
pnpm test:versions
pnpm lint
```

To run the spatial viewer against the local private package:

```bash
VISORIUM_SPATIAL_DIR="$PWD/packages/spatial" node lib/cli/index.js vr --port 3000
```

Open `http://127.0.0.1:3000/?view=vr`. The flat gallery also exposes an
`Open 3D / VR` button when the spatial assets are available. The core gallery
passes its existing file list and active item to the viewer; the viewer does
not open a second socket.

### `visorium` vs `visorium vr`

- `visorium` starts in flat gallery mode. If spatial support is installed, the
  gallery exposes the 3D/VR button and loads the viewer on demand.
- Without spatial support, clicking a 3D model or opening `?view=vr` shows the
  install prompt; normal images and videos are unaffected.
- `visorium vr` requires spatial support and starts with `?view=vr`, so the 3D
  gallery opens automatically. If support is missing, the CLI prints the npx
  install command.
- Both modes use the same server, authentication, file index, and socket. The
  flag only changes the initial UI mode and whether spatial support is
  required.

The core build and spatial build are separate:

```bash
pnpm build          # core only
pnpm build:spatial  # spatial only
pnpm build:all      # both
```

## Release

The release workflow uses `release-please-config.json` and
`.release-please-manifest.json`. It creates one release PR for the linked
`visorium` and `visorium-spatial` components and publishes both with npm
trusted publishing.

The release job publishes the spatial package first, then the core package:

```bash
(cd packages/spatial && npm publish --access public)
npm publish --access public
```

The first trusted publish for `@visorium/spatial` must happen within the
publisher-validation window.

## Version policy

All published packages use lockstep versions. `release-please` uses
`linked-versions` to force the group to one version and `node-workspace` to
update internal dependency and peer ranges.

`pnpm test:versions` verifies package versions, the release-please manifest,
and the linked components before a release. Add a spatial peer range when the
package becomes publishable.
