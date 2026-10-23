# Performance roadmap

Goal: keep galleries with a few thousand images responsive to browse, search,
and scroll, without blowing up browser memory.

## Phase 1 — thumbnails and layout

- [ ] Cached on-demand thumbnail endpoint (`/thumb`) backed by sharp
- [ ] WebP thumbnails sized for the grid (640px default)
- [ ] Grid uses thumbnails; lightbox still uses the original
- [ ] Graceful fallback to the original when sharp is unavailable or fails
- [ ] Realistic masonry height estimate to stop scroll-height collapse
- [ ] Unit tests for the queue, thumbnail cache, and URL helpers

## Phase 2 — instant index and batched updates

- [ ] Publish the file index before aspect-ratio probing finishes
- [ ] Background probing with bounded concurrency
- [ ] Batch watcher updates; send Initial per socket
- [ ] Remove the 2s startup delay and the connection race
- [ ] Client buffers updates and sorts/filters once per batch
- [ ] Tests for batching and index merge behavior

## Phase 3 — exploration UI

- [ ] Sticky toolbar: search, type filter, sort, density, folder filter
- [ ] Search is plain, case-insensitive substring matching (no regex crash)
- [ ] Folder chips/select with counts
- [ ] URL state (`q`, `type`, `sort`, `order`, `folder`, `density`)
- [ ] Single gallery-level lightbox with keyboard next/prev, position,
      metadata, and preview/original loading
- [ ] Tests for selection, URL parsing, folder options, and formatting

## Phase 4 — media pipeline and cache hygiene

- [ ] Persisted aspect-ratio metadata cache (mtime + size keyed)
- [ ] Video poster generation via ffmpeg when available
- [ ] Video tiles use posters and avoid metadata downloads until needed
- [ ] Thumbnail/poster cache pruning with a configurable size budget
- [ ] Repeatable benchmark for large folders
- [ ] Tests for metadata cache, pruning, and poster fallback

## Verification for every phase

- [ ] `pnpm test`
- [ ] `pnpm test:typecheck`
- [ ] `pnpm build`
- [ ] Manual browser check against a folder with ~2,000 images
