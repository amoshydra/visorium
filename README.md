<h1 align="center">Visorium</h1>
<p align="center">An HTTP Media Gallery as an NPM executable (NPX)</p>

<p align="center">
    <a href="https://github.com/amoshydra/visorium"><img src="https://img.shields.io/badge/amoshydra-visorium-black?style=flat&logo=github" alt="Github Repository"><a>
    <a href="https://www.npmjs.com/package/visorium"><img src="https://img.shields.io/npm/v/visorium" alt="NPM Version"><a>
    <a href="https://www.npmjs.com/package/visorium?activeTab=code"><img src="https://img.shields.io/bundlephobia/minzip/visorium" alt="npm bundle size"><a>
    <a href="https://github.com/amoshydra/visorium/blob/main/LICENSE"><img src="https://img.shields.io/github/license/amoshydra/visorium" alt="GitHub License"><a>
</p>

<p align="center"><pre><code>npx visorium</code></pre></p>


[![Visorium Preview](https://raw.githubusercontent.com/amoshydra/visorium/main/hero.jpg)](https://github.com/user-attachments/assets/45a714e3-0ea7-428e-9f14-40e470f3f5c7)


## Usage

Nagivate to a directory containing images and videos. Then start Visorium:

```
cd ~/Pictures
npx visorium
```

open [`http://localhost:3000`](http://localhost:3000) in your browser.

### 3D / VR add-on

The 3D gallery and VR viewer are an optional add-on, so normal image and video
users do not install the 3D runtime:

```bash
npx -p visorium -p @visorium/spatial visorium
```

Use the `Open 3D / VR` button in the gallery, or start directly in spatial mode:

```bash
npx -p visorium -p @visorium/spatial visorium vr
```

WebXR requires a secure context. Use `https` or `http://localhost` when testing
with a headset.

### Network access

By default Visorium binds to `127.0.0.1`, so it is only reachable from the same
machine. To use it from a phone or another device on your network:

```bash
npx visorium --host 0.0.0.0
```

Visorium generates an access token and prints login URLs in the terminal. Open
one of those URLs — or open the bare address and enter the token on the login
page. The token is stored in an `HttpOnly` cookie after login.

Use a stable token if you want a bookmarked phone URL to keep working across
restarts:

```bash
npx visorium --host 0.0.0.0 --token "a-long-random-value"
```

The token protects access, not traffic. Over plain HTTP on a trusted LAN, the
token can be observed by a network attacker. For access beyond the LAN, put
Visorium behind HTTPS (a tunnel or reverse proxy) and keep the token enabled.

### Hidden and ignored paths

Hidden paths are skipped by default. A path is hidden when any of its segments
starts with `.` — for example `.thumbnails`, `.stickers`, `.aux`, or
`.hidden.jpg`.

Scan hidden files and folders:

```bash
npx visorium --include-hidden
```

Skip additional paths or globs (the flag is repeatable and still applies with
`--include-hidden`):

```bash
npx visorium \
  --ignore "**/.thumbnails/**" \
  --ignore "**/.stickers/**"
```

`node_modules` is always skipped. `/files` only serves media that Visorium has
indexed, so hidden, ignored, and non-media files return `404` there.

## Detail

Visorium collect all images and video files and serves them in a gallery view.

For large folders, Visorium generates grid thumbnails on demand and caches them
outside the served folder. The gallery also has a search/filter bar, folder
filter, sort controls, and a preview lightbox.

### Thumbnail cache

Thumbnails and video posters are cached in the platform cache directory
(`~/.cache/visorium` on Linux). The location can be overridden with
`VISORIUM_CACHE_DIR`. The cache is pruned at startup to 2 GiB by default; set
`VISORIUM_CACHE_MAX_BYTES` to change the limit.

Video aspect ratios require `ffprobe` on `PATH` (or `FFPROBE_PATH`), and video
posters require `ffmpeg` on `PATH` (or `FFMPEG_PATH`). Without them, videos
still play, but the grid falls back to default sizing and video metadata.
Visorium intentionally does not bundle the large platform-specific ffprobe
binary.

### Gallery URL parameters

The toolbar writes its state to the URL, so filtered views can be bookmarked:

- `q` — filename search (case-insensitive, plain substring)
- `type` — `all`, `image`, or `video`
- `sort` — `discovery`, `name`, `modified`, or `size`
- `order` — `asc` or `desc`
- `folder` — a relative folder path (or `__root__` for the top level)
- `density` — `compact`, `comfortable`, or `large`

## Development

```bash
mkdir -p ~/projects/github.com/amoshydra
cd ~/projects/github.com/amoshydra
git clone git@github.com:amoshydra/visorium.git
cd visorium
pnpm i
```

navigate to a folder containing image and video files

```bash
NODE_ENV=development npx ~/projects/github.com/amoshydra/visorium
```

### Building demo app

The demo app is used as a preview in https://amoshydra.github.io/visorium.

Instead of running file server, this demo app shows a list of images and videos from pexels.

```bash
VITE_VISORIUM_MODE=demo pnpm build
pnpm preview
```
