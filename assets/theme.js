// Instance-scoped controls also work after Shopify replaces a section in the editor.
(() => {
  function showMedia(gallery, id) {
    const panels = [...gallery.querySelectorAll("[data-media-panel]")];
    if (!panels.some((panel) => panel.id === id)) return;
    panels.forEach((panel) => {
      panel.hidden = panel.id !== id;
      if (panel.hidden) {
        panel.querySelectorAll("video").forEach((video) => video.pause());
        panel.querySelectorAll("iframe").forEach((frame) => {
          frame.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*",
          );
          frame.contentWindow?.postMessage({ method: "pause" }, "*");
        });
      }
    });
    gallery.querySelectorAll("[data-media-target]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mediaTarget === id),
      );
    });
  }
  document.addEventListener("click", (event) => {
    const media = event.target.closest("[data-media-target]");
    if (media)
      showMedia(media.closest("[data-gallery]"), media.dataset.mediaTarget);
    const arrow = event.target.closest("[data-gallery-step]");
    if (arrow) {
      const gallery = arrow.closest("[data-gallery]");
      const panels = [...gallery.querySelectorAll("[data-media-panel]")];
      const current = panels.findIndex((panel) => !panel.hidden);
      if (panels.length)
        showMedia(
          gallery,
          panels[
            (current + Number(arrow.dataset.galleryStep) + panels.length) %
              panels.length
          ].id,
        );
    }
    const quantity = event.target.closest("[data-quantity]");
    if (quantity) {
      const input = quantity.parentElement.querySelector("input");
      if (Number(quantity.dataset.quantity) > 0) input.stepUp();
      else input.stepDown();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  function updateVariant(select) {
    const option = select.selectedOptions[0];
    if (!option) return;
    const section = select.closest("[data-product-section]");
    const available = option.dataset.available === "true";
    section.querySelector("[data-product-price]").textContent =
      option.dataset.price;
    const compare = section.querySelector("[data-compare-price]");
    compare.textContent = option.dataset.compare;
    compare.hidden = !option.dataset.compare;
    const submit = section.querySelector("[data-add-to-cart]");
    submit.disabled = !available;
    submit.textContent = available
      ? submit.dataset.addLabel
      : submit.dataset.soldLabel;
    const quantity = section.querySelector('input[name="quantity"]');
    quantity.min = option.dataset.min || "1";
    quantity.step = option.dataset.step || "1";
    if (option.dataset.max) quantity.max = option.dataset.max;
    else quantity.removeAttribute("max");
    quantity.value = quantity.min;
    showMedia(section.querySelector("[data-gallery]"), option.dataset.media);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", option.value);
    history.replaceState({}, "", url);
  }
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-variant-select]"))
      updateVariant(event.target);
  });
  document.addEventListener("shopify:block:select", (event) => {
    event.target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
      document
        .querySelectorAll(".nav-dropdown[open], .mobile-nav[open]")
        .forEach((details) => details.removeAttribute("open"));
  });
})();
