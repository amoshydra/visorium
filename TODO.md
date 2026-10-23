# Performance roadmap

Goal: keep galleries with a few thousand images responsive to browse, search,
and scroll, without blowing up browser memory.

## Phase 1 — thumbnails and layout

- [x] Cached on-demand thumbnail endpoint (`/thumb`) backed by sharp
- [x] WebP thumbnails sized for the grid (640px default)
- [x] Grid uses thumbnails; lightbox still uses the original
- [x] Graceful fallback to the original when sharp is unavailable or fails
- [x] Realistic masonry height estimate to stop scroll-height collapse
- [x] Unit tests for the queue, thumbnail cache, and URL helpers

## Phase 2 — instant index and batched updates

- [x] Publish the file index before aspect-ratio probing finishes
- [x] Background probing with bounded concurrency
- [x] Batch watcher updates; send Initial per socket
- [x] Remove the 2s startup delay and the connection race
- [x] Client buffers updates and sorts/filters once per batch
- [x] Tests for batching and index merge behavior

## Phase 3 — exploration UI

- [x] Sticky toolbar: search, type filter, sort, density, folder filter
- [x] Search is plain, case-insensitive substring matching (no regex crash)
- [x] Folder chips/select with counts
- [x] URL state (`q`, `type`, `sort`, `order`, `folder`, `density`)
- [x] Single gallery-level lightbox with keyboard next/prev, position,
      metadata, and preview/original loading
- [x] Tests for selection, URL parsing, folder options, and formatting

## Phase 4 — media pipeline and cache hygiene

- [x] Persisted aspect-ratio metadata cache (mtime + size keyed)
- [x] Video poster generation via ffmpeg when available
- [x] Video tiles use posters and avoid metadata downloads until needed
- [x] Thumbnail/poster cache pruning with a configurable size budget
- [x] Repeatable benchmark for large folders
- [x] Tests for metadata cache, pruning, and poster fallback

## Verification

- [x] `pnpm test`
- [x] `pnpm test:typecheck`
- [x] `pnpm build`
- [x] Manual browser check against a folder with ~2,000 images

## Benchmark snapshot

2,001 images, production build, synthetic 800×600 fixtures:

- Ready in **234 ms** (was ~2.29 s, including the old 2 s delay)
- Initial index: **136 KB**, delivered **16 ms** after connecting
- 12 on-demand thumbnails: **8.4 KB** and **20 ms** each on average
- First screen previously loaded full-resolution images; the grid now loads
  thumbnails and the lightbox loads a 1600px preview
- Masonry scroll height is stable from the first render instead of collapsing
  from ~99k px to ~45k px after measurement
