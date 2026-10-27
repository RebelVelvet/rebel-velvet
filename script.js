/* =========================================================
   REBEL VELVET | STOREFRONT
   Google Sheets + Products + Sale Prices + Cart + WhatsApp
   ========================================================= */

"use strict";

/* ---------- Configuration ---------- */

const CONFIG = {
  brand: "Rebel Velvet",
  currency: "EGP",
  whatsapp: "201092542461",
  instagram: "https://www.instagram.com/",

  catalogApi:
    "https://script.google.com/macros/s/AKfycbzWgJUpdKAt0rLBIq69-e0ZqQmQsWG3b0z6OYbFnEd8UJQa5SNg0TfLvUZdqFazvleo/exec",

  storageKey: "rebelVelvetCart",
  slideInterval: 4000,

  placeholderImage:
    "https://placehold.co/800x1000/f1dfd8/6d1f2b?text=Rebel+Velvet"
};

/* ---------- State ---------- */

const state = {
  products: [],
  driveImages: {},
  cart: [],
  filter: "all"
};

const slider = {
  el: null,
  slides: [],
  index: 0,
  timer: null
};

/* ---------- Helpers ---------- */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => HTML_ENTITIES[character]
  );
}

const priceFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

function formatPrice(amount) {
  return `${CONFIG.currency} ${priceFormat.format(
    Number(amount) || 0
  )}`;
}

function sameKey(first, second) {
  return (
    String(first ?? "").trim().toLowerCase() ===
    String(second ?? "").trim().toLowerCase()
  );
}

/* ---------- Sale Prices ---------- */

function getSalePrice(product) {
  const regularPrice = Number(product.price);
  const salePrice = Number(product.salePrice);

  if (
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice
  ) {
    return salePrice;
  }

  return null;
}

function getEffectivePrice(product) {
  return getSalePrice(product) ?? (Number(product.price) || 0);
}

function renderProductPrice(product) {
  const salePrice = getSalePrice(product);

  if (salePrice === null) {
    return `
      <span class="price-current">
        ${formatPrice(product.price)}
      </span>`;
  }

  return `
    <span class="price-old">
      ${formatPrice(product.price)}
    </span>

    <span class="price-current">
      ${formatPrice(salePrice)}
    </span>

    <span class="sale-badge">
      SALE
    </span>`;
}

/* ---------- Google Sheets Catalog ---------- */

function fetchCatalog() {
  return new Promise(resolve => {
    const callbackName =
      `rvCb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const script = document.createElement("script");

    let finished = false;

    const timeoutId = setTimeout(() => {
      finish(null);
    }, 12000);

    function finish(data) {
      if (finished) return;

      finished = true;

      clearTimeout(timeoutId);

      try {
        delete window[callbackName];
      } catch (_) {
        window[callbackName] = undefined;
      }

      script.remove();

      resolve(data && data.success ? data : null);
    }

    window[callbackName] = finish;

    script.onerror = () => finish(null);

    script.src =
      `${CONFIG.catalogApi}?callback=${callbackName}&t=${Date.now()}`;

    document.head.appendChild(script);
  });
}

/* ---------- Categories and Filters ---------- */

function getCategories() {
  const categories = [];

  state.products.forEach(product => {
    const category = String(product.category || "").trim();

    if (
      category &&
      !categories.some(item => sameKey(item, category))
    ) {
      categories.push(category);
    }
  });

  return categories;
}

function renderCategoryFilters() {
  const categories = getCategories();

  const containers = [
    $("#product-filters"),
    $(".product-filters"),
    $("[data-product-filters]"),
    $("#filter-bar"),
    $(".filter-bar")
  ].filter(Boolean);

  const buttons = categories.map(category => `
    <button
      type="button"
      class="filter-btn${sameKey(state.filter, category)
        ? " is-active active"
        : ""}"
      data-filter="${escapeHtml(category)}"
    >
      ${escapeHtml(category)}
    </button>
  `).join("");

  containers.forEach(container => {
    container.innerHTML = `
      <button
        type="button"
        class="filter-btn${state.filter === "all"
          ? " is-active active"
          : ""}"
        data-filter="all"
      >
        All products
      </button>
      ${buttons}
    `;
  });

  const categoryContainer = $(
    "#category-grid, .category-grid, [data-category-grid]"
  );

  if (categoryContainer) {
    categoryContainer.innerHTML = categories.map(category => `
      <button
        type="button"
        class="category-card"
        data-filter="${escapeHtml(category)}"
      >
        <span>${escapeHtml(category)}</span>
      </button>
    `).join("");
  }
}

function getVisibleProducts() {
  if (state.filter === "all") {
    return state.products;
  }

  return state.products.filter(product =>
    sameKey(product.category, state.filter)
  );
}

function setFilter(category) {
  state.filter = category || "all";

  renderCategoryFilters();
  renderProducts();
}

/* ---------- Product Display ---------- */

function renderProducts() {
  const grid = $("#products");

  if (!grid) return;

  const products = getVisibleProducts();

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty">
        <span aria-hidden="true">✦</span>
        <h3>Coming soon</h3>
        <p>New pieces are on their way.</p>
      </div>
    `;

    return;
  }

  grid.innerHTML = products.map(product => {
    const image = product.image || CONFIG.placeholderImage;

    return `
      <article class="product-card">

        <div class="product-media">
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
          >

          ${
            getSalePrice(product) !== null
              ? '<span class="product-sale-label">SALE</span>'
              : ""
          }
        </div>

        <div class="product-body">

          <p class="product-cat">
            ${escapeHtml(product.category || "")}
          </p>

          <h3 class="product-name">
            ${escapeHtml(product.name)}
          </h3>

          <p class="product-price">
            ${renderProductPrice(product)}
          </p>

          <button
            class="btn btn-outline"
            type="button"
            data-action="add"
            data-id="${escapeHtml(product.id)}"
          >
            Add to bag
          </button>

        </div>
      </article>
    `;
  }).join("");

  renderCart();
}

/* ---------- Cart Storage ---------- */

function loadCart() {
  try {
    const savedCart = JSON.parse(
      localStorage.getItem(CONFIG.storageKey) || "[]"
    );

    state.cart = Array.isArray(savedCart)
      ? savedCart.filter(item =>
          item &&
          item.id !== undefined &&
          Number(item.quantity) > 0
        )
      : [];

  } catch (_) {
    state.cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify(state.cart)
    );
  } catch (_) {
    // Cart continues working during the current visit.
  }
}

function findProduct(id) {
  return state.products.find(product =>
    String(product.id) === String(id)
  );
}

function findCartItem(id) {
  return state.cart.find(item =>
    String(item.id) === String(id)
  );
}

function updateSavedCartPrices() {
  state.cart = state.cart.map(item => {
    const product = findProduct(item.id);

    if (!product) return item;

    return {
      ...item,
      name: product.name,
      category: product.category,
      image: product.image || item.image || CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product)
    };
  });

  saveCart();
}

/* ---------- Add Products to Cart ---------- */

function addToCart(id) {
  const product = findProduct(id);

  if (!product) return;

  const existingItem = findCartItem(id);

  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.price = getEffectivePrice(product);
    existingItem.originalPrice = Number(product.price) || 0;

  } else {
    state.cart.push({
      id: String(product.id),
      name: product.name,
      category: product.category || "",
      image: product.image || CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product),
      quantity: 1
    });
  }

  updateCart();
  openCart();
}

/* ---------- Change Quantity ---------- */

function changeQuantity(id, change) {
  const item = findCartItem(id);

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(
      cartItem => String(cartItem.id) !== String(id)
    );
  }

  updateCart();
}

/* ---------- Remove Product ---------- */

function removeFromCart(id) {
  state.cart = state.cart.filter(
    item => String(item.id) !== String(id)
  );

  updateCart();
}

/* ---------- Cart Totals ---------- */

function getCartCount() {
  return state.cart.reduce(
    (total, item) => total + (Number(item.quantity) || 1),
    0
  );
}

function getCartTotal() {
  return state.cart.reduce(
    (total, item) =>
      total +
      (Number(item.price) || 0) *
      (Number(item.quantity) || 1),
    0
  );
}

/* ---------- Cart Item Display ---------- */

function renderCartItem(item) {
  const originalPrice =
    Number(item.originalPrice) || Number(item.price) || 0;

  const price = Number(item.price) || 0;

  const hasDiscount = originalPrice > price;

  return `
    <div class="cart-line">

      <img
        src="${escapeHtml(item.image || CONFIG.placeholderImage)}"
        alt="${escapeHtml(item.name)}"
        loading="lazy"
      >

      <div class="cart-line-info">

        <p class="cat">
          ${escapeHtml(item.category || "")}
        </p>

        <h4>
          ${escapeHtml(item.name)}
        </h4>

        <p class="price">
          ${
            hasDiscount
              ? `<span class="price-old">${formatPrice(originalPrice)}</span>`
              : ""
          }

          <span class="price-current">
            ${formatPrice(price)}
          </span>
        </p>

        <div class="qty">

          <button
            type="button"
            data-action="qty"
            data-id="${escapeHtml(item.id)}"
            data-delta="-1"
            aria-label="Decrease quantity"
          >
            −
          </button>

          <span>
            ${Number(item.quantity) || 1}
          </span>

          <button
            type="button"
            data-action="qty"
            data-id="${escapeHtml(item.id)}"
            data-delta="1"
            aria-label="Increase quantity"
          >
            +
          </button>

        </div>

      </div>

      <button
        type="button"
        class="remove-item"
        data-action="remove"
        data-id="${escapeHtml(item.id)}"
        aria-label="Remove ${escapeHtml(item.name)}"
      >
        ×
      </button>

    </div>
  `;
}

/* ---------- Render Cart ---------- */

function renderCart() {
  const itemsContainer = $(
    "#cart-items, .cart-items, [data-cart-items]"
  );

  if (itemsContainer) {
    itemsContainer.innerHTML = state.cart.length
      ? state.cart.map(renderCartItem).join("")
      : '<p class="cart-empty">Your bag is currently empty.</p>';
  }

  const count = getCartCount();
  const total = formatPrice(getCartTotal());

  [
    "#cart-count",
    ".cart-count",
    "[data-cart-count]"
  ].forEach(selector => {
    $$(selector).forEach(element => {
      element.textContent = count;
      element.classList.toggle("has-items", count > 0);
    });
  });

  [
    "#cart-total",
    ".cart-total",
    "[data-cart-total]"
  ].forEach(selector => {
    $$(selector).forEach(element => {
      element.textContent = total;
    });
  });

  const checkoutButtons = $$(
    "[data-checkout], #checkout-button, #checkout, .checkout-button"
  );

  checkoutButtons.forEach(button => {
    button.disabled = state.cart.length === 0;
  });
}

function updateCart() {
  saveCart();
  renderCart();
}

/* ---------- Open and Close Cart ---------- */

function openCart() {
  const drawer = $(
    "#cart-drawer, .cart-drawer, [data-cart-drawer], #cart-overlay"
  );

  if (!drawer) return;

  drawer.classList.add("is-open", "open");
  drawer.setAttribute("aria-hidden", "false");

  document.body.classList.add("is-locked");
}

function closeCart() {
  const drawer = $(
    "#cart-drawer, .cart-drawer, [data-cart-drawer], #cart-overlay"
  );

  if (!drawer) return;

  drawer.classList.remove("is-open", "open");
  drawer.setAttribute("aria-hidden", "true");

  document.body.classList.remove("is-locked");
}

/* ---------- WhatsApp Checkout ---------- */

function checkout() {
  if (!state.cart.length) return;

  const orderLines = state.cart.map(item => {
    const originalPrice =
      Number(item.originalPrice) || Number(item.price);

    const currentPrice = Number(item.price) || 0;

    const priceText = originalPrice > currentPrice
      ? `${formatPrice(originalPrice)} -> ${formatPrice(currentPrice)}`
      : formatPrice(currentPrice);

    return `• ${item.name} x ${item.quantity} = ${priceText}`;
  });

  const message = [
    `Hello ${CONFIG.brand}! I'd like to place an order:`,
    "",
    ...orderLines,
    "",
    `Total: ${formatPrice(getCartTotal())}`,
    "",
    "Name:",
    "Phone:",
    "Address:"
  ].join("\n");

  const whatsappUrl =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

/* ---------- Hero Slider ---------- */

function setupSlider() {
  slider.el = $("#hero-slider-image");

  if (!slider.el) return;

  const catalogImages = state.products
    .map(product => product.image)
    .filter(Boolean);

  const driveImages = Object.values(state.driveImages)
    .flat()
    .map(image => image && (image.url || image.image))
    .filter(Boolean);

  const images = catalogImages.length
    ? catalogImages
    : driveImages;

  slider.slides = [...new Set(images)];

  if (!slider.slides.length) {
    slider.el.src = CONFIG.placeholderImage;
    return;
  }

  slider.index = 0;
  slider.el.src = slider.slides[0];

  if (
    slider.slides.length < 2 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  clearInterval(slider.timer);

  slider.timer = setInterval(() => {
    slider.index = (slider.index + 1) % slider.slides.length;
    slider.el.src = slider.slides[slider.index];
  }, CONFIG.slideInterval);
}

/* ---------- Contact Links ---------- */

function setContactLinks() {
  $$("[data-wa]").forEach(link => {
    link.href = `https://wa.me/${CONFIG.whatsapp}`;
  });

  $$("[data-tel]").forEach(link => {
    link.href = `tel:+${CONFIG.whatsapp}`;
  });

  $$("[data-ig]").forEach(link => {
    link.href = CONFIG.instagram;
  });
}

/* ---------- Mobile Navigation ---------- */

function setMenu(isOpen) {
  const header = $(".site-header");
  const button = $("#menu-toggle");

  if (!header || !button) return;

  header.classList.toggle("nav-open", isOpen);

  button.setAttribute(
    "aria-expanded",
    String(isOpen)
  );
}

/* ---------- Event Listeners ---------- */

function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const actionElement = target.closest("[data-action]");

    if (actionElement) {
      const action = actionElement.dataset.action;
      const id = actionElement.dataset.id;

      if (action === "add") {
        addToCart(id);
        return;
      }

      if (action === "qty") {
        changeQuantity(
          id,
          Number(actionElement.dataset.delta)
        );
        return;
      }

      if (action === "remove") {
        removeFromCart(id);
        return;
      }

      if (action === "checkout") {
        checkout();
        return;
      }

      if (action === "close-cart") {
        closeCart();
        return;
      }
    }

    const filterElement = target.closest("[data-filter]");

    if (filterElement) {
      const category = filterElement.dataset.filter || "all";

      setFilter(category);

      if (
        filterElement.closest(
          ".category-grid, #category-grid, [data-category-grid]"
        )
      ) {
        $("#products")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

      return;
    }

    if (
      target.closest(
        "[data-checkout], #checkout-button, #checkout, .checkout-button"
      )
    ) {
      checkout();
      return;
    }

    if (
      target.closest(
        "[data-cart-open], #cart-open, .cart-open"
      )
    ) {
      openCart();
      return;
    }

    if (
      target.closest(
        "[data-cart-close], #cart-close, .cart-close"
      )
    ) {
      closeCart();
      return;
    }

    if (target.closest("#menu-toggle")) {
      const header = $(".site-header");

      setMenu(
        !(header && header.classList.contains("nav-open"))
      );

      return;
    }

    if (target.closest(".site-header.nav-open a")) {
      setMenu(false);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeCart();
      setMenu(false);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      $(".site-header")?.classList.toggle(
        "is-scrolled",
        window.scrollY > 24
      );
    },
    { passive: true }
  );
}

/* ---------- Initialize Store ---------- */

async function init() {
  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  bindEvents();
  setContactLinks();
  loadCart();
  renderCart();

  const data = await fetchCatalog();

  state.products =
    data && Array.isArray(data.catalog)
      ? data.catalog.filter(product =>
          product &&
          product.id &&
          product.name
        )
      : [];

  state.driveImages =
    data && data.products && typeof data.products === "object"
      ? data.products
      : {};

  updateSavedCartPrices();

  renderCategoryFilters();
  renderProducts();
  renderCart();
  setupSlider();

  const status = $(
    "#catalog-status, [data-catalog-status]"
  );

  if (status) {
    status.textContent = state.products.length
      ? ""
      : "Products could not be loaded. Please refresh the page.";

    status.hidden = state.products.length > 0;
  }
}

/* ---------- Start ---------- */

document.addEventListener("DOMContentLoaded", init);
