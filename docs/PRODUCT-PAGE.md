# Product page enhancement

The existing `main-product` section, native Shopify product form, variant selector,
gallery controls, and quantity controls are reused. Product content, saved product
settings, templates, header, homepage, and image assets are unchanged.

Desktop and tablet keep vertical thumbnails left of the main image and product
information to its right. Mobile stacks the information below the gallery while
retaining left-side thumbnails. The complete description follows Add to Cart in
the information column without truncation or an accordion.

Product section settings now control breadcrumb visibility and preferred collection,
gallery width/spacing/height, thumbnail size, desktop/mobile title sizes, Add to Cart
background color, and description font/size/line height/spacing. The button inherits
the existing theme button color unless explicitly overridden.

Breadcrumbs use a valid collection from the current collection/product URL first,
then the preferred collection if the product belongs to it, then the first actual
associated collection other than all/frontpage. Products without an appropriate
collection show Home and the product title. Only one collection is shown to avoid
an ambiguous multi-collection trail. Home uses Shopify's localized root URL.

## Validation

`tests/product-page.cjs` renders the actual Liquid with Shopify-shaped fixtures,
serves the actual CSS/JavaScript and original product images, and runs Chromium.
It checks seven viewport widths (320–1440px), long and short descriptions,
breadcrumb fallbacks, thumbnails/arrows, multi-option variants, formatted prices,
variant images, quantity bounds, sold-out and single-variant products, settings,
and native form POST variant/quantity fields. Cart responses are mocked; these
checks do not claim a completed Shopify cart transaction.

Run with LiquidJS and Playwright available (or set PEACH_PLAYWRIGHT_MODULE and
CHROMIUM_PATH). Shopify Theme Check validates Liquid and section schemas.

## Unpublished Shopify preview checklist

This environment cannot reach the development storefront (the network proxy
rejects its connection), so real catalog/cart verification must happen in Shopify:

1. Confirm GitHub synchronization succeeded for peach-islands-html-conversion.
2. Open this unpublished theme's product preview. Check a product with multiple
   images and size/color/style variants, a default-only product, and a sold-out
   product. Confirm real prices, availability, variant images, and gallery arrows.
3. Change quantity, add the chosen variant to the real cart, and confirm its variant,
   quantity, price and cart count. Remove the test item afterward.
4. Check direct product URLs and collection/product URLs for correct breadcrumbs.
5. In Customize, check all Product settings on desktop, tablet, and mobile, including
   long descriptions and any video/3D media or app blocks used by the store.

No Shopify publish, upload, or Horizon modification is part of this change.
