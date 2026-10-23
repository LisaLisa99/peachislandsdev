# Preview separately from Horizon

## Connect this branch as a new, unpublished theme

1. Open your Shopify **development store** → **Online Store → Themes**.
2. Under the theme library, choose **Add theme → Connect from GitHub** (wording can also be **Add from GitHub**).
3. Authorize Shopify's GitHub integration for `LisaLisa99/peachislandsdev` if prompted.
4. Select branch **`peach-islands-html-conversion`**, with the theme at the repository root. Add it as a **new theme**. Do not reconnect or replace Horizon's existing integration.
5. Rename the new theme **Peach Islands HTML Conversion — Preview**. Keep Horizon as the current published theme. **Do not click Publish.**
6. Open **Customize** on the new theme, then use its **Preview** action for visual comparison. The original logo and homepage images are already included; no image upload is necessary to see the initial homepage.

GitHub connection adds/synchronizes theme code; it does not import the HTML website's products or create collections and menus. Theme-editor saves can synchronize back to the connected GitHub branch. Use this conversion branch for those changes, not `main` or `peach-islands-starter`.

## First visual comparison

The initial homepage has the original split hero, four category columns, text/two-image story, three image columns, blush newsletter, three more image columns, spacer, and cream footer. It uses Cormorant Garamond, Montserrat, and Open Sans with the source colors and original imagery.

- **Header:** original unmodified logo is the built-in default. Logo image, desktop width, mobile width, top spacing, announcement, and menu are editable.
- **Image panels/cards:** select any supplied image from **Included original image**, or choose a replacement in **Image**. Clear the image picker to return to the included image. The logo is always displayed without filters or cropping.
- **All custom home sections:** add multiple instances, reorder them, add/remove/reorder blocks, and change each instance independently. Edit images, headings, copy, button links, columns, spacing, backgrounds, and applicable image heights and typography.
- **Story:** supports one or two image columns, independent image blocks, a reversed layout, and editable text/button.
- **Newsletter:** submits to Shopify customer/newsletter handling, not Nicepage. Shopify may require spam protection or email confirmation. A real subscription is a store-side action; use an appropriate test address.
- **Footer:** choose separate preview menus for customer care, information, and wholesale. Empty menus show only matching existing pages and policies; fake placeholder links are not emitted.
- **Social links:** enter your real URLs under Theme settings → Social links. The old `/name` placeholder profiles are not used in the theme.

## Use the existing catalog without changing Horizon

Product titles, prices, variants, availability, media, descriptions, discounts, currencies, and cart contents come from Shopify. The theme does not create or modify them. See [the catalog mapping](docs/CONVERSION.md) for the source page names and intended collection links.

Create a **new preview navigation menu** and select it in this theme's Header. Do not edit a menu currently used by Horizon. Homepage cards contain initial collection URLs from the source categories; use the link pickers to select your actual collections if their handles differ.

In the theme editor's page selector, preview existing products and collections with the conversion templates. The default product template already supports the Wild Bloom/gallery layout. For Gardenia Lane, preview the `gardenia-lane` product template to see the original editorial section; the unfinished extra promotion is disabled by default.

**Product/collection content, template assignments, menus, metafields, policies, and other store records are shared across themes.** Do not change live product media/descriptions, resource template assignments, or shared navigation merely for comparison. Use the editor's template preview, or duplicate test resources if those changes are needed. Unpublished theme settings themselves remain separate from Horizon.

The theme bundles all supplied images, but a Shopify product gallery displays that product's actual Shopify media. If the existing product media differs from the ZIP, it will differ in the preview until intentionally mapped on a test product. Nothing here automatically imports or overwrites product records.

## Before considering publication

Compare desktop and mobile layouts to the original HTML. Verify real collection links, variants, price/image updates, sold-out handling, cart updates/removal, checkout handoff, localized currency/country controls, newsletter success/errors, and theme-editor add/duplicate/reorder/save behavior. Check hosted font loading and any installed app blocks. No hosted store preview, checkout, or Shopify editor session was performed during this conversion.

## Development checks

No build step is required. Use Node >=22.12.0 and Shopify CLI 4.9.4:

```sh
export PATH=/workspace/.tools/shopify/node_modules/.bin:$PATH
cd /workspace/peachislandsdev
shopify theme check --no-input
python3 tests/validate_theme.py
```

For browser fixtures and their limitations, see [validation](docs/VALIDATION.md). Do not run `theme push`, `theme dev`, or publish against the store until the desired upload is authorized; GitHub connection above is the user-controlled preview path.

## If Home page still shows 404 after sync

Confirm this unpublished theme is connected to `peach-islands-html-conversion`, then check the theme's GitHub sync status for rejected files, especially `templates/index.json` and its `peach-*` sections. Reopen **Customize** from that theme's card and choose **Home page**. The logo and legacy export home-menu links now use Shopify's locale-aware root; do not use `/Home.html` or `/index.html` as the preview path.

A 404 template has deliberately not been replaced with homepage content or given a redirect. If the root preview still fails, share the theme preview URL (including `preview_theme_id`) and any sync error text, without admin credentials or passwords. Source validation alone cannot confirm Shopify's import or editor state.

The Header setting **Use original header typography** defaults on and uses the bundled original-family Montserrat font at the source sizes and spacing. Turn it off only if you intentionally want the global Navigation font picker instead. Existing logo width and spacing controls remain editable.

## Exact error: missing `layout/theme.liquid` or `config/settings_schema.json`

Both files, and `templates/index.json`, are committed directly at the repository root on `peach-islands-html-conversion`. They were already present in the first conversion commit (`13bd802`). The 1.0.1 update changes all three entry files together. There is no enclosing `peachislands/` directory to select or extract.

Check the GitHub connection on **the unpublished theme with ID `190649237809`**. Confirm repository **LisaLisa99/peachislandsdev**, branch **peach-islands-html-conversion**, and a successful sync of the latest correction commit. A successful Git push does not itself prove that Shopify imported the files. If the connection names `main`, it points to the README-only branch and will not contain a Shopify theme. If the connection is correct, inspect its latest error/logs for file validation or authorization failures.

Once sync succeeds, reopen this unpublished theme's editor from its theme-library card and select Home page. Its root preview is `https://peach-islands-dev.myshopify.com/?preview_theme_id=190649237809`. Keep the preview parameter when opening directly. The route should render the index template, not 404.

If the current connection remains incomplete, use **Add theme → Connect from GitHub** to add this exact branch as another separate unpublished theme. Alternatively use **Add theme → Upload ZIP file** with the CLI-packaged 1.0.1 ZIP. Neither action requires publishing or replacing Horizon; a newly added theme will have a different preview theme ID. Do not upload a GitHub “Download ZIP” archive, which includes an enclosing repository directory.

The cloud environment can verify remote Git files and package contents but cannot inspect your Shopify admin integration or confirm hosted preview behavior. If sync still fails, provide its exact error text.
