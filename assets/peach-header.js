// The measured menu and the available row, rather than a fixed desktop breakpoint,
// decide when navigation collapses. Mobile always keeps the compact control row.
(() => {
  const initialized = new WeakMap();
  function init(header) {
    if (initialized.has(header)) return;
    const nav = header.querySelector("[data-header-desktop-nav]");
    const list = nav?.querySelector("ul");
    const toggle = header.querySelector("[data-header-menu-toggle]");
    const panel = header.querySelector("[data-header-mobile-menu]");
    if (!list || !toggle || !panel) return;
    function close(focus = false) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (focus) toggle.focus();
    }
    function fit() {
      const collapsed =
        window.matchMedia("(max-width: 767px)").matches ||
        list.getBoundingClientRect().width > nav.clientWidth + 0.5;
      header.dataset.navCollapsed = String(collapsed);
      if (!collapsed) {
        const restoreFocus = panel.contains(document.activeElement);
        close();
        if (restoreFocus) header.querySelector(".brand")?.focus();
      }
    }
    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });
    header.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) close(true);
    });
    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    const resize = new ResizeObserver(fit);
    resize.observe(header);
    resize.observe(list);
    const mutation = new MutationObserver(fit);
    mutation.observe(list, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.fonts?.ready.then(fit);
    initialized.set(header, () => {
      resize.disconnect();
      mutation.disconnect();
    });
    fit();
  }
  function scan(root) {
    if (root.matches?.("[data-peach-header]")) init(root);
    root.querySelectorAll?.("[data-peach-header]").forEach(init);
  }
  scan(document);
  document.addEventListener("shopify:section:load", (event) =>
    scan(event.target),
  );
  document.addEventListener("shopify:section:unload", (event) => {
    event.target
      .querySelectorAll("[data-peach-header]")
      .forEach((header) => initialized.get(header)?.());
  });
})();
