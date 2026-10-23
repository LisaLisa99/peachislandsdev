// Browser regression checks against local Liquid fixtures, not Shopify's hosted runtime.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = process.env.PEACH_REVIEW_DIR || "/tmp/peach-conversion-review";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const server = http.createServer((req, res) => {
  const file = path.resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let checks = 0;
  function pass(label) {
    checks++;
    console.log(`PASS ${label}`);
  }
  try {
    const routingCases = JSON.parse(fs.readFileSync(root + "/routing.json"));
    for (const entry of routingCases) {
      const isHome = [
        "/",
        "/Home.html",
        "Home.html",
        "/index.html",
        "index.html",
      ].includes(entry.url.split("?")[0]);
      assert.equal(entry.actual, isHome ? entry.root : entry.url);
    }
    pass(
      "Legacy homepage links use the locale-aware root; unrelated and external links are preserved",
    );
    await page.goto(`${base}/index.html`);
    assert.equal(await page.locator(".hero-grid").count(), 1);
    assert.equal(
      await page
        .locator(".desktop-nav > ul > li:first-child > a")
        .getAttribute("href"),
      "/",
    );
    assert.equal(await page.locator(".brand").getAttribute("href"), "/");
    await page.goto(`${base}/404.html`);
    assert.equal(await page.locator(".hero-grid").count(), 0);
    assert.match(
      await page.locator("main").textContent(),
      /A little off the island/,
    );
    pass(
      "Home template renders homepage sections; genuine 404 retains the not-found page",
    );
    await page.goto(`${base}/index.html`);
    await page.evaluate(() => document.fonts.ready);
    const header = await page.evaluate(() => {
      const e = document.querySelector(
        ".desktop-nav > ul > li:first-child > a",
      );
      const c = getComputedStyle(e);
      const logo = document.querySelector(".brand").getBoundingClientRect();
      return {
        size: c.fontSize,
        weight: c.fontWeight,
        tracking: c.letterSpacing,
        line: c.lineHeight,
        padding: c.padding,
        fontLoaded: document.fonts.check('500 15px "Peach Islands Montserrat"'),
        headerHeight: document.querySelector("header").getBoundingClientRect()
          .height,
        logoWidth: logo.width,
        logoCenter: logo.x + logo.width / 2,
        navX: e.getBoundingClientRect().x,
      };
    });
    assert.deepEqual(
      [
        header.size,
        header.weight,
        header.tracking,
        header.line,
        header.padding,
      ],
      ["15px", "500", "2px", "15px", "10px 12px"],
    );
    assert.equal(header.fontLoaded, true);
    assert.equal(
      await page.evaluate(() =>
        document.fonts.check('400 36px "Peach Islands Cormorant Garamond"'),
      ),
      true,
    );
    assert.ok(Math.abs(header.headerHeight - 168) < 1);
    assert.ok(Math.abs(header.logoWidth - 459) <= 1);
    assert.equal(header.logoCenter, 720);
    assert.ok(Math.abs(header.navX - 71.328125) < 1);
    pass(
      "Loaded Montserrat header matches original type, link padding, centering and proportions",
    );
    for (const width of [1440, 1366, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const name of [
        "index",
        "duplicates",
        "product",
        "collection",
        "cart-empty",
        "cart",
      ]) {
        await page.goto(`${base}/${name}.html`);
        await page.evaluate(async () => {
          document.querySelectorAll("img").forEach((image) => {
            image.loading = "eager";
          });
          await Promise.all(
            [...document.images].map((image) => image.decode().catch(() => {})),
          );
        });
        const state = await page.evaluate(() => {
          const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
            broken: [...document.images]
              .filter((image) => !image.naturalWidth)
              .map((image) => image.src),
          };
        });
        assert.deepEqual(
          state,
          { overflow: false, duplicateIds: [], broken: [] },
          `${name} at ${width}px`,
        );
      }
      pass(
        `6 pages: no overflow, duplicate IDs, or broken images at ${width}px`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/product.html`);
    await page.locator("[data-media-target]").nth(2).click();
    assert.equal(
      await page.locator("[data-media-panel]:visible").getAttribute("id"),
      "main-102",
    );
    await page.locator('[data-gallery-step="1"]').click();
    assert.equal(
      await page.locator("[data-media-panel]:visible").getAttribute("id"),
      "main-103",
    );
    await page.locator('[data-gallery-step="1"]').click();
    assert.equal(
      await page.locator("[data-media-panel]:visible").getAttribute("id"),
      "main-100",
    );
    pass("Gallery thumbnails and next-image wrapping");
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
      "main-101",
    );
    const quantity = page.locator('input[name="quantity"]');
    assert.equal(await quantity.inputValue(), "2");
    await page.locator('[data-quantity="1"]').click();
    assert.equal(await quantity.inputValue(), "4");
    for (let i = 0; i < 6; i++)
      await page.locator('[data-quantity="1"]').click();
    assert.equal(await quantity.inputValue(), "8");
    pass("Variant price, compare price, media, and quantity min/step/max");
    await page.selectOption("[data-variant-select]", "1003");
    assert.equal(await page.locator("[data-add-to-cart]").isDisabled(), true);
    assert.equal(
      await page.locator("[data-add-to-cart]").textContent(),
      "Sold out",
    );
    pass("Sold-out variant blocks add-to-cart");
    await page.selectOption("[data-variant-select]", "1001");
    await quantity.fill("3");
    let productPost;
    await page.route("**/cart/add", (route) => {
      productPost = new URLSearchParams(route.request().postData());
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "Fixture cart response",
      });
    });
    await page.locator("[data-add-to-cart]").click();
    await page.waitForURL("**/cart/add");
    assert.equal(productPost.get("id"), "1001");
    assert.equal(productPost.get("quantity"), "3");
    pass("Native product form posts selected variant and quantity");
    await page.goto(`${base}/product-selected.html`);
    assert.equal(
      await page.locator("[data-media-panel]:visible").getAttribute("id"),
      "main-101",
    );
    pass("Server-selected variant uses its initial gallery image");
    await page.goto(`${base}/product-duplicates.html`);
    await page
      .locator("#shopify-section-second-main [data-media-target]")
      .nth(1)
      .click();
    assert.equal(
      await page
        .locator("#shopify-section-main [data-media-panel]:visible")
        .getAttribute("id"),
      "main-100",
    );
    assert.equal(
      await page
        .locator("#shopify-section-second-main [data-media-panel]:visible")
        .getAttribute("id"),
      "second-main-101",
    );
    pass("Duplicated product sections maintain independent gallery state");
    await page.goto(`${base}/duplicates.html`);
    await page.evaluate(() => {
      const first = document.querySelector(
        "#shopify-section-categories .section-surface",
      );
      first.style.setProperty("--section-bg", "#123456");
      first.querySelector("h2").textContent = "Independent section";
    });
    assert.equal(
      await page
        .locator("#shopify-section-second-categories h2")
        .first()
        .textContent(),
      "Wrapping Paper",
    );
    assert.notEqual(
      await page
        .locator("#shopify-section-second-categories .section-surface")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(18, 52, 86)",
    );
    assert.equal(await page.locator("form.newsletter-form").count(), 2);
    pass("Duplicated homepage sections and newsletter IDs remain independent");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/index.html`);
    await page.locator(".mobile-nav>summary").click();
    assert.equal(await page.locator(".mobile-nav nav").isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".mobile-nav").getAttribute("open"), null);
    pass("Mobile navigation and Escape close behavior");
    for (const action of ["update", "checkout"]) {
      await page.goto(`${base}/cart.html`);
      await page.locator('[name="updates[]"]').fill("4");
      let cartPost;
      await page.route("**/cart", (route) => {
        cartPost = new URLSearchParams(route.request().postData());
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "Fixture cart response",
        });
      });
      await page.locator(`button[name="${action}"]`).click();
      await page.waitForURL("**/cart");
      assert.equal(cartPost.get("updates[]"), "4");
      assert.equal(cartPost.has(action), true);
      await page.unroute("**/cart");
    }
    pass(
      "Cart update and checkout serialize line quantities and submit action",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/index.html`);
    await page.evaluate(async () => {
      document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    await page.screenshot({
      path: root + "/conversion-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: root + "/conversion-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    pass("No browser JavaScript errors");
    console.log(
      `${checks} browser checks passed (fixture data; Shopify runtime not tested).`,
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
