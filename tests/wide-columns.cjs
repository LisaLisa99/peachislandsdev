// Local fixtures only: Shopify editor/import acceptance requires a store-side check.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const { Liquid } = require("liquidjs");
const { chromium } = require(
  process.env.PEACH_PLAYWRIGHT_MODULE || "playwright",
);
const root = path.resolve(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peach-columns-"));
const engine = new Liquid({ root: root + "/snippets", extname: ".liquid" });
engine.registerFilter("asset_url", (name) => "/assets/" + name);
engine.registerFilter(
  "stylesheet_tag",
  (url) => `<link rel="stylesheet" href="${url}">`,
);
engine.registerFilter("image_url", (image) => image.src);
engine.registerFilter(
  "image_tag",
  (src) => `<img src="${src}" alt="Uploaded fixture">`,
);
engine.registerFilter(
  "placeholder_svg_tag",
  (_, cls) => `<svg class="${cls}" viewBox="0 0 100 100"></svg>`,
);
const defaults = (fields) =>
  Object.fromEntries(
    fields.filter((f) => f.id).map((f) => [f.id, f.default ?? null]),
  );
const specs = {};
async function render(n, id, overrides = {}, mode = "normal") {
  const raw = fs.readFileSync(
    `${root}/sections/peach-image-columns-${n}.liquid`,
    "utf8",
  );
  const schema = JSON.parse(
    raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1],
  );
  assert.equal(schema.presets[0].name, `Image and text columns – ${n}`);
  assert.equal(schema.presets[0].blocks.length, n);
  assert.ok(schema.name.length <= 25);
  for (const field of schema.settings)
    if (field.type === "range") {
      assert.ok((field.max - field.min) / field.step <= 100);
      assert.equal((field.default - field.min) % field.step, 0);
    }
  let blocks = schema.presets[0].blocks.map((block, i) => ({
    type: "card",
    id: `${id}-${i}`,
    shopify_attributes: `data-editor-block="${id}-${i}"`,
    settings: { ...defaults(schema.blocks[0].settings), ...block.settings },
  }));
  if (mode === "reorder") blocks = blocks.slice(0, -1).reverse();
  if (mode === "extra")
    blocks.push({
      ...blocks[0],
      id: `${id}-extra`,
      shopify_attributes: `data-editor-block="${id}-extra"`,
    });
  if (mode === "upload") {
    blocks[0].settings.image = { src: "/assets/BirthMonthFlowers.jpg" };
    blocks[0].settings.link = "/collections/cards";
    blocks[0].settings.button_label = "Explore";
    blocks[0].settings.image_width = 60;
    blocks[0].settings.alignment = "right";
  }
  const settings = { ...defaults(schema.settings), ...overrides };
  specs[id] = { n, blocks: blocks.length };
  return (
    `<section id="${id}">` +
    (await engine.parseAndRender(
      raw.replace(/{% schema %}[\s\S]*?{% endschema %}/, ""),
      { section: { id, settings, blocks } },
    )) +
    "</section>"
  );
}
let server, browser;
(async () => {
  const body =
    (await render(5, "five")) +
    (await render(6, "six")) +
    (await render(
      5,
      "independent",
      { gap: 40, alignment: "left", image_height: 320, background: "#fceae8" },
      "upload",
    )) +
    (await render(6, "reordered", {}, "reorder")) +
    (await render(5, "extra", {}, "extra"));
  fs.writeFileSync(
    tmp + "/index.html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/theme.css"></head><body>${body}</body></html>`,
  );
  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost").pathname;
    const file = url.startsWith("/assets/")
      ? path.join(root, url)
      : tmp + "/index.html";
    fs.readFile(file, (error, data) => {
      if (error) {
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
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const page = await browser.newPage();
  for (const [width, count5, count6] of [
    [1440, 5, 6],
    [1200, 5, 6],
    [768, 3, 3],
    [390, 1, 1],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    for (const [id, count] of [
      ["five", count5],
      ["six", count6],
    ]) {
      const cols = await page
        .locator(`#${id} .image-card-grid`)
        .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" "));
      assert.equal(cols.length, count, `${id} at ${width}px`);
      assert.ok(
        cols.every(
          (value) => Math.abs(parseFloat(value) - parseFloat(cols[0])) < 1,
        ),
        "even column widths",
      );
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const alignment = await page
    .locator("#independent .image-card")
    .first()
    .evaluate((e) => getComputedStyle(e).textAlign);
  assert.equal(alignment, "right");
  assert.equal(
    await page
      .locator("#five .image-card")
      .first()
      .evaluate((e) => getComputedStyle(e).textAlign),
    "center",
  );
  assert.equal(
    await page
      .locator("#independent .column-image img")
      .first()
      .getAttribute("src"),
    "/assets/BirthMonthFlowers.jpg",
  );
  assert.equal(
    await page.locator("#independent .text-link").getAttribute("href"),
    "/collections/cards",
  );
  assert.equal(
    await page
      .locator("#independent .column-image img")
      .first()
      .evaluate((e) => getComputedStyle(e).height),
    "320px",
  );
  assert.equal(await page.locator("#reordered .image-card").count(), 5);
  assert.equal(
    await page.locator("#reordered h2").first().textContent(),
    "Column 5",
  );
  assert.equal(await page.locator("#extra .image-card").count(), 6);
  console.log(
    "PASS: separate presets; 5/6 equal desktop columns; tablet/mobile grids; independent settings; upload override; links; image sizing; add/remove/reorder.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
