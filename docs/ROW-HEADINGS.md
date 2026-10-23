# Optional section heading and SHOP ALL link

Supported sections: Image and text columns, its five- and six-column variants, and Product showcase.

After development-branch sync, open a section in Customize and find **Section heading and link**. Enable **Show section heading**, edit the heading, and choose its font size (default 36 px) and left/center/right alignment (default left). It uses the existing Peach Islands serif heading font. Card heading settings remain independent.

Enable **Show SHOP ALL link**, enter a destination using the Shopify URL picker (collection, page, or external URL), and edit the label (default SHOP ALL) and size (default 21 px). The underlined link uses the theme's sans-serif body font and shares the heading's alignment. Product showcase retains its previous fallback to the selected collection or all products when no custom link is supplied; image sections require a chosen destination.

Use **Heading to link spacing** and **Heading/link to images spacing** to adjust the vertical gaps. The heading is stacked above the link, both above the grid, inside the same content inset as its images. Either element can be enabled independently. Blank heading text, a blank link label, or an unavailable destination does not produce a dummy link or spacer.

New heading controls default off, and new image-section link controls default off. Product showcase's existing link toggle, text, and destination IDs are retained, including any explicit saved choices. Its new heading toggle defaults off. The existing heading text is retained for enabling later. No saved homepage configuration, product/card content, prices, images, links, header, or global theme settings were modified.

Local validation covers all four section types at 1440, 1024, 768, 390, and 320 px: hidden defaults and blank states; fonts, sizes and underlining; stacked layout and image-width alignment; editable spacing and text alignment; collection/page/external destinations; independent heading/link visibility; no horizontal overflow; and unchanged card HTML when the header is enabled. Product showcase and five-/six-column regression checks also pass. The test fixtures do not establish Shopify's hosted editor acceptance.

With LiquidJS/Playwright available on NODE_PATH:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/row-headings.cjs
```

Check Shopify View logs after GitHub sync, then enable the controls in the unpublished theme and confirm save/reload behavior. Do not publish or modify Horizon.
