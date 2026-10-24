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

- [ ] Responsive column count: 2 columns by default, 1/3 via density
- [ ] Hide filename captions on phones; details remain in the lightbox
- [ ] Video play badge on poster tiles
- [ ] 16px mobile search input to prevent iOS focus zoom
- [ ] `srcSet` thumbnails sized for the rendered column width
- [ ] Smaller lightbox preview on phones

## Phase 3 — Mobile lightbox

- [ ] Swipe left/right to navigate and swipe down to close
- [ ] 44px close/navigation targets
- [ ] Basename in the header, full path available as a title
- [ ] Dynamic viewport height and safe-area insets
- [ ] Reduced stage padding on phones

## Phase 4 — Mobile polish and verification

- [ ] Safe areas for toolbar, sheet, lightbox, and grid bottom
- [ ] Active-state feedback and touch target audit
- [ ] Jump-to-top control on mobile
- [ ] Share action where `navigator.share` is available
- [ ] Verify 320 px, 390 px, landscape, and desktop
- [ ] `pnpm test`, `pnpm test:typecheck`, `pnpm build`, `pnpm lint`
