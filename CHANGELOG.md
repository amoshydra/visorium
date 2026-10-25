# Changelog

## [1.1.1](https://github.com/amoshydra/visorium/compare/v1.1.0...v1.1.1) (2026-10-25)


### Bug Fixes

* throttle watcher activity logging ([92db31b](https://github.com/amoshydra/visorium/commit/92db31bbe0895dd671282a9a4d817c8ee6fcf0b9))

## [1.1.0](https://github.com/amoshydra/visorium/compare/v1.0.0...v1.1.0) (2026-10-25)


### Features

* add a spatial gallery wall and focus view ([81e2dcb](https://github.com/amoshydra/visorium/commit/81e2dcb0f2a3df0e98e05b69e294dfa2c2178d45))
* add lazy spatial viewer and vr command ([c1b4115](https://github.com/amoshydra/visorium/commit/c1b4115fe55e5b538d85fd7b94e44cae9ab45669))
* guide users to install spatial support ([6471b33](https://github.com/amoshydra/visorium/commit/6471b3394a2ef7562f765cfdee327211156a8c4b))


### Bug Fixes

* clear stale assets before the core build ([3511f04](https://github.com/amoshydra/visorium/commit/3511f04fc70ba2f22d5f0d2f2f9d71c66ea6485b))


### Performance Improvements

* cut production dependencies for a faster install ([1553db6](https://github.com/amoshydra/visorium/commit/1553db6090c6bc931913205f2648bb22217def8d))

## 1.0.0 (2026-10-25)


### Features

* add a compact mobile toolbar and filter sheet ([b7b7b01](https://github.com/amoshydra/visorium/commit/b7b7b0191c954fe726930fd444e0599c884d4b34))
* add basic search and sort via query param ([5773b41](https://github.com/amoshydra/visorium/commit/5773b41179013ddd1a9418ba9207ceec29f226fa))
* add lightbox, click to open larger view, handle non image / video files ([3ad46ad](https://github.com/amoshydra/visorium/commit/3ad46ad075e4bb2aa8a5c2a2187530a96d9401c3))
* add searchable gallery navigation and a single lightbox ([7e3a204](https://github.com/amoshydra/visorium/commit/7e3a204a1b09865341bd38ab6529450bdd26e6ea))
* add token authentication for network access ([976048c](https://github.com/amoshydra/visorium/commit/976048cfdd2c4fffd09b8a39ab789e3241de6be9))
* cache metadata and generate video posters ([539fd2c](https://github.com/amoshydra/visorium/commit/539fd2c88682b410418da617c2699132c6c8ae22))
* create client server ([cd92985](https://github.com/amoshydra/visorium/commit/cd929857960854406de7e77567a1f2811cb3dd73))
* distinguish loading, empty, and error gallery states ([39fd7b4](https://github.com/amoshydra/visorium/commit/39fd7b4c034abe3da886cee20a347ab10ee56f40))
* finish mobile touch polish ([6c96bd3](https://github.com/amoshydra/visorium/commit/6c96bd329c352741f0810ea6239ce730ea0639e7))
* implement a gallery server ([707783d](https://github.com/amoshydra/visorium/commit/707783d0bb5751e3a62223c997ea4bbaf9d42706))
* introduce simple error boundary for recovery during error case ([b3ea35c](https://github.com/amoshydra/visorium/commit/b3ea35c571e3f85c68d9e38ad66293867b7f79f2))
* make ffprobe optional ([97ab2a9](https://github.com/amoshydra/visorium/commit/97ab2a9710a37bb055f0969d6c2c97d056779a62))
* make hidden and ignored paths configurable ([3802215](https://github.com/amoshydra/visorium/commit/38022159be6849276fbd7b01809405e84dfc0ac8))
* make sharp optional ([0fffd76](https://github.com/amoshydra/visorium/commit/0fffd76db26b751386a527c80481ce896a9b4f0a))
* make the mobile grid and previews responsive ([af355e8](https://github.com/amoshydra/visorium/commit/af355e805852a34b902ffe2448fa424e16d60c67))
* make the mobile lightbox touch-first ([f7fca5a](https://github.com/amoshydra/visorium/commit/f7fca5a02e878d0ebbed1b890bfe3323d5fff38f))
* provide a demo app for Github Page ([c3aae13](https://github.com/amoshydra/visorium/commit/c3aae135a3b833e48a8d42be8ffc69f27ec19f90))
* provide dimension info for client ([24cd366](https://github.com/amoshydra/visorium/commit/24cd366d86390f8e5324619df003522b299f37eb))
* serve cached thumbnails for gallery images ([3262818](https://github.com/amoshydra/visorium/commit/326281839bae33abe308e28af47bd4e3e742ea43))
* set mime type and cache max time, allow dot files for file served ([bc0fec1](https://github.com/amoshydra/visorium/commit/bc0fec115c2f3f608dc30e68dd17b3f44ab41b5f))
* support port and ext options ([2db7825](https://github.com/amoshydra/visorium/commit/2db7825ec60da37c390c66a108b885cf6ba0adad))
* update favicon and document.title ([cbf991c](https://github.com/amoshydra/visorium/commit/cbf991c962629e08f5e20a7eff5e6bd4d78535db))
* use pixelated image rendering when intrinsic size is smaller ([f88a194](https://github.com/amoshydra/visorium/commit/f88a1945a00a8b5f640b5d303bd7d62d19338d91))


### Bug Fixes

* add modifiedTime in query during file fetching ([dfcb1f1](https://github.com/amoshydra/visorium/commit/dfcb1f1c1f77ca5aa3d73c03058afb43e99e8b4e))
* **cli:** read version from package.json ([e5123df](https://github.com/amoshydra/visorium/commit/e5123df71a07ca900dc91ff00a0ba82b7f26fe73))
* expose vite.config.ts ([e45acad](https://github.com/amoshydra/visorium/commit/e45acadd8a25efe9ad4e1f671ad65ff1874cd2b7))
* fix delete event ([aba0be5](https://github.com/amoshydra/visorium/commit/aba0be56e9813818e30ebcf37226130a47486e91))
* fix typo prod instead of default ([1d7aec2](https://github.com/amoshydra/visorium/commit/1d7aec20b4e5511dee109dae3e442086b9cf34e7))
* harden file serving and default to localhost ([48b5654](https://github.com/amoshydra/visorium/commit/48b565499f68541b2db7087e809defa1f7b7c3c2))
* keep the gallery toolbar inside mobile viewports ([18b2c69](https://github.com/amoshydra/visorium/commit/18b2c699d3a30713d0bcf4f04765026f07598f30))
* minimise server hung up during initial sync, sort content base on add order ([24cc97e](https://github.com/amoshydra/visorium/commit/24cc97e1bd67bd60fefcca40d71496904e03acf9))
* move vite as dependency ([9334a19](https://github.com/amoshydra/visorium/commit/9334a19755131a3d1176882de4f1b57155f11148))
* reset masonry when the gallery view changes ([ed527dd](https://github.com/amoshydra/visorium/commit/ed527dd65017a2dada2ef579f97c0314ef7a8a97))
* serve thumbnails from dot-directory caches ([e5a68f3](https://github.com/amoshydra/visorium/commit/e5a68f384c179b9d54f3f07a91151b67c91773a3))
* setup development and production viteexpress config ([63b7522](https://github.com/amoshydra/visorium/commit/63b752299d21d61e20ae6c1bab1e7fe356dc83d7))
* show full URL when server is ready ([6c198de](https://github.com/amoshydra/visorium/commit/6c198de67b83f42c87ad52a4c1dad19e8613a443))
* switch to rolldown to avoid top level await issue ([d0d9281](https://github.com/amoshydra/visorium/commit/d0d92810eb2bdf3935ed4156dddf48eea2169f23))
* track mouse events on component level, more stable mouse behaviour ([722c3d6](https://github.com/amoshydra/visorium/commit/722c3d66aa22917d4eaed995d85a9258e9d5d2cf))
* use correct payload add and change event ([ffaed3e](https://github.com/amoshydra/visorium/commit/ffaed3e7e066ace09f8b94ec5b721e17863fa326))
* use production mode if no NODE_ENV is specified ([19bfce2](https://github.com/amoshydra/visorium/commit/19bfce2d7d9ab8308f8807f708bcb7d85b90ace3))


### Performance Improvements

* stream the file index and batch watcher updates ([b2514a1](https://github.com/amoshydra/visorium/commit/b2514a1ee5bf0a704a805d8b940f39f5a7ef51b4))
