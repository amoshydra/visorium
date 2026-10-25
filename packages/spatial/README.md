# @visorium/spatial

Optional spatial and VR viewer assets for Visorium.

This package is currently **private** while the spatial viewer is being
developed. It contains an initial lazy-loaded viewer for:

- GLB/GLTF models
- images and videos on 3D panels
- 360/180 captures detected by filename
- an `Enter VR` control when WebXR is supported

Splat rendering and richer XR controls are pending.

The published package should contain only prebuilt browser assets in `dist/`.
Three, R3F, Drei, XR, and Spark belong in `devDependencies`; they are bundled
into the viewer assets and should not become runtime npm dependencies.

Planned install command:

```bash
npx -p visorium -p @visorium/spatial visorium
```

The core package detects this package, serves its assets through the
authenticated server, and mounts the viewer only when the user opens 3D or VR.
The viewer receives the existing gallery data and does not open a second
Socket.IO connection.
