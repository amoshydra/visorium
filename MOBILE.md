# Mobile UX roadmap

Goal: make the gallery comfortable to use on a phone without changing the
desktop experience.

## Phase 1 — Mobile shell

- [x] Compact sticky bar: search, Filters button, count
- [x] Bottom-sheet filters for type, sort/order, folder, density
- [x] Touch-friendly folder drill-down with breadcrumb and counts
- [x] Desktop toolbar unchanged behind a media query
- [x] Tests for immediate child-folder calculation

## Phase 2 — Mobile grid

- [x] Responsive column count: 2 columns by default, 1/3 via density
- [x] Hide filename captions on phones; details remain in the lightbox
- [x] Video play badge on poster tiles
- [x] 16px mobile search input to prevent iOS focus zoom
- [x] `srcSet` thumbnails sized for the rendered column width
- [x] Smaller lightbox preview on phones

## Phase 3 — Mobile lightbox

- [x] Swipe left/right to navigate and swipe down to close
- [x] 44px close/navigation targets
- [x] Basename in the header, full path available as a title
- [x] Dynamic viewport height and safe-area insets
- [x] Reduced stage padding on phones

## Phase 4 — Mobile polish and verification

- [x] Safe areas for toolbar, sheet, lightbox, and grid bottom
- [x] Active-state feedback and touch target audit
- [x] Jump-to-top control on mobile
- [x] Share action where `navigator.share` is available
- [x] Verify 320 px, 390 px, landscape, and desktop
- [x] `pnpm test`, `pnpm test:typecheck`, `pnpm build`, `pnpm lint`
