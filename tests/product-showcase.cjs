// Fixture-only rendering and browser checks. No Shopify catalog or cart mutations.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { Liquid } = require("liquidjs");
const { chromium } = require(
  process.env.PEACH_PLAYWRIGHT_MODULE || "playwright",
);
const root = path.resolve(__dirname, ".."),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peach-showcase-"));
const engine = new Liquid({ root: root + "/snippets", extname: ".liquid" });
const locale = JSON.parse(
  fs
    .readFileSync(root + "/locales/en.default.json", "utf8")
    .replace(/^\s*\/\*[\s\S]*?\*\//, ""),
);
engine.registerFilter("t", (key, ...args) => {
  let text = key.split(".").reduce((v, k) => v[k], locale);
  for (const [name, value] of args)
    text = text.replaceAll("{{ " + name + " }}", value);
  return text;
});
engine.registerFilter("asset_url", (name) => "/assets/" + name);
engine.registerFilter(
  "stylesheet_tag",
  (url) => `<link rel="stylesheet" href="${url}">`,
);
engine.registerFilter("image_url", (v) => v.src);
engine.registerFilter(
  "image_tag",
  (src) => `<img src="${src}" width="600" height="600" alt="Fixture product">`,
);
engine.registerFilter("money", (v) => "$" + (Number(v) / 100).toFixed(2));
engine.registerFilter(
  "placeholder_svg_tag",
  (_, cls) => `<svg class="${cls}"></svg>`,
);
const defaults = (fields) =>
  Object.fromEntries(
    fields.filter((s) => s.id).map((s) => [s.id, s.default ?? null]),
  );
const products = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  title: `Fixture product ${i + 1}`,
  url: "/products/fixture-" + (i + 1),
  price: 1900 + i * 100,
  price_varies: false,
  compare_at_price_min: i === 0 ? 2900 : 0,
  available: i !== 1,
  featured_image: { src: "/assets/PeachIsland_WildBoomJournal.jpg" },
  metafields: { reviews: {} },
}));
products[0].metafields.reviews = {
  rating: { value: { rating: 4.8, scale_max: 5 } },
  rating_count: { value: 12 },
};
products[1].metafields.reviews = {
  rating: { value: { rating: 5, scale_max: 5 } },
  rating_count: { value: 0 },
};
products[2].price_varies = true;
products[2].compare_at_price_min = 4000;
const blocks = products.map((p, i) => ({
  type: "product",
  id: "p" + i,
  settings: { product: p, image: null },
  shopify_attributes: `data-block="${i}"`,
}));
async function section(
  type,
  id,
  overrides = {},
  items = blocks,
  design = false,
) {
  engine.options.globals = { request: { design_mode: design } };
  const raw = fs.readFileSync(`${root}/sections/${type}.liquid`, "utf8"),
    schema = JSON.parse(raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  for (const s of schema.settings)
    if (s.type === "range") {
      assert.ok((s.max - s.min) / s.step <= 100);
      assert.equal((s.default - s.min) % s.step, 0);
    }
  if (type === "peach-product-showcase") {
    assert.equal(schema.presets[0].name, "Product showcase");
    assert.deepEqual(
      schema.settings
        .find((s) => s.id === "columns")
        .options.map((o) => o.value),
      ["3", "4", "5", "6"],
    );
  }
  return (
    `<section id="${id}">` +
    (await engine.parseAndRender(
      raw.replace(/{% schema %}[\s\S]*?{% endschema %}/, ""),
      {
        routes: { all_products_collection_url: "/collections/all" },
        request: { design_mode: design },
        section: {
          id,
          settings: { ...defaults(schema.settings), ...overrides },
          blocks: items,
        },
      },
    )) +
    "</section>"
  );
}
let server, browser;
(async () => {
  let body = "";
  for (const n of [3, 4, 5, 6])
    body += await section("peach-product-showcase", "cols" + n, {
      columns: String(n),
      show_ratings: true,
      show_shop_all: true,
    });
  const alternate = { src: "/assets/BirthMonthFlowers.jpg" };
  body += await section(
    "peach-product-showcase",
    "reordered",
    {},
    [...blocks]
      .reverse()
      .map((b, i) =>
        i ? b : { ...b, settings: { ...b.settings, image: alternate } },
      ),
  );
  body += await section(
    "peach-product-showcase",
    "collection",
    {
      source: "collection",
      collection: { url: "/collections/test", products },
      product_limit: 3,
      show_shop_all: true,
    },
    [{ ...blocks[1], settings: { product: products[1], image: alternate } }],
  );
  body += await section("peach-product-showcase", "custom", {
    columns: "5",
    tablet_columns: "3",
    mobile_columns: "1",
    image_ratio: "4 / 5",
    alignment: "left",
    gap: 40,
    row_gap: 48,
  });
  body += await section("peach-product-showcase", "hidden", {
    show_names: false,
    show_prices: false,
    show_ratings: false,
    show_badges: false,
  });
  body += await section("peach-product-showcase", "empty", {}, [
    { type: "product", settings: {} },
  ]);
  body += await section(
    "peach-product-showcase",
    "editor",
    {},
    [{ type: "product", settings: {} }],
    true,
  );
  for (const name of [
    "peach-image-cards",
    "peach-image-columns-5",
    "peach-image-columns-6",
  ]) {
    const raw = fs.readFileSync(`${root}/sections/${name}.liquid`, "utf8"),
      schema = JSON.parse(
        raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1],
      );
    assert.equal(
      schema.settings.find((s) => s.id === "show_prices").default,
      false,
    );
    const fields = schema.blocks[0].settings,
      base = defaults(fields);
    const cards = [
      { type: "card", settings: { ...base, price: "$18.50" } },
      {
        type: "card",
        settings: { ...base, price: "DO NOT SHOW", price_product: products[0] },
      },
      { type: "card", settings: { ...base, price: "" } },
    ];
    body += await section(name, name + "-on", { show_prices: true }, cards);
    body += await section(name, name + "-off", { show_prices: false }, cards);
  }
  fs.writeFileSync(
    tmp + "/index.html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/theme.css"></head><body>${body}</body></html>`,
  );
  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost").pathname,
      file = url.startsWith("/assets/")
        ? path.join(root, url)
        : tmp + "/index.html";
    fs.readFile(file, (e, data) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".html")
            ? "text/html"
            : "image/jpeg",
      );
      res.end(data);
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
    base = "http://127.0.0.1:" + server.address().port;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 1200, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/");
    for (const n of [3, 4, 5, 6]) {
      const count = await page
        .locator(`#cols${n} .showcase-grid`)
        .evaluate(
          (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
        );
      assert.equal(count, width > 991 ? n : 2);
      const ratios = await page
        .locator(`#cols${n} .showcase-image`)
        .evaluateAll((es) =>
          es.map((e) => {
            const r = e.getBoundingClientRect();
            return r.width / r.height;
          }),
        );
      assert.ok(ratios.every((r) => Math.abs(r - 1) < 0.02));
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  assert.equal(
    await page
      .locator("#custom .showcase-grid")
      .evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
      ),
    1,
  );
  assert.equal(
    await page
      .locator("#custom .showcase-product")
      .first()
      .evaluate((e) => getComputedStyle(e).textAlign),
    "left",
  );
  const customRatio = await page
    .locator("#custom .showcase-image")
    .first()
    .evaluate(
      (e) => e.getBoundingClientRect().width / e.getBoundingClientRect().height,
    );
  assert.ok(Math.abs(customRatio - 0.8) < 0.02);
  assert.equal(await page.locator("#cols4 .showcase-product").count(), 6);
  assert.equal(await page.locator("#cols4 .showcase-rating").count(), 1);
  assert.match(
    await page.locator("#cols4 .showcase-rating").textContent(),
    /4.8 \/ 5.*12/s,
  );
  assert.equal(await page.locator("#cols4 .showcase-badges span").count(), 2);
  assert.match(
    await page.locator("#cols4 .showcase-price").first().textContent(),
    /\$19.00/,
  );
  assert.match(
    await page.locator("#cols4 .showcase-price").nth(2).textContent(),
    /From.*\$21.00/,
  );
  assert.equal(
    await page.locator("#cols4 .showcase-image").first().getAttribute("href"),
    "/products/fixture-1",
  );
  assert.equal(
    await page.locator("#reordered h3").first().textContent(),
    "Fixture product 6",
  );
  assert.equal(
    await page.locator("#reordered img").first().getAttribute("src"),
    alternate.src,
  );
  assert.equal(await page.locator("#collection .showcase-product").count(), 3);
  assert.equal(
    await page.locator("#collection img").nth(1).getAttribute("src"),
    alternate.src,
  );
  assert.equal(
    await page.locator("#collection img").nth(2).getAttribute("src"),
    products[2].featured_image.src,
  );
  assert.equal(
    await page.locator("#collection .peach-row-header a").getAttribute("href"),
    "/collections/test",
  );
  for (const cls of [
    "h3",
    ".showcase-price",
    ".showcase-rating",
    ".showcase-badges",
  ])
    assert.equal(await page.locator("#hidden " + cls).count(), 0);
  assert.equal(
    await page
      .locator("#empty .showcase-product,#empty .showcase-setup")
      .count(),
    0,
  );
  assert.equal(await page.locator("#editor .showcase-setup").count(), 1);
  for (const name of [
    "peach-image-cards",
    "peach-image-columns-5",
    "peach-image-columns-6",
  ]) {
    assert.equal(
      await page.locator("#" + name + "-on .image-card-price").count(),
      2,
    );
    assert.equal(
      (
        await page
          .locator("#" + name + "-on .image-card-price")
          .first()
          .textContent()
      ).trim(),
      "$18.50",
    );
    assert.match(
      await page
        .locator("#" + name + "-on .image-card-price")
        .nth(1)
        .textContent(),
      /\$19.00/,
    );
    assert.equal(
      await page.locator("#" + name + "-off .image-card-price").count(),
      0,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS 3/4/5/6 desktop columns; tablet/mobile and consistent ratios; native prices/links; real review gating; actual badges; visibility toggles; individual order and alternate images; collection limit/overrides; no fake empty products; all image-card price modes.",
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
