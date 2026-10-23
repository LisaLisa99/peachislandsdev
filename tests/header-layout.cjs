// Local header fixtures; no Shopify authentication or cart mutations.
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peach-header-"));
function clean(raw) {
  return raw
    .replace(/{% schema %}[\s\S]*?{% endschema %}/g, "")
    .replace(/{% style %}/g, "<style>")
    .replace(/{% endstyle %}/g, "</style>")
    .replace(/{%\s*form\s+[^%]*%}/g, "<form>")
    .replace(/{% endform %}/g, "</form>");
}
for (const name of fs.readdirSync(root + "/snippets"))
  fs.writeFileSync(
    tmp + "/" + name,
    clean(fs.readFileSync(root + "/snippets/" + name, "utf8")),
  );
const engine = new Liquid({ root: tmp, extname: ".liquid" }),
  locale = JSON.parse(fs.readFileSync(root + "/locales/en.default.json"));
engine.registerFilter("asset_url", (name) => "/assets/" + name);
engine.registerFilter(
  "stylesheet_tag",
  (url) => `<link rel="stylesheet" href="${url}">`,
);
engine.registerFilter("preload_tag", () => "");
engine.registerFilter("image_url", (image) => image.src);
engine.registerFilter(
  "image_tag",
  (src) =>
    `<img src="${src}" width="459" height="52" alt="Uploaded original logo">`,
);
engine.registerFilter("t", (key) =>
  key.split(".").reduce((o, k) => o[k], locale),
);
const raw = fs.readFileSync(root + "/sections/header.liquid", "utf8"),
  schema = JSON.parse(raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const settings = Object.fromEntries(
  schema.settings.filter((s) => s.id).map((s) => [s.id, s.default ?? null]),
);
const titles = [
  "Shop",
  "Greeting Cards",
  "Desk & Stationary",
  "Journals & Notebooks",
  "Planners & Calendars",
  "Home Goods",
  "Favorites",
];
async function fixture(name, changes = {}) {
  const {
    short = false,
    long = false,
    count = 12,
    rootUrl = "/",
    ...overrides
  } = changes;
  const labels = short
    ? titles.slice(0, 2)
    : long
      ? [...titles, ...titles.slice(1)]
      : titles;
  const context = {
    settings: { social_facebook: "", social_twitter: "", social_instagram: "" },
    routes: {
      root_url: rootUrl,
      cart_url: rootUrl + "cart",
      account_url: rootUrl + "account",
    },
    cart: { item_count: count },
    shop: { name: "Peach Islands", customer_accounts_enabled: true },
    customer: { first_name: "Lisa" },
    localization: {
      country: { name: "United States", currency: { iso_code: "USD" } },
      available_countries: [{}],
    },
    section: {
      id: "header-" + name,
      settings: {
        ...settings,
        ...overrides,
        menu: {
          links: labels.map((title) => ({ title, url: rootUrl, links: [] })),
        },
      },
    },
  };
  engine.options.globals = context;
  const fonts = await engine.renderFile("header-fonts", context);
  const header = await engine.parseAndRender(clean(raw), context);
  fs.writeFileSync(
    tmp + "/" + name + ".html",
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--page-width:1400px;--ink:#111;--rose:#a95459}</style><link rel="stylesheet" href="/assets/theme.css">${fonts}<script src="/assets/peach-header.js" defer></script></head><body>${header}</body></html>`,
  );
}
let server, browser;
(async () => {
  await fixture("normal");
  await fixture("short", { short: true });
  await fixture("long", { long: true });
  await fixture("zero", { count: 0 });
  await fixture("large-count", { count: 123 });
  await fixture("nobar", { show_bar: false });
  await fixture("large-logo", { logo_width: 700 });
  await fixture("uploaded", { logo: { src: "/assets/PeachIslands.png" } });
  await fixture("locale", { rootUrl: "/fr/" });
  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost").pathname;
    const file = url.startsWith("/assets/")
      ? path.join(root, url)
      : path.join(tmp, url);
    fs.readFile(file, (e, data) => {
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
          ".woff2": "font/woff2",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream",
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
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:" + server.address().port;
  for (const width of [1600, 1440, 1366, 1280, 1024, 768, 767, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      "normal",
      "short",
      "long",
      "nobar",
      "large-logo",
      "uploaded",
    ]) {
      await page.goto(base + "/" + name + ".html");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(50);
      const state = await page.evaluate(() => {
        const h = document.querySelector("[data-peach-header]"),
          logo = h.querySelector(".brand").getBoundingClientRect(),
          cart = h.querySelector(".cart-icon").getBoundingClientRect(),
          nav = h.querySelector("[data-header-desktop-nav]"),
          list = nav.querySelector("ul");
        return {
          center: logo.x + logo.width / 2 - innerWidth / 2,
          cartWidth: cart.width,
          cartHeight: cart.height,
          overflow: document.documentElement.scrollWidth > innerWidth,
          count: h.querySelector(".cart-count").textContent,
          cartCount: h.querySelectorAll(".cart-icon").length,
          overlap: logo.right > cart.left,
          collapsed: h.dataset.navCollapsed,
          shouldCollapse:
            innerWidth <= 767 ||
            list.getBoundingClientRect().width > nav.clientWidth + 0.5,
          cartInMain: !!h.querySelector(".main-header-row .cart-icon"),
        };
      });
      assert.ok(
        Math.abs(state.center) < 0.6,
        `${name} centered at ${width}: ${JSON.stringify(state)}`,
      );
      assert.ok(state.cartWidth >= 44 && state.cartHeight >= 44);
      assert.equal(state.overflow, false, `${name} at ${width}`);
      assert.equal(state.cartCount, 1);
      assert.equal(state.overlap, false);
      assert.equal(state.collapsed, String(state.shouldCollapse));
      assert.equal(state.cartInMain, true);
      assert.equal(state.count, "12");
    }
    console.log(
      "PASS centered logo, cart target, no overlap/overflow and menu fit at " +
        width +
        "px",
    );
  }
  for (const [name, count, url] of [
    ["zero", "0", "/cart"],
    ["large-count", "123", "/cart"],
    ["locale", "12", "/fr/cart"],
  ]) {
    await page.goto(base + "/" + name + ".html");
    assert.equal(await page.locator(".cart-count").textContent(), count);
    assert.equal(await page.locator(".cart-icon").getAttribute("href"), url);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(base + "/short.html");
  await page.waitForTimeout(50);
  assert.equal(
    await page.locator("header").getAttribute("data-nav-collapsed"),
    "false",
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(50);
  await page.locator("[data-header-menu-toggle]").click();
  assert.equal(
    await page.locator("[data-header-mobile-menu]").isVisible(),
    true,
  );
  assert.equal(
    await page
      .locator("[data-header-menu-toggle]")
      .getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("[data-header-mobile-menu]").isVisible(),
    false,
  );
  assert.equal(
    await page
      .locator("[data-header-menu-toggle]")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("[data-header-menu-toggle]").click();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(
    await page.locator("[data-header-mobile-menu]").isVisible(),
    false,
  );
  assert.equal(
    await page
      .locator("[data-header-menu-toggle]")
      .getAttribute("aria-expanded"),
    "false",
  );
  // A section injected by the visual editor initializes without reloading the page.
  await page.evaluate(() => {
    const h = document.querySelector("header"),
      host = document.createElement("div");
    host.id = "dynamic";
    host.innerHTML = h.outerHTML;
    host.querySelector("[data-header-mobile-menu]").id = "dynamic-menu";
    host
      .querySelector("[data-header-menu-toggle]")
      .setAttribute("aria-controls", "dynamic-menu");
    document.body.append(host);
    host.dispatchEvent(
      new CustomEvent("shopify:section:load", { bubbles: true }),
    );
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(50);
  await page.locator("#dynamic [data-header-menu-toggle]").click();
  assert.equal(
    await page.locator("#dynamic [data-header-mobile-menu]").isVisible(),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS real/localized cart URLs and 0/12/123 counts; short-menu tablet fit; toggle/Escape/focus; resize close; editor reinitialization; no JS errors.",
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
