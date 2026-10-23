// Local rendering adapter, NOT a Shopify runtime. Fixtures contain no real store data.
const fs = require("fs"),
  path = require("path");
const { Liquid } = require("liquidjs");
const root = path.resolve(__dirname, ".."),
  out = process.env.PEACH_REVIEW_DIR || "/tmp/peach-conversion-review";
fs.mkdirSync(out + "/snippets", { recursive: true });
function clean(s) {
  return s
    .replace(/{% schema %}[\s\S]*?{% endschema %}/g, "")
    .replace(/{%\s*form\s+'([^']+)'([^%]*)%}/g, (_, type, args) => {
      const id = args.match(/id:\s*([\w]+)/)?.[1];
      const cls = args.match(/class:\s*'([^']+)'/)?.[1];
      return `<form method="post" action="${type === "product" ? "/cart/add" : type === "customer" ? "/contact" : type === "localization" ? "/localization" : "/contact"}"${id ? ' id="{{ ' + id + ' }}"' : ""}${cls ? ' class="' + cls + '"' : ""}>`;
    })
    .replace(/{%\s*endform\s*%}/g, "</form>")
    .replace(/{%\s*paginate\s+[^%]+%}/g, "")
    .replace(/{%\s*endpaginate\s*%}/g, "");
}
for (const f of fs.readdirSync(root + "/snippets"))
  fs.writeFileSync(
    out + "/snippets/" + f,
    clean(fs.readFileSync(root + "/snippets/" + f, "utf8")),
  );
const engine = new Liquid({
  root: out + "/snippets",
  extname: ".liquid",
  jsTruthy: false,
});
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const trans = JSON.parse(fs.readFileSync(root + "/locales/en.default.json"));
engine.registerFilter("t", (key, ...params) => {
  let v = key.split(".").reduce((a, k) => a?.[k], trans) || key;
  for (const p of params)
    if (Array.isArray(p)) v = v.replaceAll("{{ " + p[0] + " }}", p[1]);
  return v;
});
engine.registerFilter("asset_url", (s) => "/assets/" + s);
engine.registerFilter(
  "preload_tag",
  (s) =>
    `<link rel="preload" href="${s}" as="font" type="font/woff2" crossorigin>`,
);
engine.registerFilter("image_url", (s) =>
  typeof s === "string" ? s : s?.src || s?.preview_image?.src || "",
);
engine.registerFilter("image_tag", (src, ...attrs) => {
  let params = Object.fromEntries(attrs.filter(Array.isArray));
  return `<img src="${src}" alt="${esc(params.alt)}" loading="${params.loading || "lazy"}" width="1200" height="1200">`;
});
engine.registerFilter(
  "placeholder_svg_tag",
  (s, cls) => `<svg class="${cls}" viewBox="0 0 400 400"></svg>`,
);
engine.registerFilter("money", (v) => "$" + (Number(v || 0) / 100).toFixed(2));
engine.registerFilter(
  "money_with_currency",
  (v) => "$" + (Number(v || 0) / 100).toFixed(2) + " USD",
);
engine.registerFilter("payment_terms", () => "");
engine.registerFilter("default_errors", () => "");
engine.registerFilter("structured_data", () => "{}");
engine.registerFilter("default_pagination", () => "");
function defaults(settings) {
  return Object.fromEntries(
    (settings || []).filter((s) => s.id).map((s) => [s.id, s.default ?? null]),
  );
}
const menu = {
  links: [
    "Shop",
    "Greeting Cards",
    "Desk & Stationary",
    "Journals & Notebooks",
    "Planners & Calendars",
    "Home Goods",
    "Favorites",
  ].map((title, i) => ({
    title,
    url: i
      ? "/collections/" +
        [
          "",
          "cards",
          "desk-stationary",
          "journals-notebooks",
          "planner-calendars",
          "home-goods",
          "favorites",
        ][i]
      : "/Home.html",
    links: [],
  })),
};
const policies = [
  { title: "FAQ", url: "/pages/faq", body: "Fixture" },
  { title: "Terms of Use", url: "/policies/terms-of-service", body: "Fixture" },
  { title: "Privacy Policy", url: "/policies/privacy-policy", body: "Fixture" },
];
const pages = [
  "About Us",
  "Our Process",
  "Contact",
  "Wholesale",
  "Where to Buy",
].map((t) => ({
  title: t,
  handle: t.toLowerCase().replaceAll(" ", "-"),
  url: "/pages/" + t.toLowerCase().replaceAll(" ", "-"),
}));
const ctx = {
  settings: {
    social_facebook: "https://facebook.com/name",
    social_twitter: "https://twitter.com/name",
    social_instagram: "https://instagram.com/name",
  },
  shop: { name: "Peach Islands", customer_accounts_enabled: true, policies },
  pages,
  localization: {
    country: { name: "United States", currency: { iso_code: "USD" } },
    available_countries: [{}],
  },
  customer: { first_name: "Lisa" },
  routes: {
    root_url: "/",
    all_products_collection_url: "/Home.html",
    cart_url: "/cart",
    account_url: "/account",
    search_url: "/search",
  },
  cart: { item_count: 0, "empty?": true },
  paginate: { pages: 1 },
  form: {},
};
engine.options.globals = ctx;
async function section(id, entry, extra = {}) {
  const raw = fs.readFileSync(
    root + "/sections/" + entry.type + ".liquid",
    "utf8",
  );
  const schema = JSON.parse(
    raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1],
  );
  const settings = { ...defaults(schema.settings), ...entry.settings };
  if (entry.type === "header") settings.menu = menu;
  const blocks = (entry.block_order || []).map((key) => {
    const b = entry.blocks[key];
    return {
      id: key,
      type: b.type,
      settings: {
        ...defaults(schema.blocks.find((x) => x.type === b.type).settings),
        ...b.settings,
      },
      shopify_attributes: `data-block-id="${id}-${key}"`,
    };
  });
  return (
    `<section id="shopify-section-${id}" class="pi-section">` +
    (await engine.parseAndRender(clean(raw), {
      ...ctx,
      ...extra,
      section: { id, settings, blocks },
    })) +
    "</section>"
  );
}
async function template(filename, extra = {}, prefix = "") {
  const json = JSON.parse(
    fs.readFileSync(root + "/templates/" + filename + ".json"),
  );
  let s = "";
  for (const id of json.order) {
    const entry = json.sections[id];
    if (!entry.disabled) s += await section(prefix + id, entry, extra);
  }
  return s;
}
async function group(filename) {
  const json = JSON.parse(
    fs.readFileSync(root + "/sections/" + filename + ".json"),
  );
  let s = "";
  for (const id of json.order) s += await section(id, json.sections[id]);
  return s;
}
async function page(name, body) {
  const headerFonts = await engine.parseAndRender(
    fs
      .readFileSync(root + "/snippets/header-fonts.liquid", "utf8")
      .replace(/{% style %}/g, "<style>")
      .replace(/{% endstyle %}/g, "</style>"),
    ctx,
  );
  const css =
    ':root{--heading-font:"Peach Islands Cormorant Garamond",serif;--body-font:Montserrat,sans-serif;--secondary-font:"Open Sans",sans-serif;--nav-font:Montserrat,sans-serif;--page-width:1400px;--ink:#111;--green:#317657;--rose:#a95459}';
  fs.writeFileSync(
    out + "/" + name + ".html",
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
      css +
      "</style>" +
      headerFonts +
      '<link rel="stylesheet" href="/assets/theme.css"><script defer src="/assets/theme.js"></script></head><body>' +
      (await group("header-group")) +
      '<main id="MainContent">' +
      body +
      "</main>" +
      (await group("footer-group")) +
      "</body></html>",
  );
}
(async () => {
  const home = await template("index");
  await page("index", home);
  await page("404", await template("404"));
  const routingCases = [];
  for (const rootUrl of ["/", "/fr/"]) {
    const before = ctx.routes.root_url;
    ctx.routes.root_url = rootUrl;
    for (const url of [
      "/",
      "/Home.html",
      "Home.html",
      "/index.html",
      "index.html",
      "/Home.html?preview_theme_id=123",
      "/collections/cards",
      "https://example.com/Home.html",
    ]) {
      routingCases.push({
        root: rootUrl,
        url,
        actual: (
          await engine.renderFile("navigation-url", { ...ctx, link: { url } })
        ).trim(),
      });
    }
    ctx.routes.root_url = before;
  }
  fs.writeFileSync(
    out + "/routing.json",
    JSON.stringify(routingCases, null, 2),
  );
  await page("duplicates", home + (await template("index", {}, "second-")));
  const imgs = [
    "WildBloomStraightView.jpg",
    "WildBoomInsidePreview.png",
    "WildBloomJournalinaCozyStillLife.png",
    "BloomWildlyDreamFreely.png",
  ];
  const media = imgs.map((f, i) => ({
    id: 100 + i,
    media_type: "image",
    src: "/assets/" + f,
    preview_image: { src: "/assets/" + f },
    alt: "Wild Bloom " + (i + 1),
  }));
  const variants = [
    {
      id: 1001,
      title: "Hardcover",
      price: 2199,
      available: true,
      featured_media: media[0],
      quantity_rule: { min: 1, increment: 1 },
    },
    {
      id: 1002,
      title: "Gift set",
      price: 3199,
      compare_at_price: 3599,
      available: true,
      featured_media: media[1],
      quantity_rule: { min: 2, increment: 2, max: 8 },
    },
    {
      id: 1003,
      title: "Sold out edition",
      price: 2499,
      available: false,
      quantity_rule: { min: 1, increment: 1 },
    },
  ];
  const product = {
    title: "WILD BLOOM | Journal",
    url: "/products/wild-bloom",
    vendor: "Peach Islands",
    type: "Hardcover Journal",
    price: 2199,
    media,
    featured_image: media[0],
    variants,
    selected_or_first_available_variant: variants[0],
    available: true,
    has_only_default_variant: false,
    description:
      "<p>Some of the most beautiful things begin with a single thought. Let your imagination bloom with a journal designed for dreams, ideas, reflections, and everyday inspiration.</p>",
  };
  await page("product", await template("product", { product }));
  await page(
    "product-duplicates",
    (await template("product", { product })) +
      (await template("product", { product }, "second-")),
  );
  await page(
    "product-selected",
    await template("product", {
      product: { ...product, selected_or_first_available_variant: variants[1] },
    }),
  );
  const collection = {
    title: "Journals & Notebooks",
    url: "/collections/journals-notebooks",
    products: Array.from({ length: 28 }, (_, i) => ({
      ...product,
      title: ["Wild Bloom", "Wild at Heart", "Dream Beyond", "Dream Freely"][
        i % 4
      ],
      featured_image: {
        src:
          "/assets/" +
          [
            "PeachIsland_WildBoomJournal.jpg",
            "PeachIsland_WildatheartJournal.jpg",
            "PeachIsland_dreamBeyondJournal.jpg",
            "PeachIsland_dreamfreelyjournal1.jpg",
          ][i % 4],
      },
      metafields: {},
    })),
    sort_options: [
      { value: "manual", name: "Featured" },
      { value: "price-ascending", name: "Price: low to high" },
    ],
    default_sort_by: "manual",
    filters: [],
  };
  await page("collection", await template("collection", { collection }));
  await page("cart-empty", await template("cart"));
  await page(
    "cart",
    await template("cart", {
      cart: {
        "empty?": false,
        item_count: 2,
        items: [
          {
            key: "test-key",
            url: "/products/wild-bloom",
            url_to_remove: "/cart/change?id=test-key&quantity=0",
            product,
            variant: variants[0],
            image: media[0],
            quantity: 2,
            original_line_price: 4398,
            final_line_price: 3998,
            line_level_discount_allocations: [
              {
                discount_application: { title: "Fixture discount" },
                amount: 400,
              },
            ],
          },
        ],
        total_price: 3998,
        note: "Fixture note",
      },
    }),
  );
  if (!fs.existsSync(out + "/assets"))
    fs.symlinkSync(root + "/assets", out + "/assets", "dir");
  console.log(
    "Rendered homepage, duplicated homepage, product, collection, empty and populated cart fixtures to " +
      out,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
