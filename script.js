/* =========================================
   REBEL VELVET | STOREFRONT
   Catalog (Google Sheet) + hero slider + bag + WhatsApp checkout
   ========================================= */

"use strict";

const CONFIG = {
  brand: "Rebel Velvet",
  currency: "EGP",
  whatsapp: "201092542461",              // digits only, country code first
  instagram: "https://www.instagram.com/", // TODO: replace with your handle, e.g. https://www.instagram.com/rebelvelvet
  catalogApi:
    "https://script.google.com/macros/s/AKfycbzWgJUpdKAt0rLBIq69-e0ZqQmQsWG3b0z6OYbFnEd8UJQa5SNg0TfLvUZdqFazvleo/exec",
  storageKey: "rebelVelvetCart",         // kept the same so saved bags survive the redesign
  slideInterval: 4000,
  placeholderImage: "https://placehold.co/800x1000/f1dfd8/6d1f2b?text=Rebel+Velvet",
};

const state = {
  products: [],
  driveImages: {},
  cart: [],
  filter: "all",
};

const slider = { el: null, slides: [], index: 0, timer: null };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- Helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

//const ESC = { "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" };
const ESC = { "&": "\x26amp;", "<": "\x26lt;", ">": "\x26gt;", '"': "\x26quot;", "'": "\x26#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const price = (amount) => `${CONFIG.currency} ${priceFormat.format(Number(amount) || 0)}`;

const pad = (n) => String(n).padStart(2, "0");
const sameKey = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/* ---------- Catalog (JSONP from Google Apps Script) ---------- */

function fetchCatalog() {
  return new Promise((resolve) => {
    const callbackName = `rvCb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement("script");
    let finished = false;
    let timer = null;

    const finish = (data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
      resolve(data && data.success ? data : null);
    };

    window[callbackName] = finish;
    script.onerror = () => finish(null);
    timer = setTimeout(() => finish(null), 12000);

    script.src = `${CONFIG.catalogApi}?callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

/* ---------- Hero slider ---------- */

function setupSlider() {
  slider.el = $("#hero-slider-image");

  const fromCatalog = state.products.map((p) => p.image).filter(Boolean);
  const fromDrive = Object.values(state.driveImages)
    .flat()
    .map((img) => img && img.url)
    .filter(Boolean);

  const source = fromCatalog.length ? fromCatalog : fromDrive;
  slider.slides = [...new Set(source)];

  $("#hero-slide-total").textContent = pad(Math.max(slider.slides.length, 1));

  if (!slider.slides.length) {
    slider.el.src = CONFIG.placeholderImage;
    return;
  }

  slider.el.src = slider.slides[0];
  $("#hero-slide-current").textContent = pad(1);

  $(".hero-frame").addEventListener("mouseenter", stopSlider);
  $(".hero-frame").addEventListener("mouseleave", startSlider);
  startSlider();
}

function showSlide(i) {
  const { el, slides } = slider;
  if (slides.length < 2) return;

  slider.index = (i + slides.length) % slides.length;
  const next = slides[slider.index];

  el.classList.add("is-fading");

  const preload = new Image();
  const reveal = () => {
    setTimeout(() => {
      el.src = next;
      el.classList.remove("is-fading");
    }, 350);
  };
  preload.onload = reveal;
  preload.onerror = reveal;
  preload.src = next;

  $("#hero-slide-current").textContent = pad(slider.index + 1);
}

function startSlider() {
  if (slider.timer || slider.slides.length < 2 || reduceMotion.matches) return;
  slider.timer = setInterval(() => showSlide(slider.index + 1), CONFIG.slideInterval);
}

function stopSlider() {
  clearInterval(slider.timer);
  slider.timer = null;
}

/* ---------- Products ---------- */

function visibleProducts() {
  if (state.filter === "all") return state.products;
  return state.products.filter((p) => sameKey(p.category, state.filter));
}

function renderProducts() {
  const grid = $("#products");
  const list = visibleProducts();

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty">
        <span aria-hidden="true">✦</span>
        <h3>Coming soon</h3>
        <p>New pieces are on their way.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
      <article class="product-card">
        <div class="product-media">
          [${esc\(p.image](${esc%28p.image)
        </div>
        <div class="product-body">
          <p class="product-cat">${esc(p.category)}</p>
          <h3 class="product-name">${esc(p.name)}</h3>
          <p class="product-price">${price(p.price)}</p>
          <button class="btn btn-outline" data-action="add" data-id="${esc(p.id)}">Add to bag</button>
        </div>
      </article>`
    )
    .join("");
}

function setFilter(category) {
  state.filter = category;
  $$(".filter-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.filter === category));
  });
  $("#shop-title").textContent = category === "all" ? "Find your favorite" : category;
  renderProducts();
}

/* ---------- Bag ---------- */

const findProduct = (id) => state.products.find((p) => String(p.id) === String(id));
const findLine = (id) => state.cart.find((l) => String(l.id) === String(id));
const cartCount = () => state.cart.reduce((sum, l) => sum + l.quantity, 0);
const cartTotal = () => state.cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
    state.cart = Array.isArray(saved) ? saved : [];
  } catch {
    state.cart = [];
  }
}

function persistCart() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.cart));
  } catch {
    /* storage unavailable (private mode): bag still works for this visit */
  }
}

function commitCart() {
  persistCart();
  renderCart();
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;

  const line = findLine(id);
  if (line) {
    line.quantity += 1;
  } else {
    state.cart.push({
      id: String(product.id),
      name: product.name,
      category: product.category,
      price: Number(product.price) || 0,
      image: product.image || CONFIG.placeholderImage,
      quantity: 1,
    });
  }

  commitCart();
  openCart();
}

function changeQuantity(id, delta) {
  const line = findLine(id);
  if (!line) return;

  line.quantity += delta;
  if (line.quantity <= 0) {
    state.cart = state.cart.filter((l) => l !== line);
  }
  commitCart();
}

function removeLine(id) {
  state.cart = state.cart.filter((l) => String(l.id) !== String(id));
  commitCart();
}

function renderCart() {
  const count = cartCount();
  $("#cart-count").textContent = count;
  $("#cart-total").textContent = price(cartTotal());
  $("#checkout").disabled = count === 0;

  const box = $("#cart-items");

  if (!state.cart.length) {
    box.innerHTML = `
      <div class="cart-empty">
        <span aria-hidden="true">♡</span>
        <p>Your bag is empty.</p>
      </div>`;
    return;
  }

  box.innerHTML = state.cart
    .map(
      (l) => `
      <div class="cart-line">
        [${esc\(l.image\)}](${esc%28l.image%29})
        <div>
          <p class="cat">${esc(l.category)}</p>
          <h4>${esc(l.name)}</h4>
          <p class="price">${price(l.price)}</p>
          <div class="qty">
            <button data-action="qty" data-id="${esc(l.id)}" data-delta="-1" aria-label="Decrease quantity">−</button>
            <span>${l.quantity}</span>
            <button data-action="qty" data-id="${esc(l.id)}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove" data-action="remove" data-id="${esc(l.id)}">Remove</button>
        </div>
      </div>`
    )
    .join("");
}

/* ---------- Drawer & menu ---------- */

let lastFocus = null;

function openCart() {
  lastFocus = document.activeElement;
  renderCart();
  $("#cart-overlay").classList.add("is-open");
  document.body.classList.add("is-locked");
  $("#close-cart").focus();
}

function closeCart() {
  const overlay = $("#cart-overlay");
  if (!overlay.classList.contains("is-open")) return;

  overlay.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

function setMenu(open) {
  $(".site-header").classList.toggle("nav-open", open);
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
}

/* ---------- Checkout (WhatsApp) ---------- */

function checkout() {
  if (!state.cart.length) return;

  const lines = state.cart.map(
    (l) => `• ${l.name} × ${l.quantity} = ${price(l.price * l.quantity)}`
  );

  const message = [
    `Hello ${CONFIG.brand}! I'd like to place an order:`,
    "",
    ...lines,
    "",
    `Total: ${price(cartTotal())}`,
    "",
    "Name:",
    "Phone:",
    "Address:",
  ].join("\n");

  window.open(
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener"
  );
}

/* ---------- Click actions (event delegation) ---------- */

const ACTIONS = {
  add: (el) => addToCart(el.dataset.id),
  qty: (el) => changeQuantity(el.dataset.id, Number(el.dataset.delta)),
  remove: (el) => removeLine(el.dataset.id),

  filter: (el) => {
    setFilter(el.dataset.filter);
    if (el.closest(".cat-grid")) {
      $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },

  "open-cart": () => openCart(),
  "close-cart": () => closeCart(),
  continue: () => {
    closeCart();
    setFilter("all");
    $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
  },
  checkout: () => checkout(),
  menu: () => setMenu(!$(".site-header").classList.contains("nav-open")),
};

function bindEvents() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (el && ACTIONS[el.dataset.action]) {
      ACTIONS[el.dataset.action](el);
      return;
    }

    if (e.target.id === "cart-overlay") closeCart();
    if (e.target.closest(".nav-links a")) setMenu(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      setMenu(false);
    }
  });

  // Swap any broken image (product or hero) for the brand placeholder, once.
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && !img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = CONFIG.placeholderImage;
      }
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSlider();
    else startSlider();
  });

  window.addEventListener(
    "scroll",
    () => $(".site-header").classList.toggle("is-scrolled", window.scrollY > 24),
    { passive: true }
  );
}

function setLinks() {
  $$("[data-wa]").forEach((a) => (a.href = `https://wa.me/${CONFIG.whatsapp}`));
  $$("[data-tel]").forEach((a) => (a.href = `tel:+${CONFIG.whatsapp}`));
  $$("[data-ig]").forEach((a) => (a.href = CONFIG.instagram));
}

/* ---------- Init ---------- */

async function init() {
  $("#year").textContent = new Date().getFullYear();

  bindEvents();
  setLinks();
  loadCart();
  renderCart();

  const data = await fetchCatalog();
  state.products = data && Array.isArray(data.catalog)
    ? data.catalog.filter((p) => p && p.id && p.name)
    : [];
  state.driveImages = data && data.products ? data.products : {};

  renderProducts();
  setupSlider();
}

init();
