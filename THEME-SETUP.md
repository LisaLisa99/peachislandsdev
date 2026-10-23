# Peach Islands theme starter

Shopify Online Store 2.0 starter. No store has been connected and no remote theme has been changed.

## Official logo
Open Online Store → Themes → Customize → Header. Upload the **original, unmodified** official logo using Official logo. Adjust Desktop logo width, Mobile logo width, and Logo vertical spacing. The logo is centered above the full desktop navigation. No image filters, cropping, or recoloring are applied. The chat attachment was not available as a filesystem asset, so no substitute logo is included. Until uploaded, the header displays the store name.

Choose the store's main menu in Header → Navigation menu. Set collection and lifestyle image in the home page sections. Colors use black, muted gold, warm cream, and sand inspired by the supplied branding.

## Local checks
Use Node >=22.12.0 and Shopify CLI 4.9.4. In this cloud environment:

```sh
export PATH=/workspace/.tools/shopify/node_modules/.bin:$PATH
cd /workspace/peachislandsdev
shopify theme check --no-input
```

## Store preview (not yet verified)
Confirm your exact myshopify.com hostname and authenticate securely with Shopify. With permission to upload a development theme, run `shopify theme dev --store YOUR-STORE.myshopify.com`. Do not target or publish a live theme. This uploads local files to a development theme. Preview rendering, product variants, cart/checkout, navigation, and uploaded logo on desktop and mobile before release. This starter has not been validated against store data and is not production-ready. Blog, search, customer accounts, and advanced merchandising templates are not implemented.
