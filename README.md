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

Video posters require `ffmpeg` on `PATH` (or `FFMPEG_PATH`). Without it, videos
still play, but the grid falls back to video metadata.

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
