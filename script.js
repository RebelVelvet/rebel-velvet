```javascript
/* =========================================================
   REBEL VELVET | STOREFRONT
   Google Sheets catalog + sale prices + cart + WhatsApp
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

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

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
  maximumFractionDigits: 2
});

function formatPrice(amount) {
  return `${CONFIG.currency} ${priceFormat.format(
    Number(amount) || 0
  )}`;
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

/* ---------- Image URLs ---------- */

function normalizeImageUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  // Convert Google Drive file links into thumbnail links.
  const fileMatch = value.match(
    /drive\.google\.com\/file\/d\/([^/?]+)/i
  );

  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
  }

  // Handle Google Drive open?id=FILE_ID links.
  const idMatch = value.match(/[?&]id=([^&]+)/i);

  if (
    value.includes("drive.google.com") &&
    idMatch &&
    !value.includes("/thumbnail")
  ) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
  }

  return value;
}

function getProductImage(product) {
  return (
    normalizeImageUrl(
      product.image ||
      product.imageUrl ||
      product.url ||
      ""
    ) || CONFIG.placeholderImage
  );
}

/* ---------- Sale Prices ---------- */

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
    return `
      <span class="price-current">
        ${formatPrice(product.price)}
      </span>
    `;
  }

  return `
    <span class="price-old">
      ${formatPrice(product.price)}
    </span>

    <span class="price-current">
      ${formatPrice(salePrice)}
    </span>

    <span class="sale-badge">SALE</span>
  `;
}

/* ---------- Load Google Sheets Catalog ---------- */

function fetchCatalog() {
  return new Promise(resolve => {
    const callbackName =
      `rvCb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const script = document.createElement("script");
    let finished = false;

    const timeoutId = setTimeout(() => {
      finish(null);
    }, 15000);

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
        console.log(
          "REBEL VELVET catalog loaded:",
          data.catalog
        );

        resolve(data);
      } else {
        console.error(
          "REBEL VELVET catalog returned an invalid response:",
          data
        );

        resolve(null);
      }
    }

    window[callbackName] = finish;

    script.onerror = () => {
      console.error(
        "REBEL VELVET: failed to load the Google Apps Script API.",
        script.src
      );

      finish(null);
    };

    // IMPORTANT:
    // Use template literals so the callback name is inserted correctly.
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

  const filterContainers = [
    $("#product-filters"),
    $(".product-filters"),
    $("[data-product-filters]"),
    $("#filter-bar"),
    $(".filter-bar")
  ].filter(Boolean);

  filterContainers.forEach(container => {
    container.innerHTML = `
      <button
        type="button"
        class="filter-btn ${
          state.filter === "all" ? "active is-active" : ""
        }"
        data-filter="all"
        aria-pressed="${state.filter === "all"}"
      >
        All products
      </button>

      ${categories.map(category => `
        <button
          type="button"
          class="filter-btn ${
            sameKey(state.filter, category)
              ? "active is-active"
              : ""
          }"
          data-filter="${escapeHtml(category)}"
          aria-pressed="${sameKey(state.filter, category)}"
        >
          ${escapeHtml(category)}
        </button>
      `).join("")}
    `;
  });

  // Update the existing category cards if present.
  const categoryGrid = $(
    "#category-grid, .category-grid, .cat-grid, [data-category-grid]"
  );

  if (categoryGrid) {
    const existingCards = $$(".cat-card", categoryGrid);

    // Preserve original category cards and their existing design.
    // Only update their filter behavior when possible.
    existingCards.forEach(card => {
      const label = (
        card.dataset.filter ||
        card.textContent ||
        ""
      ).trim();

      const matchingCategory = categories.find(category =>
        sameKey(category, label)
      );

      if (matchingCategory) {
        card.dataset.filter = matchingCategory;
        card.dataset.action = "filter";
      }
    });
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

  const title = $("#shop-title");

  if (title) {
    title.textContent =
      state.filter === "all"
        ? "Find your favorite"
        : state.filter;
  }
}

/* ---------- Render Products ---------- */

function renderProducts() {
  const grid = $("#products");

  if (!grid) {
    console.error(
      'REBEL VELVET: product grid "#products" was not found.'
    );
    return;
  }

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
    const imageUrl = getProductImage(product);

    return `
      <article class="product-card">

        <div class="product-media">
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${escapeHtml(product.name || "REBEL VELVET product")}"
            loading="lazy"
            onerror="this.onerror=null;this.src='${CONFIG.placeholderImage}'"
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
            ${escapeHtml(product.name || "")}
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
  } catch (error) {
    state.cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify(state.cart)
    );
  } catch (error) {
    console.warn("Could not save the cart in local storage.");
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
      image: getProductImage(product),
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product)
    };
  });

  saveCart();
}

/* ---------- Cart Actions ---------- */

function addToCart(id) {
  const product = findProduct(id);

  if (!product) return;

  const existingItem = findCartItem(id);

  if (existingItem) {
    existingItem.quantity =
      (Number(existingItem.quantity) || 0) + 1;

    existingItem.price = getEffectivePrice(product);
    existingItem.originalPrice = Number(product.price) || 0;
  } else {
    state.cart.push({
      id: String(product.id),
      name: product.name,
      category: product.category || "",
      image: getProductImage(product),
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product),
      quantity: 1
    });
  }

  updateCart();
  openCart();
}

function changeQuantity(id, change) {
  const item = findCartItem(id);

  if (!item) return;

  item.quantity = (Number(item.quantity) || 0) + change;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(cartItem =>
      String(cartItem.id) !== String(id)
    );
  }

  updateCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item =>
    String(item.id) !== String(id)
  );

  updateCart();
}

function getCartCount() {
  return state.cart.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );
}

function getCartTotal() {
  return state.cart.reduce(
    (total, item) =>
      total +
      (Number(item.price) || 0) *
      (Number(item.quantity) || 0),
    0
  );
}

/* ---------- Render Cart ---------- */

function renderCartItem(item) {
  const originalPrice =
    Number(item.originalPrice) || Number(item.price) || 0;

  const price = Number(item.price) || 0;
  const hasDiscount = originalPrice > price;

  return `
    <div class="cart-line">

      <img
        src="${escapeHtml(
          normalizeImageUrl(item.image) || CONFIG.placeholderImage
        )}"
        alt="${escapeHtml(item.name || "")}"
        loading="lazy"
        onerror="this.onerror=null;this.src='${CONFIG.placeholderImage}'"
      >

      <div class="cart-line-info">

        <p class="cat">
          ${escapeHtml(item.category || "")}
        </p>

        <h4>${escapeHtml(item.name || "")}</h4>

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
          >−</button>

          <span>${Number(item.quantity) || 1}</span>

          <button
            type="button"
            data-action="qty"
            data-id="${escapeHtml(item.id)}"
            data-delta="1"
            aria-label="Increase quantity"
          >+</button>

        </div>
      </div>

      <button
        type="button"
        class="remove-item"
        data-action="remove"
        data-id="${escapeHtml(item.id)}"
        aria-label="Remove ${escapeHtml(item.name || "product")}"
      >
        ×
      </button>

    </div>
  `;
}

function renderCart() {
  const itemsContainer = $(
    "#cart-items, .cart-items, [data-cart-items]"
  );

  const countElements = $$("#cart-count, .cart-count, [data-cart-count]");

  const totalElements = $$("#cart-total, .cart-total, [data-cart-total]");

  const checkoutButtons = $$(
    "[data-checkout], #checkout-button, #checkout, .checkout-button"
  );

  countElements.forEach(element => {
    element.textContent = getCartCount();
  });

  totalElements.forEach(element => {
    element.textContent = formatPrice(getCartTotal());
  });

  checkoutButtons.forEach(button => {
    button.disabled = state.cart.length === 0;
  });

  if (!itemsContainer) return;

  itemsContainer.innerHTML = state.cart.length
    ? state.cart.map(renderCartItem).join("")
    : `
      <div class="cart-empty">
        <span aria-hidden="true">♡</span>
        <p>Your bag is empty.</p>
      </div>
    `;
}

function updateCart() {
  saveCart();
  renderCart();
}

/* ---------- Open and Close Cart ---------- */

let lastFocusedElement = null;

function getCartOverlay() {
  return $(
    "#cart-overlay, #cart-drawer, .cart-drawer, [data-cart-drawer]"
  );
}

function openCart() {
  const overlay = getCartOverlay();

  if (!overlay) return;

  lastFocusedElement = document.activeElement;

  renderCart();

  overlay.classList.add("is-open", "open");
  overlay.setAttribute("aria-hidden", "false");

  document.body.classList.add("is-locked");

  const closeButton = $(
    "#close-cart, #cart-close, [data-cart-close]"
  );

  if (closeButton) closeButton.focus();
}

function closeCart() {
  const overlay = getCartOverlay();

  if (!overlay) return;

  overlay.classList.remove("is-open", "open");
  overlay.setAttribute("aria-hidden", "true");

  document.body.classList.remove("is-locked");

  if (
    lastFocusedElement &&
    typeof lastFocusedElement.focus === "function"
  ) {
    lastFocusedElement.focus();
  }
}

/* ---------- WhatsApp Checkout ---------- */

function checkout() {
  if (!state.cart.length) return;

  const orderLines = state.cart.map(item => {
    const originalPrice =
      Number(item.originalPrice) || Number(item.price) || 0;

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

  const checkoutUrl =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;

  window.open(checkoutUrl, "_blank", "noopener,noreferrer");
}

/* ---------- Hero Slider ---------- */

function setupSlider() {
  slider.el = $("#hero-slider-image");

  if (!slider.el) return;

  const catalogImages = state.products
    .map(product => normalizeImageUrl(product.image))
    .filter(Boolean);

  const driveImages = Object.values(state.driveImages)
    .flat()
    .map(image =>
      image && normalizeImageUrl(image.url || image.image)
    )
    .filter(Boolean);

  slider.slides = [
    ...new Set(
      catalogImages.length ? catalogImages : driveImages
    )
  ];

  const total = $("#hero-slide-total");
  const current = $("#hero-slide-current");

  if (total) {
    total.textContent = pad(Math.max(slider.slides.length, 1));
  }

  if (!slider.slides.length) {
    slider.el.src = CONFIG.placeholderImage;

    if (current) current.textContent = "01";

    return;
  }

  slider.index = 0;
  slider.el.src = slider.slides[0];

  if (current) current.textContent = "01";

  const frame = $(".hero-frame");

  if (frame && !frame.dataset.sliderEventsBound) {
    frame.dataset.sliderEventsBound = "true";

    frame.addEventListener("mouseenter", stopSlider);
    frame.addEventListener("mouseleave", startSlider);
  }

  startSlider();
}

function showSlide(index) {
  if (!slider.el || slider.slides.length < 2) return;

  slider.index =
    (index + slider.slides.length) % slider.slides.length;

  const nextImage = slider.slides[slider.index];
  const preload = new Image();

  slider.el.classList.add("is-fading");

  preload.onload = () => {
    slider.el.src = nextImage;
    slider.el.classList.remove("is-fading");
  };

  preload.onerror = () => {
    slider.el.classList.remove("is-fading");
  };

  preload.src = nextImage;

  const current = $("#hero-slide-current");

  if (current) {
    current.textContent = pad(slider.index + 1);
  }
}

function startSlider() {
  if (
    slider.timer ||
    slider.slides.length < 2 ||
    reduceMotion.matches ||
    document.hidden
  ) {
    return;
  }

  slider.timer = setInterval(
    () => showSlide(slider.index + 1),
    CONFIG.slideInterval
  );
}

function stopSlider() {
  clearInterval(slider.timer);
  slider.timer = null;
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
  const menuButton = $("#menu-toggle");

  if (!header || !menuButton) return;

  header.classList.toggle("nav-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

/* ---------- Click Actions ---------- */

const ACTIONS = {
  add: element => addToCart(element.dataset.id),

  qty: element => {
    changeQuantity(
      element.dataset.id,
      Number(element.dataset.delta)
    );
  },

  remove: element => removeFromCart(element.dataset.id),

  filter: element => {
    setFilter(element.dataset.filter || "all");

    if (element.closest(".cat-grid, .category-grid, #category-grid")) {
      $("#shop, #products")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  },

  "open-cart": () => openCart(),

  "close-cart": () => closeCart(),

  continue: () => {
    closeCart();
    setFilter("all");

    $("#shop, #products")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  },

  checkout: () => checkout(),

  menu: () => {
    const header = $(".site-header");

    if (header) {
      setMenu(!header.classList.contains("nav-open"));
    }
  }
};

function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const actionElement = target.closest("[data-action]");

    if (
      actionElement &&
      ACTIONS[actionElement.dataset.action]
    ) {
      ACTIONS[actionElement.dataset.action](actionElement);
      return;
    }

    const filterElement = target.closest("[data-filter]");

    if (filterElement) {
      setFilter(filterElement.dataset.filter || "all");
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
        "[data-cart-close], #cart-close, .cart-close, #close-cart"
      )
    ) {
      closeCart();
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

    if (target.closest("#menu-toggle")) {
      const header = $(".site-header");

      setMenu(
        !(header && header.classList.contains("nav-open"))
      );

      return;
    }

    if (target.closest(".nav-links a")) {
      setMenu(false);
    }

    if (target.id === "cart-overlay") {
      closeCart();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeCart();
      setMenu(false);
    }
  });

  document.addEventListener(
    "error",
    event => {
      const image = event.target;

      if (
        image instanceof HTMLImageElement &&
        !image.dataset.fallback
      ) {
        image.dataset.fallback = "1";
        image.src = CONFIG.placeholderImage;
      }
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSlider();
    } else {
      startSlider();
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
      ? data.catalog
          .filter(product =>
            product &&
            product.id &&
            product.name
          )
          .map(product => ({
            ...product,
            image: normalizeImageUrl(product.image || "")
          }))
      : [];

  state.driveImages =
    data &&
    data.products &&
    typeof data.products === "object"
      ? data.products
      : {};

  updateSavedCartPrices();
  renderCategoryFilters();
  renderProducts();
  renderCart();
  setupSlider();

  const status = $("#catalog-status, [data-catalog-status]");

  if (status) {
    status.textContent = state.products.length
      ? ""
      : "Products could not be loaded. Please refresh the page.";

    status.hidden = state.products.length > 0;
  }

  if (!state.products.length) {
    console.error(
      "REBEL VELVET: no products loaded. Check the API URL and Google Apps Script deployment."
    );
  }
}

/* ---------- Start ---------- */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```
