<h1 align="center">Visorium</h1>
<p align="center">An HTTP Media Gallery as an NPM executable (NPX)</p>

<p align="center">
    <a href="https://github.com/amoshydra/visorium"><img src="https://img.shields.io/badge/amoshydra-visorium-black?style=flat&logo=github" alt="Github Repository"><a>
    <a href="https://www.npmjs.com/package/visorium"><img src="https://img.shields.io/npm/v/visorium" alt="NPM Version"><a>
    <a href="https://www.npmjs.com/package/visorium?activeTab=code"><img src="https://img.shields.io/bundlephobia/minzip/visorium" alt="npm bundle size"><a>
    <a href="https://github.com/amoshydra/visorium/blob/main/LICENSE"><img src="https://img.shields.io/github/license/amoshydra/visorium" alt="GitHub License"><a>
</p>

<p align="center"><pre><code>npx visorium</code></pre></p>


[![Visorium Preview](https://raw.githubusercontent.com/amoshydra/visorium/main/README.hero.jpg)](https://github.com/user-attachments/assets/45a714e3-0ea7-428e-9f14-40e470f3f5c7)


## Usage

Nagivate to a directory containing images and videos. Then start Visorium:

```
cd ~/Pictures
npx visorium
```

open [`http://localhost:3000`](http://localhost:3000) in your browser.

## Detail

Visorium collect all images and video files and serves them in a gallery view.

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
