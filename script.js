/* =========================================================
   REBEL VELVET | STOREFRONT
   Google Sheets catalog + sale prices + cart + WhatsApp checkout
   ========================================================= */

"use strict";

const CONFIG = {
  brand: "Rebel Velvet",
  currency: "EGP",
  whatsapp: "201092542461",
  instagram: "https://www.instagram.com/",
  catalogApi: "https://script.google.com/macros/s/AKfycbzWgJUpdKAt0rLBIq69-e0ZqQmQsWG3b0z6OYbFnEd8UJQa5SNg0TfLvUZdqFazvleo/exec",
  storageKey: "rebelVelvetCart",
  slideInterval: 4000,
  placeholderImage: "https://placehold.co/800x1000/f1dfd8/6d1f2b?text=Rebel+Velvet"
};

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

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastFocusedElement = null;

/* ---------- Helpers ---------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const HTML_ENTITIES = {
  "&": "&",
  "<": "<",
  ">": ">",
  '"': """,
  "'": "'"
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
  return `${CONFIG.currency} ${priceFormat.format(Number(amount) || 0)}`;
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function sameKey(first, second) {
  return (
    String(first ?? "").trim().toLowerCase() ===
    String(second ?? "").trim().toLowerCase()
  );
}

/* ---------- Image URL handling ---------- */

function normalizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  const thumbnailMatch = value.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/i);
  if (thumbnailMatch) {
    return `https://drive.google.com/thumbnail?id=${thumbnailMatch[1]}&sz=w1200`;
  }

  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1200`;
  }

  const idMatch = value.match(/[?&]id=([^&]+)/i);
  if (value.includes("drive.google.com") && idMatch && !value.includes("/thumbnail")) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
  }

  return value;
}

/* ---------- Sale prices ---------- */

function getSalePrice(product) {
  const regularPrice = Number(product.price);
  const salePrice = Number(product.salePrice);

  if (
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    regularPrice > 0 &&
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
    return `<span class="price-current">${formatPrice(product.price)}</span>`;
  }

  return `
    <span class="price-old">${formatPrice(product.price)}</span>
    <span class="price-current">${formatPrice(salePrice)}</span>
    <span class="sale-badge">SALE</span>
  `;
}

/* ---------- Google Apps Script catalog ---------- */

function fetchCatalog() {
  return new Promise(resolve => {
    const callbackName = `rvCb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    let finished = false;

    const timeoutId = setTimeout(() => finish(null), 15000);

    function finish(data) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);

      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }

      script.remove();

      if (data && data.success && Array.isArray(data.catalog)) {
        resolve(data);
      } else {
        resolve(null);
      }
    }

    window[callbackName] = finish;

    script.onerror = () => {
      finish(null);
    };

    script.src = `${CONFIG.catalogApi}?callback=${callbackName}&t=${Date.now()}`;
    document.head.appendChild(script);
  });
}

/* ---------- Categories and filters ---------- */

function getCategories() {
  const categories = [];
  state.products.forEach(product => {
    const category = String(product.category || "").trim();
    if (category && !categories.some(item => sameKey(item, category))) {
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

  const categoryButtons = categories.map(category => `
    <button
      type="button"
      class="filter-btn${sameKey(state.filter, category) ? " is-active active" : ""}"
      data-filter="${escapeHtml(category)}"
      aria-pressed="${sameKey(state.filter, category)}"
    >
      ${escapeHtml(category)}
    </button>
  `).join("");

  containers.forEach(container => {
    container.innerHTML = `
      <button
        type="button"
        class="filter-btn${state.filter === "all" ? " is-active active" : ""}"
        data-filter="all"
        aria-pressed="${state.filter === "all"}"
      >
        All products
      </button>
      ${categoryButtons}
    `;
  });
}

function getVisibleProducts() {
  if (state.filter === "all") {
    return state.products;
  }
  return state.products.filter(product => sameKey(product.category, state.filter));
}

function setFilter(category = "all") {
  state.filter = category || "all";
  renderCategoryFilters();

  const title = $("#shop-title");
  if (title) {
    title.textContent = state.filter === "all" ? "Find your favorite" : state.filter;
  }

  renderProducts();
}

/* ---------- Product display ---------- */

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
    renderCart();
    return;
  }

  grid.innerHTML = products.map(product => {
    const image = normalizeImageUrl(product.image) || CONFIG.placeholderImage;

    return `
      <article class="product-card">
        <div class="product-media">
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='${CONFIG.placeholderImage}'"
          >
          ${getSalePrice(product) !== null ? '<span class="product-sale-label">SALE</span>' : ""}
        </div>

        <div class="product-body">
          <p class="product-cat">${escapeHtml(product.category || "")}</p>
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
          <p class="product-price">${renderProductPrice(product)}</p>
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

/* ---------- Cart storage and calculations ---------- */

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
    state.cart = Array.isArray(savedCart)
      ? savedCart.filter(item => item && item.id !== undefined && Number(item.quantity) > 0)
      : [];
  } catch (error) {
    state.cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.cart));
  } catch (error) {}
}

function findProduct(id) {
  return state.products.find(product => String(product.id) === String(id));
}

function findCartItem(id) {
  return state.cart.find(item => String(item.id) === String(id));
}

function getCartCount() {
  return state.cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

function getCartTotal() {
  return state.cart.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function updateSavedCartPrices() {
  state.cart = state.cart.map(item => {
    const product = findProduct(item.id);
    if (!product) return item;

    return {
      ...item,
      name: product.name,
      category: product.category || "",
      image: normalizeImageUrl(product.image) || item.image || CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product)
    };
  });

  saveCart();
}

function updateCart() {
  saveCart();
  renderCart();
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;

  const existingItem = findCartItem(id);

  if (existingItem) {
    existingItem.quantity = (Number(existingItem.quantity) || 0) + 1;
    existingItem.price = getEffectivePrice(product);
    existingItem.originalPrice = Number(product.price) || 0;
  } else {
    state.cart.push({
      id: String(product.id),
      name: product.name,
      category: product.category || "",
      image: normalizeImageUrl(product.image) || CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product),
      quantity: 1
    });
  }

  updateCart();
  openCart();
}

function changeQuantity(id, delta) {
  const item = findCartItem(id);
  if (!item) return;

  item.quantity = (Number(item.quantity) || 0) + delta;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(cartItem => String(cartItem.id) !== String(id));
  }

  updateCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => String(item.id) !== String(id));
  updateCart();
}

function renderCartItem(item) {
  const originalPrice = Number(item.originalPrice) || Number(item.price) || 0;
  const price = Number(item.price) || 0;
  const discounted = originalPrice > price;
  const image = normalizeImageUrl(item.image) || CONFIG.placeholderImage;

  return `
    <div class="cart-line">
      <img
        src="${escapeHtml(image)}"
        alt="${escapeHtml(item.name)}"
        loading="lazy"
        onerror="this.onerror=null;this.src='${CONFIG.placeholderImage}'"
      >
      <div class="cart-line-info">
        <p class="cat">${escapeHtml(item.category || "")}</p>
        <h4>${escapeHtml(item.name)}</h4>
        <p class="price">
          ${discounted ? `<span class="price-old">${formatPrice(originalPrice)}</span>` : ""}
          <span class="price-current">${formatPrice(price)}</span>
        </p>
        <div class="qty">
          <button type="button" data-action="qty" data-id="${escapeHtml(item.id)}" data-delta="-1">−</button>
          <span>${Number(item.quantity) || 1}</span>
          <button type="button" data-action="qty" data-id="${escapeHtml(item.id)}" data-delta="1">+</button>
        </div>
      </div>
      <button type="button" class="remove-item" data-action="remove" data-id="${escapeHtml(item.id)}">×</button>
    </div>
  `;
}

function renderCart() {
  const container = $("#cart-items, .cart-items, [data-cart-items]");
  if (container) {
    container.innerHTML = state.cart.length
      ? state.cart.map(renderCartItem).join("")
      : '<p class="cart-empty">Your bag is currently empty.</p>';
  }

  const count = getCartCount();
  ["#cart-count", ".cart-count", "[data-cart-count]"].forEach(selector => {
    $$(selector).forEach(element => {
      element.textContent = count;
      element.classList.toggle("has-items", count > 0);
    });
  });

  const total = formatPrice(getCartTotal());
  ["#cart-total", ".cart-total", "[data-cart-total]"].forEach(selector => {
    $$(selector).forEach(element => {
      element.textContent = total;
    });
  });

  $$('[data-checkout], #checkout-button, #checkout, .checkout-button').forEach(button => {
    button.disabled = state.cart.length === 0;
  });
}

function openCart() {
  const overlay = $("#cart-overlay, #cart-drawer, .cart-drawer, [data-cart-drawer]");
  if (!overlay) return;
  lastFocusedElement = document.activeElement;
  renderCart();
  overlay.classList.add("is-open", "open");
  document.body.classList.add("is-locked");
}

function closeCart() {
  const overlay = $("#cart-overlay, #cart-drawer, .cart-drawer, [data-cart-drawer]");
  if (!overlay) return;
  overlay.classList.remove("is-open", "open");
  document.body.classList.remove("is-locked");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function checkout() {
  if (!state.cart.length) return;

  const orderLines = state.cart.map(item => {
    const regularPrice = Number(item.originalPrice) || Number(item.price) || 0;
    const currentPrice = Number(item.price) || 0;
    const priceText = regularPrice > currentPrice
      ? `${formatPrice(regularPrice)} -> ${formatPrice(currentPrice)}`
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

  const checkoutUrl = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
  window.open(checkoutUrl, "_blank", "noopener,noreferrer");
}

function setupSlider() {
  slider.el = $("#hero-slider-image");
  if (!slider.el) return;

  const catalogImages = state.products.map(product => normalizeImageUrl(product.image)).filter(Boolean);
  const driveImages = Object.values(state.driveImages).flat().map(item => item && normalizeImageUrl(item.url || item.image)).filter(Boolean);

  slider.slides = [...new Set(catalogImages.length ? catalogImages : driveImages)];

  const total = $("#hero-slide-total");
  const current = $("#hero-slide-current");

  if (total) total.textContent = pad(Math.max(slider.slides.length, 1));
  if (!slider.slides.length) {
    slider.el.src = CONFIG.placeholderImage;
    if (current) current.textContent = "01";
    return;
  }

  slider.index = 0;
  slider.el.src = slider.slides[0];
  if (current) current.textContent = "01";

  startSlider();
}

function showSlide(index) {
  if (!slider.el || slider.slides.length < 2) return;
  slider.index = (index + slider.slides.length) % slider.slides.length;
  slider.el.src = slider.slides[slider.index];
}

function startSlider() {
  if (slider.timer || slider.slides.length < 2 || reduceMotion.matches || document.hidden) return;
  slider.timer = setInterval(() => showSlide(slider.index + 1), CONFIG.slideInterval);
}

function stopSlider() {
  clearInterval(slider.timer);
  slider.timer = null;
}

function setContactLinks() {
  $$("[data-wa]").forEach(link => { link.href = `https://wa.me/${CONFIG.whatsapp}`; });
  $$("[data-tel]").forEach(link => { link.href = `tel:+${CONFIG.whatsapp}`; });
  $$("[data-ig]").forEach(link => { link.href = CONFIG.instagram; });
}

function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionElement = target.closest("[data-action]");
    if (actionElement) {
      const action = actionElement.dataset.action;
      const id = actionElement.dataset.id;

      if (action === "add") { addToCart(id); return; }
      if (action === "qty") { changeQuantity(id, Number(actionElement.dataset.delta)); return; }
      if (action === "remove") { removeFromCart(id); return; }
      if (action === "checkout") { checkout(); return; }
      if (action === "close-cart") { closeCart(); return; }
      if (action === "open-cart") { openCart(); return; }
      if (action === "filter") { setFilter(actionElement.dataset.filter || "all"); return; }
      if (action === "continue") { closeCart(); setFilter("all"); return; }
    }
  });
}

async function init() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  bindEvents();
  setContactLinks();
  loadCart();
  renderCart();

  const data = await fetchCatalog();
  state.products = data && Array.isArray(data.catalog)
    ? data.catalog.filter(product => product && product.id && product.name).map(product => ({
        ...product,
        image: normalizeImageUrl(product.image)
      }))
    : [];

  state.driveImages = data && data.products && typeof data.products === "object" ? data.products : {};

  updateSavedCartPrices();
  renderCategoryFilters();
  renderProducts();
  renderCart();
  setupSlider();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
