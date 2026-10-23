# Validation

## Completed locally

- Shopify CLI 4.9.4 Theme Check: 59 files inspected, no offenses.
- Eight structural tests: Shopify editor ranges/defaults, JSON-template/block/settings references, all 55 original image checksums, reusable homepage presets, and removal of Nicepage runtime/static commerce controls.
- Nineteen Playwright checks, including six page fixtures at 1440, 1366, 1280, 1024, 768, and 390 px: no horizontal overflow, duplicate IDs, broken images, or browser JavaScript errors; gallery controls/wrapping; variant price/compare-price/media selection; server-selected initial media; sold-out states; quantity min/step/max; independent duplicated products and home sections; mobile menu/Escape; native product/cart POST serialization.
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

## Homepage and header correction

`templates/index.json` explicitly selects `layout/theme.liquid`. The homepage references its own section types and the 404 template remains independent. Native navigation normalizes exported `Home.html` / `index.html` home links (and Shopify frontpage links) to the locale-aware `routes.root_url`; unrelated and external links are retained. No JavaScript redirect or 404-as-homepage fallback is used.

The local header comparison uses the original HTML/CSS and the same Montserrat font bytes for both pages. Original desktop navigation uses 15px type, weight 500, 2px tracking, 15px line height, and 10px/12px link padding. The corrected header matches these values; at 1440px the first link's x coordinate and width match, with total header-height difference below 0.2px. `header-comparison.json` records measurements. Theme assets include Montserrat Latin 400/500 (Fontsource 5.3.0, SIL OFL license included) so the header does not rely on a font-picker request to render the original type. Narrow screens use the menu control when the full-width source navigation cannot fit, rather than shrinking its desktop typography.

Additional regressions cover homepage/404 template separation, localized legacy home links, real font loading, and desktop header metrics. These are local checks, not a confirmation of Shopify's editor routing. The user supplied the unpublished theme preview URL and Shopify's exact missing-required-files error. Git confirmed that layout/theme.liquid, config/settings_schema.json, and templates/index.json already exist at repository-root paths in remote commit 13bd802. The preview request was blocked by the cloud egress policy (CONNECT 403), and admin-side GitHub connection/sync details are unavailable to this environment. A wrong branch, incomplete sync, or rejected import has not been distinguished; the code does not claim a confirmed hosted fix. If it persists after branch sync, inspect the actual root preview request and Shopify's GitHub sync errors before changing template behavior further.

The 1.0.1 correction touches all three entry files in one commit so they can be resynchronized: schema release version, explicit homepage layout, and the header's font/style initialization. Source entry files are not missing or nested in a ZIP subdirectory. A fresh package can be added as a separate unpublished theme if the current GitHub connection is incomplete; never replace Horizon to test this.

## Shopify synchronization validation correction (1.0.2)

The user supplied Shopify's rejection of `heading_font` default `cormorant_garamond_n4`. It is not a valid Shopify font-picker handle. The default is now `assistant_n4`, confirmed against Shopify/Dawn's current `config/settings_schema.json` via raw.githubusercontent.com. **Use original heading typography** defaults on and selects bundled, unmodified Cormorant Garamond Latin 400/600/700 fonts (Fontsource 5.3.0, SIL OFL included). The valid alternative font picker therefore does not replace the original visual design by default. Existing Montserrat header styling is preserved.

All referenced section files exist at `sections/<type>.liquid`, and all embedded schemas parse. The three image-based homepage sections now use short image identifiers and small, relevant choice lists (2 hero images, 7 column images, 5 editorial images, plus None). Defaults, presets, and every template block were migrated together. Identifiers map back to the exact original asset filenames in `peach-image.liquid`; all 55 original asset checksums remain unchanged. These selector changes reduce the import surface; the exact section rejection cause is unconfirmed until the additional Shopify warning lines or a new sync result are available.

Local Theme Check and regression tests cannot certify acceptance by Shopify's server. Required completion evidence is a new successful GitHub synchronization with no failed files, plus an unpublished homepage preview. Admin sync logs are only available to the store owner in this session. No upload to Shopify was initiated outside the user-authorized GitHub branch sync, and nothing was published or changed in Horizon.
