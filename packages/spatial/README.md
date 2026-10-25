# @visorium/spatial

Optional spatial and VR viewer assets for Visorium.

This package is currently a **private scaffold**. It exports the contract that
the core package will use once the viewer is implemented. Do not publish it
until the real viewer, lazy chunks, and release/publish workflow are ready.

The published package should contain only prebuilt browser assets in `dist/`.
Three, R3F, Drei, XR, and Spark belong in `devDependencies`; they are bundled
into the viewer assets and should not become runtime npm dependencies.

Planned install command:

```bash
npx -p visorium -p @visorium/spatial visorium
```

The core package will detect this package, serve its assets through the
authenticated server, and mount the viewer only when the user opens 3D or VR.
