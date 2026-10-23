// Fixture checks of the actual product Liquid/CSS/JS. Cart POSTs are mocked.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { Liquid } = require("liquidjs"),
  { chromium } = require(process.env.PEACH_PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, ".."),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peach-product-page-")),
  engine = new Liquid({ root: tmp, extname: ".liquid" });
function clean(raw) {
  return raw
    .replace(/{% schema %}[\s\S]*?{% endschema %}/g, "")
    .replace(
      /{%\s*form\s+'product'[^%]*%}/g,
      '<form class="product-form" method="post" action="/cart/add">',
    )
    .replace(/{% endform %}/g, "</form>");
}
for (const file of fs.readdirSync(root + "/snippets"))
  fs.writeFileSync(
    tmp + "/" + file,
    clean(fs.readFileSync(root + "/snippets/" + file, "utf8")),
  );
const locale = JSON.parse(
  fs
    .readFileSync(root + "/locales/en.default.json", "utf8")
    .replace(/^\s*\/\*[\s\S]*?\*\//, ""),
);
engine.registerFilter("t", (key) =>
  key.split(".").reduce((v, k) => v[k], locale),
);
engine.registerFilter("asset_url", (name) => "/assets/" + name);
engine.registerFilter(
  "stylesheet_tag",
  (url) => `<link rel="stylesheet" href="${url}">`,
);
engine.registerFilter("image_url", (image) => image.src);
engine.registerFilter(
  "image_tag",
  (src) =>
    `<img src="${src}" width="1200" height="1200" alt="Product fixture">`,
);
engine.registerFilter("money", (v) => "$" + (Number(v || 0) / 100).toFixed(2));
engine.registerFilter("payment_terms", () => "");
engine.registerFilter("default_errors", () => "");
engine.registerFilter("structured_data", () => "{}");
engine.registerFilter(
  "placeholder_svg_tag",
  (_, cls) => `<svg class="${cls}"></svg>`,
);
const raw = fs.readFileSync(root + "/sections/main-product.liquid", "utf8"),
  schema = JSON.parse(raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]),
  defaults = Object.fromEntries(
    schema.settings.filter((s) => s.id).map((s) => [s.id, s.default ?? null]),
  );
for (const field of schema.settings)
  if (field.type === "range") {
    assert.ok((field.max - field.min) / field.step <= 100);
    assert.equal((field.default - field.min) % field.step, 0);
  }
const media = [
  "WildBloomStraightView.jpg",
  "WildBoomInsidePreview.png",
  "WildBloomJournalinaCozyStillLife.png",
].map((file, i) => ({
  id: 100 + i,
  media_type: "image",
  src: "/assets/" + file,
  preview_image: { src: "/assets/" + file },
  alt: "Wild Bloom " + i,
}));
const variants = [
  {
    id: 1001,
    title: "Small / Sage / Linen",
    price: 2199,
    available: true,
    featured_media: media[0],
    quantity_rule: { min: 1, increment: 1 },
  },
  {
    id: 1002,
    title: "Large / Peach / Cotton",
    price: 3199,
    compare_at_price: 3599,
    available: true,
    featured_media: media[1],
    quantity_rule: { min: 2, increment: 2, max: 8 },
  },
  {
    id: 1003,
    title: "Small / Peach / Linen",
    price: 2499,
    available: false,
    quantity_rule: { min: 1, increment: 1 },
  },
];
const collections = [
  {
    id: 1,
    title: "Journals & Notebooks",
    handle: "journals",
    url: "/collections/journals",
  },
  {
    id: 2,
    title: "Gift Favorites",
    handle: "gifts",
    url: "/collections/gifts",
  },
];
const product = {
  title: "Wild Bloom Journal",
  media,
  featured_media: media[0],
  variants,
  selected_or_first_available_variant: variants[0],
  has_only_default_variant: false,
  description: Array.from(
    { length: 24 },
    (_, i) =>
      `<p>Original long description paragraph ${i + 1} with product details.</p>`,
  ).join(""),
  collections,
};
async function fixture(name, changes = {}, sectionSettings = {}) {
  const context = {
    product: { ...product, ...changes },
    collection: changes.context_collection,
    settings: { button_color: "#317657" },
    routes: { root_url: changes.root_url || "/" },
    form: {},
    section: {
      id: name,
      settings: { ...defaults, ...sectionSettings },
      blocks: [],
    },
  };
  engine.options.globals = context;
  const content = await engine.parseAndRender(clean(raw), context);
  fs.writeFileSync(
    tmp + "/" + name + ".html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--heading-font:Georgia,serif;--body-font:Arial,sans-serif;--page-width:1400px}</style><link rel="stylesheet" href="/assets/theme.css"><script src="/assets/theme.js" defer></script></head><body><section id="shopify-section-${name}">${content}</section></body></html>`,
  );
}
let server, browser;
(async () => {
  await fixture("normal");
  await fixture("context", { context_collection: collections[1] });
  await fixture("preferred", {}, { breadcrumb_collection: collections[1] });
  await fixture(
    "invalid",
    { context_collection: { id: 77, title: "Unrelated" } },
    { breadcrumb_collection: { id: 99, title: "Wrong" } },
  );
  await fixture("none", { collections: [] });
  await fixture("locale", { root_url: "/fr/" });
  await fixture("off", {}, { show_breadcrumbs: false });
  await fixture("selected", {
    selected_or_first_available_variant: variants[1],
  });
  await fixture("single", {
    has_only_default_variant: true,
    variants: [{ ...variants[0], title: "Default Title" }],
    media: [media[0]],
    description: "<p>Short original description.</p>",
  });
  await fixture("sold", {
    variants: [variants[2]],
    selected_or_first_available_variant: variants[2],
    has_only_default_variant: true,
  });
  await fixture(
    "custom",
    {},
    {
      thumbnail_size: 120,
      gallery_spacing: 16,
      title_size: 42,
      mobile_title_size: 30,
      description_size: 18,
      description_line_height: 180,
      description_spacing: 35,
      add_to_cart_color: "#543210",
      gallery_height: 697,
      image_column_width: 48,
      mobile_gallery_height: 420,
    },
  );
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost").pathname,
      file = u.startsWith("/assets/") ? path.join(root, u) : path.join(tmp, u);
    fs.readFile(file, (e, d) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "text/javascript",
          ".jpg": "image/jpeg",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:" + server.address().port;
  for (const width of [1440, 1200, 1024, 768, 767, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/normal.html");
    const state = await page.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect(),
        thumbs = [
          ...document.querySelectorAll(".gallery-thumbnails button"),
        ].map((e) => e.getBoundingClientRect()),
        g = box(".product-gallery"),
        info = box(".product-info"),
        description = box(".product-description"),
        form = box(".product-form");
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        thumbnailsLeft:
          box(".gallery-thumbnails").right < box(".gallery-stage").left,
        vertical: thumbs[1].top > thumbs[0].bottom,
        right: info.left > g.right - 0.5,
        below: info.top >= g.bottom,
        descriptionAfter: description.top >= form.bottom,
        descriptionInside:
          description.left >= info.left &&
          description.right <= info.right + 0.5,
        descriptionMax: getComputedStyle(
          document.querySelector(".product-description"),
        ).maxHeight,
        paragraphs: document.querySelectorAll(".product-description p").length,
      };
    });
    assert.equal(state.overflow, false);
    assert.equal(state.thumbnailsLeft, true);
    assert.equal(state.vertical, true);
    assert.equal(width >= 768 ? state.right : state.below, true);
    assert.equal(state.descriptionAfter, true);
    assert.equal(state.descriptionInside, true);
    assert.equal(state.descriptionMax, "none");
    assert.equal(state.paragraphs, 24);
    console.log(
      "PASS original gallery/description placement and no overflow at " +
        width +
        "px",
    );
  }
  for (const [file, label] of [
    ["normal", "Journals & Notebooks"],
    ["context", "Gift Favorites"],
    ["preferred", "Gift Favorites"],
    ["invalid", "Journals & Notebooks"],
  ]) {
    await page.goto(base + "/" + file + ".html");
    assert.equal(
      await page.locator(".product-breadcrumbs a").nth(1).textContent(),
      label,
    );
    assert.equal(
      await page.locator(".product-breadcrumbs a").first().getAttribute("href"),
      "/",
    );
    assert.equal(
      await page.locator(".product-breadcrumbs [aria-current]").textContent(),
      product.title,
    );
  }
  await page.goto(base + "/none.html");
  assert.equal(await page.locator(".product-breadcrumbs a").count(), 1);
  await page.goto(base + "/off.html");
  assert.equal(await page.locator(".product-breadcrumbs").count(), 0);
  await page.goto(base + "/locale.html");
  assert.equal(
    await page.locator(".product-breadcrumbs a").first().getAttribute("href"),
    "/fr/",
  );
  await page.goto(base + "/normal.html");
  await page.locator("[data-media-target]").nth(2).click();
  assert.equal(
    await page.locator("[data-media-panel]:visible").getAttribute("id"),
    "normal-102",
  );
  await page.locator('[data-gallery-step="1"]').click();
  assert.equal(
    await page.locator("[data-media-panel]:visible").getAttribute("id"),
    "normal-100",
  );
  await page.locator('[data-gallery-step="-1"]').click();
  assert.equal(
    await page.locator("[data-media-panel]:visible").getAttribute("id"),
    "normal-102",
  );
  await page.selectOption("[data-variant-select]", "1002");
  assert.equal(
    await page.locator("[data-product-price]").textContent(),
    "$31.99",
  );
  assert.equal(
    await page.locator("[data-compare-price]").textContent(),
    "$35.99",
  );
  assert.equal(
    await page.locator("[data-media-panel]:visible").getAttribute("id"),
    "normal-101",
  );
  assert.equal(await page.locator('input[name="quantity"]').inputValue(), "2");
  await page.locator('[data-quantity="-1"]').click();
  assert.equal(await page.locator('input[name="quantity"]').inputValue(), "2");
  for (let i = 0; i < 6; i++) await page.locator('[data-quantity="1"]').click();
  assert.equal(await page.locator('input[name="quantity"]').inputValue(), "8");
  assert.ok(new URL(page.url()).searchParams.get("variant") === "1002");
  await page.selectOption("[data-variant-select]", "1003");
  assert.equal(await page.locator("[data-add-to-cart]").isDisabled(), true);
  await page.selectOption("[data-variant-select]", "1001");
  assert.equal(await page.locator("[data-add-to-cart]").isDisabled(), false);
  assert.equal(await page.locator("[data-compare-price]").isVisible(), false);
  let posted;
  await page.route("**/cart/add", (route) => {
    posted = new URLSearchParams(route.request().postData());
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "Mock cart response",
    });
  });
  await page.locator('input[name="quantity"]').fill("3");
  await page.locator("[data-add-to-cart]").click();
  await page.waitForURL("**/cart/add");
  assert.equal(posted.get("id"), "1001");
  assert.equal(posted.get("quantity"), "3");
  await page.goto(base + "/single.html");
  assert.equal(await page.locator("[data-gallery-step]").count(), 0);
  assert.equal(
    await page.locator("[data-variant-select]").getAttribute("class"),
    "visually-hidden",
  );
  assert.equal(await page.locator(".product-description p").count(), 1);
  assert.equal(await page.locator("[data-add-to-cart]").isDisabled(), false);
  await page.goto(base + "/sold.html");
  assert.equal(await page.locator("[data-add-to-cart]").isDisabled(), true);
  await page.goto(base + "/selected.html");
  assert.equal(
    await page.locator("[data-media-panel]:visible").getAttribute("id"),
    "selected-101",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + "/custom.html");
  assert.equal(
    await page.locator("h1").evaluate((e) => getComputedStyle(e).fontSize),
    "42px",
  );
  assert.equal(
    await page
      .locator(".gallery-thumbnails")
      .evaluate((e) => getComputedStyle(e).width),
    "120px",
  );
  assert.equal(
    await page
      .locator(".product-gallery")
      .evaluate((e) => getComputedStyle(e).gap),
    "16px",
  );
  assert.equal(
    await page
      .locator(".product-description")
      .evaluate((e) => getComputedStyle(e).fontSize),
    "18px",
  );
  assert.equal(
    await page
      .locator(".product-form")
      .evaluate((e) => getComputedStyle(e).marginBottom),
    "35px",
  );
  assert.equal(
    await page
      .locator(".add-to-cart")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(84, 50, 16)",
  );
  await page.setViewportSize({ width: 390, height: 900 });
  assert.equal(
    await page.locator("h1").evaluate((e) => getComputedStyle(e).fontSize),
    "30px",
  );
  assert.equal(
    await page
      .locator(".gallery-item img")
      .first()
      .evaluate((e) => getComputedStyle(e).height),
    "420px",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS breadcrumb context/preference/fallback/none/off/localization; thumbnails and wrapping arrows; multi-option variants/prices/media; quantity limits; sold-out/single-variant states; native cart POST fields; custom sizing/colors/spacing; no browser JS errors.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
