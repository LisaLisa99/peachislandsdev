// Actual Liquid sections rendered with fixture products; no Shopify mutations.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { Liquid } = require("liquidjs"),
  { chromium } = require(process.env.PEACH_PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, ".."),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peach-row-header-")),
  engine = new Liquid({ root: root + "/snippets", extname: ".liquid" });
const locale = JSON.parse(
  fs
    .readFileSync(root + "/locales/en.default.json", "utf8")
    .replace(/^\s*\/\*[\s\S]*?\*\//, ""),
);
engine.registerFilter("t", (key) =>
  key.split(".").reduce((a, k) => a[k], locale),
);
engine.registerFilter("asset_url", (n) => "/assets/" + n);
engine.registerFilter(
  "stylesheet_tag",
  (u) => `<link rel="stylesheet" href="${u}">`,
);
engine.registerFilter("image_url", (i) => i.src);
engine.registerFilter(
  "image_tag",
  (s) => `<img src="${s}" alt="Original product">`,
);
engine.registerFilter("money", (v) => "$" + (Number(v) / 100).toFixed(2));
engine.registerFilter(
  "placeholder_svg_tag",
  (_, cls) => `<svg class="${cls}"></svg>`,
);
const names = [
  "peach-image-cards",
  "peach-image-columns-5",
  "peach-image-columns-6",
  "peach-product-showcase",
];
async function render(name, id, overrides = {}) {
  const raw = fs.readFileSync(root + "/sections/" + name + ".liquid", "utf8"),
    schema = JSON.parse(raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]),
    defaults = (fields) =>
      Object.fromEntries(
        fields.filter((s) => s.id).map((s) => [s.id, s.default ?? null]),
      );
  assert.equal(
    schema.settings.find((s) => s.id === "show_heading").default,
    false,
  );
  assert.equal(
    schema.settings.find((s) => s.id === "show_shop_all").default,
    false,
  );
  assert.equal(
    schema.settings.find((s) => s.id === "section_heading_size").default,
    36,
  );
  assert.equal(
    schema.settings.find((s) => s.id === "shop_all_font_size").default,
    21,
  );
  assert.equal(
    schema.settings.find((s) => s.id === "shop_all_label").default,
    "SHOP ALL",
  );
  for (const f of schema.settings)
    if (f.type === "range") {
      assert.ok((f.max - f.min) / f.step <= 100);
      assert.equal((f.default - f.min) % f.step, 0);
    }
  const product = {
    id: 1,
    title: "Original product",
    url: "/products/original",
    price: 2399,
    available: true,
    featured_image: { src: "/assets/BirthMonthFlowers.jpg" },
    metafields: { reviews: {} },
  };
  const settings = { ...defaults(schema.settings), ...overrides },
    blocks = [
      {
        id: "card",
        type: name === "peach-product-showcase" ? "product" : "card",
        settings: {
          ...defaults(schema.blocks[0].settings),
          product,
          image: product.featured_image,
          heading: "Original card",
          text: "<p>Original description</p>",
          link: "/pages/original",
          price: "$23.99",
        },
      },
    ];
  return (
    `<section id="${id}">` +
    (await engine.parseAndRender(
      raw.replace(/{% schema %}[\s\S]*?{% endschema %}/, ""),
      {
        request: { design_mode: false },
        routes: { all_products_collection_url: "/collections/all" },
        section: { id, settings, blocks },
      },
    )) +
    "</section>"
  );
}
let server, browser;
(async () => {
  let body = "";
  for (const [i, name] of names.entries()) {
    body += await render(name, "hidden" + i);
    body += await render(name, "both" + i, {
      show_heading: true,
      heading: "SIGNATURE PATTERNS",
      show_shop_all: true,
      shop_all_link: "/collections/patterns",
    });
    body += await render(name, "custom" + i, {
      show_heading: true,
      heading: "A CUSTOM HEADING",
      show_shop_all: true,
      shop_all_link: "/pages/about",
      section_heading_alignment: "right",
      section_heading_size: 42,
      shop_all_font_size: 25,
      heading_link_gap: 18,
      header_images_gap: 44,
    });
    body += await render(name, "link" + i, {
      show_shop_all: true,
      shop_all_link: "https://example.com/shop",
      section_heading_alignment: "center",
    });
    body += await render(name, "heading" + i, {
      show_heading: true,
      heading: "Heading only",
    });
    body += await render(name, "blank" + i, {
      show_heading: true,
      heading: "",
      show_shop_all: true,
      shop_all_label: "",
    });
  }
  fs.writeFileSync(
    tmp + "/index.html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--heading-font:Georgia,serif;--body-font:Arial,sans-serif;--page-width:1400px}</style><link rel="stylesheet" href="/assets/theme.css"></head><body>${body}</body></html>`,
  );
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost").pathname,
      f = u.startsWith("/assets/") ? path.join(root, u) : tmp + "/index.html";
    fs.readFile(f, (e, d) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        f.endsWith(".css")
          ? "text/css"
          : f.endsWith(".html")
            ? "text/html"
            : "image/jpeg",
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
  const page = await browser.newPage();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:" + server.address().port + "/");
    for (let i = 0; i < 4; i++) {
      assert.equal(
        await page
          .locator(`#hidden${i} .peach-row-header,#blank${i} .peach-row-header`)
          .count(),
        0,
      );
      const state = await page.locator("#both" + i).evaluate((e) => {
        const h = e.querySelector(".peach-row-header"),
          title = h.querySelector("h2"),
          a = h.querySelector("a"),
          grid = e.querySelector(".image-card-grid,.showcase-grid"),
          image = grid.querySelector("img"),
          css = getComputedStyle(h),
          t = getComputedStyle(title),
          l = getComputedStyle(a);
        return {
          align: css.textAlign,
          font: t.fontSize,
          headingFamily: t.fontFamily,
          linkFont: l.fontSize,
          linkFamily: l.fontFamily,
          underline: l.textDecorationLine,
          headingAbove:
            title.getBoundingClientRect().bottom <=
            a.getBoundingClientRect().top,
          linkAbove:
            a.getBoundingClientRect().bottom < grid.getBoundingClientRect().top,
          imageLeft: image.getBoundingClientRect().left,
          headerLeft:
            h.getBoundingClientRect().left + parseFloat(css.paddingLeft),
          gap: Math.round(
            grid.getBoundingClientRect().top - h.getBoundingClientRect().bottom,
          ),
        };
      });
      assert.equal(state.align, "left");
      assert.equal(state.font, "36px");
      assert.equal(state.linkFont, "21px");
      assert.ok(state.headingFamily.includes("Georgia"));
      assert.ok(state.linkFamily.includes("Arial"));
      assert.equal(state.underline, "underline");
      assert.equal(state.headingAbove, true);
      assert.equal(state.linkAbove, true);
      assert.ok(Math.abs(state.imageLeft - state.headerLeft) < 1);
      assert.equal(state.gap, 32);
      assert.equal(
        await page
          .locator(`#custom${i} .peach-row-header`)
          .evaluate((e) => getComputedStyle(e).textAlign),
        "right",
      );
      assert.equal(
        await page
          .locator(`#custom${i} .peach-row-header h2`)
          .evaluate((e) => getComputedStyle(e).fontSize),
        "42px",
      );
      assert.equal(
        await page
          .locator(`#custom${i} .peach-row-header a`)
          .getAttribute("href"),
        "/pages/about",
      );
      assert.equal(
        await page
          .locator(`#custom${i} .peach-row-header`)
          .evaluate((e) => getComputedStyle(e).gap),
        "18px",
      );
      assert.equal(
        await page
          .locator(`#custom${i} .peach-row-header`)
          .evaluate((e) => getComputedStyle(e).marginBottom),
        "44px",
      );
      assert.equal(
        await page.locator(`#link${i} .peach-row-header h2`).count(),
        0,
      );
      assert.equal(
        await page
          .locator(`#link${i} .peach-row-header`)
          .evaluate((e) => getComputedStyle(e).textAlign),
        "center",
      );
      assert.equal(
        await page
          .locator(`#link${i} .peach-row-header a`)
          .getAttribute("href"),
        "https://example.com/shop",
      );
      assert.equal(
        await page.locator(`#heading${i} .peach-row-header a`).count(),
        0,
      );
      const cards = (id) =>
        page
          .locator(`#${id} .image-card,#${id} .showcase-product`)
          .evaluateAll((es) => es.map((e) => e.innerHTML));
      assert.deepEqual(await cards("hidden" + i), await cards("both" + i));
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      "PASS all four sections: hidden defaults, serif/sans sizes, underline, stacked order, content inset, spacing, alignment, destinations, independent toggles and unchanged cards at " +
        width +
        "px",
    );
  }
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
