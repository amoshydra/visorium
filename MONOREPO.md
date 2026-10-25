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

`@visorium/spatial` is intentionally **private** while the spatial viewer is
being developed. It now contains the initial lazy-loaded 3D viewer for images,
videos, and GLB models; splat rendering and full XR controls are still pending.

The root release workflow still publishes only `visorium`. The release-please
manifest/linked-version configuration is staged in the repository, but the
release workflow must not switch to manifest mode until the spatial package is
functional and ready to publish.

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

The core build and spatial build are separate:

```bash
pnpm build          # core only
pnpm build:spatial  # spatial only
pnpm build:all      # both
```

## Release activation

When the spatial viewer is ready:

1. Remove `"private": true` from `packages/spatial/package.json`.
2. Configure an npm trusted publisher for `@visorium/spatial` using the same
   `npm.yml` workflow.
3. Switch `npm.yml` from simple release mode to manifest mode:

   ```yaml
   with:
     config-file: release-please-config.json
     manifest-file: .release-please-manifest.json
   ```

4. Build both packages in the release job.
5. Publish in dependency order:

   ```bash
   (cd packages/spatial && npm publish --access public)
   npm publish --access public
   ```

6. Add a package install smoke test using the packed tarballs.

The first trusted publish for `@visorium/spatial` must happen within the
publisher-validation window.

## Version policy

All published packages use lockstep versions. `release-please` uses
`linked-versions` to force the group to one version and `node-workspace` to
update internal dependency and peer ranges.

`pnpm test:versions` verifies package versions, the release-please manifest,
and the linked components before a release. Add a spatial peer range when the
package becomes publishable.
