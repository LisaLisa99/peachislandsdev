# Product showcase and optional image-card prices

## Add a reusable product display

After GitHub sync, open the unpublished development theme → Customize → Add section → **Product showcase**. It is not inserted into your homepage automatically. Add as many independent instances as you need.

Choose 3, 4, 5, or 6 desktop columns. Tablet and mobile column counts, image proportions (square/portrait/landscape), image fit, row/column gaps, alignment, spacing, background, and text color are independently editable per instance. All product image frames share the chosen proportion.

### Individual products

Choose **Individual product blocks**. Add a Product block, select a real Shopify product, and optionally select/upload an alternate image. Drag blocks to rearrange products. Unselected blocks show a setup hint only in the theme editor and output no fake product on the storefront. Up to 24 product blocks are supported.

### Collection

Choose **Collection** and select the collection and product limit. The section uses the collection's actual product order. To control order independently without changing shared collection data, use Individual product blocks instead.

For a collection product's alternate image, add a Product block, choose that same product, and select an Alternate image. The first matching block with an image overrides only that card's image. It does not change the product's stored media, title, price, URL, or collection membership.

### Heading and optional Shop All

Edit or clear the section heading. Enable **Show Shop All link** and edit its label and destination. Without a custom destination, it uses the selected collection's URL or Shopify's all-products collection.

### Product information

Names, prices, review ratings, and badges each have a section-level visibility control. Names, URLs, availability, and prices always come from the selected Shopify product. Varying prices use Shopify's minimum product price with a “From” label. Price comparison and Sale badges are shown conservatively for non-varying prices with a higher minimum compare-at price. Sold out comes from real availability. No “New” or other invented product claims are inserted.

Ratings are off by default. When enabled, a rating is shown only if the standard `reviews.rating` rating metafield contains a positive value within its scale and `reviews.rating_count` contains a positive review count. The display shows the actual rating, scale, and count. No review data is generated. If your review app uses different metafields, ratings remain hidden until its data is mapped to those standard definitions. App installation or review-data migration is not part of this change.

Alternate images change presentation only; product links still open the real selected Shopify product.

## Existing Image and text columns sections

All three variants retain their existing controls and saved content. New **Show prices** controls default off, so existing appearance is unchanged.

For each card:

- **Optional price text** is blank by default and displays only text you deliberately enter when Show prices is enabled. It is static merchant-maintained content, not an automatically converted or updated price.
- **Product for automatic price** uses a selected product's actual current Shopify price instead of the text. This is the recommended choice for purchasable products and automatically follows Shopify's money formatting and price changes.
- If neither is supplied, no price is rendered. The existing card link, image, heading, description, layout and included-image choices remain independent and unchanged.

## Validation and deployment

Theme Check passed with no offenses. Local Liquid/Chromium fixture checks exercise desktop 3/4/5/6 columns, tablet/mobile grids, consistent image ratios, native product prices and links, review gating, real-status badges, visibility toggles, block ordering, collection limits, matching alternate images, empty selection behavior, and manual/automatic/hidden image-card prices. Existing five-/six-column browser regressions also passed. No store data or transactions were used or changed.

Optional local checks with LiquidJS and Playwright available on NODE_PATH:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/product-showcase.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/wide-columns.cjs
```

Changes sync through `peach-islands-html-conversion`. Check Shopify View logs for acceptance before testing actual product selections, review integration, currency rendering, and editor save/reload behavior in the unpublished preview. Nothing has been published or changed in Horizon.
