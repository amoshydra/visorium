# @visorium/spatial

Optional spatial and VR viewer assets for Visorium.

This package is an initial **experimental** spatial viewer. It is published
separately from the core gallery so flat users do not install the 3D runtime.
It contains an initial lazy-loaded viewer for:

- a 3D gallery wall with lazy image/video thumbnails and 3D/splat cards
- a focus view for GLB/GLTF models
- images and videos on 3D panels
- 360/180 captures detected by filename
- an `Enter VR` control when WebXR is supported

Splat rendering and richer XR controls are pending. The viewer is shipped as an
experimental add-on until it has been validated on physical headsets.

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
