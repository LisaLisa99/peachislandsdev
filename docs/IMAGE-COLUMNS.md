# Five- and six-column image/text sections

In the unpublished development theme, open Customize → Home page → Add section and select **Image and text columns – 5** or **Image and text columns – 6**. Each is a separate reusable preset; neither is inserted into your homepage automatically. Add multiple instances and move each wherever you want in the template.

Each starts with five or six Image card blocks. Add, remove, or drag blocks to reorder them (up to 12). The desktop grid keeps five or six equal-width tracks; additional blocks wrap to another row. Tablet layout defaults to three columns and mobile to one; change either through section settings.

For each block, upload/select an Image, edit the image description, heading, rich-text description, optional link and link label. The included Peach Islands images are optional starting images; an uploaded image takes precedence. Image width and text alignment may be adjusted per block. Section controls include desktop/tablet/mobile image heights, fill/contain, column and row gaps, heading/body sizes, typography, alignment, top/bottom spacing, and background/text colors.

Shopify limits a section's internal sidebar name to 25 characters, so the sidebar uses **Image & text columns – 5/6**. Add section displays the full requested names via the presets.

Implementation is additive: two new section files share `assets/peach-wide-columns.css`. Its selectors are scoped to `.peach-wide-columns`; the existing section, global stylesheet, homepage JSON, and editor-saved content are unchanged.

Validation: Shopify Theme Check plus local Liquid/browser fixtures exercising the two preset counts, equal desktop tracks, tablet/mobile grids, image upload precedence, links, independent styling, image heights, and add/remove/reorder behavior. Run the optional browser check with LiquidJS and Playwright on NODE_PATH:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/wide-columns.cjs
```

After GitHub synchronization, confirm no failed files in Shopify View logs, then check both Add section entries. Hosted editor behavior still requires that store-side check. Nothing is published by this change.
