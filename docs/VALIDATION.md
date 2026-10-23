# Validation

## Completed locally

- Shopify CLI 4.9.4 Theme Check: 56 files inspected, no offenses.
- Five structural tests: Shopify editor ranges/defaults, JSON-template/block/settings references, all 55 original image checksums, reusable homepage presets, and removal of Nicepage runtime/static commerce controls.
- Fourteen Playwright checks, including six page fixtures at 1440, 1024, 768, and 390 px: no horizontal overflow, duplicate IDs, broken images, or browser JavaScript errors; gallery controls/wrapping; variant price/compare-price/media selection; server-selected initial media; sold-out states; quantity min/step/max; independent duplicated products and home sections; mobile menu/Escape; native product/cart POST serialization.
- JavaScript syntax check and Git whitespace check.
- Shopify CLI theme packaging succeeded; ZIP integrity and included paths were checked. The package contains only theme folders, including the exact original logo; docs/tests are excluded.

`original-desktop.jpg` is the rendered source HTML. `conversion-desktop.jpg` is rendered conversion Liquid using local fixtures. These are visual references, not screenshots of Shopify. Browser fallback fonts were used; Shopify's hosted font rendering must be compared in the store.

## Reproduce

From the repository root:

```sh
shopify theme check --no-input
python3 tests/validate_theme.py
node --check assets/theme.js
```

The theme itself has no npm dependency or build step. Optional local review tools live outside the checkout:

```sh
npm install --prefix /tmp/peach-review --no-audit --no-fund liquidjs@10.27.1 playwright@1.62.1
/tmp/peach-review/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/peach-review/node_modules node tests/render-preview.cjs
NODE_PATH=/tmp/peach-review/node_modules node tests/browser-review.cjs
```

If Chromium is already installed, omit the browser download and set `CHROMIUM_PATH=/usr/bin/chromium` for the browser-check command. In the prepared cloud machine, LiquidJS is installed under `/workspace/.tools/theme-review/node_modules`, and Playwright is available from the base runtime.

The renderer writes temporary fixtures under `/tmp/peach-conversion-review` and links the repository assets there. It adapts Shopify-specific forms, filters, and pagination for local rendering and supplies explicit fixture store objects. The browser script starts an internal temporary server, mocks outgoing product/cart POST requests, and checks their serialized fields. It does not call Shopify. Neither script proves Shopify server rendering or transaction behavior.

## Still required in the unpublished Shopify theme

- Theme upload/import acceptance and real hosted Liquid objects, fonts, and media rendering.
- Real collection/product mappings, menu selections, filters and sorting with catalog data.
- Theme editor add/duplicate/reorder/save/reload; section app-block behavior.
- Real cart persistence, discount calculations, checkout handoff, and stock enforcement.
- Newsletter success/error/spam-protection flow, contact mail, Markets/localization, hosted customer accounts, password and gift-card rendering.
- Visual comparison with the original site at desktop and mobile sizes using actual store data.

No store hostname or credentials were provided, so these are unrun. No Shopify theme has been uploaded or published. Existing GitHub branches and Horizon remain outside this change.
