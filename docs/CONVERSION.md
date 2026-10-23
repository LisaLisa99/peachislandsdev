# HTML-to-Shopify conversion map

## Design source

The user-provided `peachislands.zip` is the visual reference, not the earlier starter theme. All 12 HTML pages and 12 CSS files were inspected, including the 1.4 MB shared stylesheet; both JavaScript files were reviewed for their roles. Each HTML page was rendered locally. All 55 raster assets were inspected via an image contact sheet.

The theme uses original images with original bytes and filenames. `source-assets.json` records original dimensions and SHA-256 hashes. `catalog-reference.json` records source product/gallery images and the 28 journal cards; it is reference data, not a Shopify import.

| Source | Theme destination |
| --- | --- |
| `index.html`, `Home.html` | `templates/index.json` with seven independently configured sections |
| Split hero | `peach-split-hero`, editable image-panel blocks |
| Four-category row and both three-column rows | Three independent instances of `peach-image-cards` |
| Bringing Beauty to Everyday Moments | `peach-editorial`, rich text and image blocks |
| Stay Inspired | `peach-newsletter`, native Shopify customer form |
| Blank bottom spacing | `peach-spacer` |
| `cards.html` | `collection.cards.json` |
| `desk-stationary.html` | `collection.desk-stationary.json` |
| `journals-notebooks.html` | `collection.journals-notebooks.json` |
| `planner-calendars.html` | `collection.planner-calendars.json` |
| `home-goods.html` | `collection.home-goods.json` |
| `favorites.html` | `collection.favorites.json` (curated collection, not a personal wishlist) |
| `wild-bloom.html` | `product.wild-bloom.json` |
| `wild-bloom-writing-set.html` | `product.wild-bloom-writing-set.json` |
| `GardeniaLane.html` | `product.gardenia-lane.json`, with editorial section and disabled optional extra promotion |
| Empty `lisa-monias.html` | `page.lisa-monias.json` and `collection.lisa-monias.json`, with editable editorial introduction |
| Shared header/footer | Native section groups, original logo, store menus, policies, and social URL settings |

Additional standard templates cover cart, contact, search, collections index, blog, article, 404, password, and gift card. Customer accounts use Shopify's hosted account route. This theme does not implement legacy customer-account forms or bespoke wholesale/wishlist systems.

## Visual fidelity

Original colors include cream `#faf7f2`, blush `#fceae8`, editorial pale pink `#fff7f7`, sand `#f6f3ee`, forest green `#317657`, rose accents, and gold. Typography defaults to Cormorant Garamond headings, Montserrat body/navigation, and Open Sans in the two lower image-card rows. Font pickers use Shopify's font CDN rather than depending on Nicepage or its editor.

At 1440 px, the source hero is 597 px high, the four-card images are 213 px high, editorial images 417 px, and lower image rows 294 px and 372 px. The conversion preserves those defaults and calibrates section spacing to the source. Source desktop and local-conversion screenshots are included as review references. Fonts, navigation, footer content, catalog content, and installed apps must be checked in the actual store; local screenshots use fixture store objects and browser fallback fonts.

The original CSS contains fragile negative offsets, empty space, and an invalid `NaNpx` image height at a breakpoint. The conversion uses responsive grids and scoped variables to preserve the composition while allowing sections to move and duplicate reliably. It does not carry over accidental heading/button overlap or broken breakpoint values. Mobile layouts retain the imagery and hierarchy with stacked hero panels, responsive cards, and a working menu.

## Suggested homepage collection links

Initial links are `/collections/desk-stationary`, `/collections/wrapping-paper`, `/collections/journals-notebooks`, `/collections/cards`, `/collections/lisa-monias`, `/collections/gift-wrap`, `/collections/wall-art`, `/collections/planner-calendars`, `/collections/gift-labels`, and `/collections/recipe-books`.

These are suggested destinations, not verified store handles. Use section link pickers to select existing collections if they differ. Category templates obtain real products from the current collection. Product-card subtitles use `product.metafields.custom.subtitle` when present, otherwise the product type. No placeholder products or hardcoded source prices are used for transactions.

The theme itself does not create collections, products, menus, redirects, policies, or pages. Importing the old website's catalog content is a separate store-data action. The source uses sample notebook images on several unrelated category pages; those are deliberately replaced by the matching Shopify collection's actual data.

## Keep Horizon unchanged

Use only a separate unpublished theme connected to `peach-islands-html-conversion`. Leave the currently published Horizon theme and its integration unchanged. Create separate preview menus, and avoid modifying shared products, images, template assignments, or policies just for comparison. No Shopify connection or upload was made during implementation.
