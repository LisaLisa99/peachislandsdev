# Centered logo and native Shopify cart

The announcement bar remains at the top. The main row uses symmetric flexible side tracks around the original logo. The cart is on the right with a minimum 44 × 44 px clickable area; a menu button occupies the left when navigation is collapsed. The logo remains centered in the browser window, rather than centered in whatever space the tools leave over. Existing logo image/width/spacing settings are retained, with width capped to prevent overlap on small screens.

The original typography and full horizontal navigation have their own centered row below the logo. On desktop/tablet the menu is measured after fonts load and whenever its size or content changes. It collapses only when the links no longer fit the available width. Mobile (767 px and below) uses the explicit menu-left / logo-center / cart-right arrangement. This replaces the earlier 1337 px fixed navigation breakpoint. Opening the menu expands a panel below the main row. Escape closes the panel and restores focus; growing to a full menu closes the compact panel. A no-JavaScript fallback exposes the navigation links.

The existing account control and country/currency selector stay in the top bar, with their original conditional behavior. No search control was added. The cart is present even when the announcement/utility bar is disabled.

Cart integration is unchanged: `routes.cart_url` opens Shopify's real locale-aware cart page, and `cart.item_count` displays the server-rendered total quantity. Product/cart forms, checkout handoff, prices, and native cart storage are untouched. This does not add an AJAX cart or drawer; counts update with normal Shopify page renders.

Header schemas, saved settings, image assets, existing content sections, and homepage JSON are unchanged by this implementation. Shopify-saved homepage changes through commit `2d260e9` were fetched before work began. Only the header markup, a script include in the main layout, and new scoped header CSS/JS are changed in the application.

## Validation

`tests/header-layout.cjs` renders the current header with fixture Shopify objects and actual included fonts, and runs Chromium checks at 1600, 1440, 1366, 1280, 1024, 768, 767, 390, and 320 px. Scenarios include normal/short/long menus, disabled utility bar, 700 px logo setting, uploaded-logo rendering, 0/12/123 cart counts, and locale-aware cart URLs. Checks cover exact logo centering, 44 px controls, no logo/cart overlap or horizontal overflow, menu-fit decisions, open/Escape/focus behavior, resize close, and Shopify editor section reinitialization.

With optional LiquidJS/Playwright tooling available on NODE_PATH:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/header-layout.cjs
```

These are local fixtures, not a real store transaction or hosted Shopify editor session. After GitHub sync, check View logs for acceptance, open the unpublished theme preview, add a test product and change/remove quantities to confirm real cart behavior, and inspect desktop/tablet/mobile layouts. Do not publish or modify Horizon.
