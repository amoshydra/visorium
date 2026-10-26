# @visorium/spatial

Optional spatial and VR viewer assets for Visorium.

This package is an initial **experimental** spatial viewer. It is published
separately from the core gallery so flat users do not install the 3D runtime.
It contains an initial lazy-loaded viewer for:

- a 3D gallery wall with lazy image/video thumbnails and 3D/splat cards
- a flat lightbox viewer for GLB/GLTF models
- a flat lightbox viewer for Gaussian splats
- a focus view for images and videos on 3D panels
- 360/180 captures detected by filename
- an `Enter VR` control when WebXR is supported

The flat lightbox exposes Orbit and Walk navigation. Orbit supports pinch/wheel
zoom, two-finger/right-drag screen-space pan, and a reset control (button,
double-click, or `R`). Switching back to Orbit preserves the current Walk view
and orbits around a point in front of the camera. Walk supports drag look,
`W/A/S/D` movement, `Q/E` height, scroll movement, and touch joystick/height
controls for architecture captures. Walk speed and look sensitivity are
adjustable from the gear button and are remembered across files.

View orientation can be rotated in 90° steps; orientation and navigation mode
are remembered per file in browser storage. The Z-up preset applies the common
`X 270°` (`-90°`) correction for captures exported in a Z-up frame. Large
splats report loading progress; failed loads show a retry. PLY files do not
contain standard viewer origin, up-axis, or navigation metadata, so orientation
is a viewer-side adjustment. Gyro look, 360 media controls, and richer XR
controls are pending.
The viewer is shipped as an experimental add-on until it has been validated on
physical headsets.

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
