```javascript
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

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
    return HTML_ENTITIES[character];
  });
}

function formatPrice(amount) {
  return CONFIG.currency + " " +
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

function sameKey(first, second) {
  return String(first == null ? "" : first).trim().toLowerCase() ===
    String(second == null ? "" : second).trim().toLowerCase();
}

function normalizeImageUrl(url) {
  var value = String(url || "").trim();

  if (!value) return "";

  var fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);

  if (fileMatch) {
    return "https://drive.google.com/thumbnail?id=" +
      fileMatch[1] + "&sz=w1000";
  }

  var openMatch = value.match(/[?&]id=([^&]+)/i);

  if (
    value.indexOf("drive.google.com") !== -1 &&
    openMatch &&
    value.indexOf("/thumbnail") === -1
  ) {
    return "https://drive.google.com/thumbnail?id=" +
      openMatch[1] + "&sz=w1000";
  }

  return value;
}

/* SALE PRICES */

function getSalePrice(product) {
  var regularPrice = Number(product.price);
  var salePrice = Number(product.salePrice);

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
  var salePrice = getSalePrice(product);
  return salePrice !== null ? salePrice : (Number(product.price) || 0);
}

function renderProductPrice(product) {
  var salePrice = getSalePrice(product);

  if (salePrice === null) {
    return '<span class="price-current">' +
      formatPrice(product.price) + '</span>';
  }

  return '<span class="price-old">' + formatPrice(product.price) + '</span>' +
    '<span class="price-current">' + formatPrice(salePrice) + '</span>' +
    '<span class="sale-badge">SALE</span>';
}

/* LOAD CATALOG */

function fetchCatalog() {
  return new Promise(function (resolve) {
    var callbackName = "rvCb_" + Date.now() + "_" +
      Math.random().toString(36).slice(2, 8);

    var script = document.createElement("script");
    var finished = false;

    var timeoutId = setTimeout(function () {
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

      if (data && data.success) {
        console.log("REBEL VELVET catalog loaded:", data);
        resolve(data);
      } else {
        console.error("Catalog loading failed:", data);
        resolve(null);
      }
    }

    window[callbackName] = finish;

    script.onerror = function () {
      console.error("Could not load catalog API.");
      finish(null);
    };

    script.src = CONFIG.catalogApi +
      "?callback=" + callbackName +
      "&t=" + Date.now();

    document.head.appendChild(script);
  });
}

/* CATEGORIES */

function getCategories() {
  var categories = [];

  state.products.forEach(function (product) {
    var category = String(product.category || "").trim();

    if (
      category &&
      !categories.some(function (item) {
        return sameKey(item, category);
      })
    ) {
      categories.push(category);
    }
  });

  return categories;
}

function renderCategoryFilters() {
  var categories = getCategories();

  var containers = [
    $("#product-filters"),
    $(".product-filters"),
    $("[data-product-filters]"),
    $("#filter-bar"),
    $(".filter-bar")
  ].filter(Boolean);

  var categoryButtons = categories.map(function (category) {
    var active = sameKey(state.filter, category);

    return '<button type="button" class="filter-btn' +
      (active ? ' is-active active' : '') +
      '" data-filter="' + escapeHtml(category) + '">' +
      escapeHtml(category) + '</button>';
  }).join("");

  containers.forEach(function (container) {
    container.innerHTML =
      '<button type="button" class="filter-btn' +
      (state.filter === "all" ? ' is-active active' : '') +
      '" data-filter="all">All products</button>' +
      categoryButtons;
  });

  var categoryContainer = $(
    "#category-grid, .category-grid, .cat-grid, [data-category-grid]"
  );

  if (categoryContainer) {
    categoryContainer.innerHTML = categories.map(function (category) {
      return '<button type="button" class="cat-card category-card" ' +
        'data-action="filter" data-filter="' +
        escapeHtml(category) + '">' +
        '<span>' + escapeHtml(category) + '</span></button>';
    }).join("");
  }
}

function getVisibleProducts() {
  if (state.filter === "all") return state.products;

  return state.products.filter(function (product) {
    return sameKey(product.category, state.filter);
  });
}

function setFilter(category) {
  state.filter = category || "all";
  renderCategoryFilters();
  renderProducts();
}

/* PRODUCTS */

function renderProducts() {
  var grid = $("#products");

  if (!grid) {
    console.error('Could not find the products container: #products');
    return;
  }

  var products = getVisibleProducts();

  if (!products.length) {
    grid.innerHTML =
      '<div class="empty">' +
      '<span aria-hidden="true">✦</span>' +
      '<h3>Coming soon</h3>' +
      '<p>New pieces are on their way.</p>' +
      '</div>';
    return;
  }

  grid.innerHTML = products.map(function (product) {
    var image = normalizeImageUrl(product.image) ||
      CONFIG.placeholderImage;

    var saleLabel = getSalePrice(product) !== null
      ? '<span class="product-sale-label">SALE</span>'
      : "";

    return '<article class="product-card">' +
      '<div class="product-media">' +
      '<img src="' + escapeHtml(image) + '" ' +
      'alt="' + escapeHtml(product.name) + '" loading="lazy" ' +
      'onerror="this.onerror=null;this.src=\'' +
      CONFIG.placeholderImage + '\'">' +
      saleLabel +
      '</div>' +
      '<div class="product-body">' +
      '<p class="product-cat">' +
      escapeHtml(product.category || "") + '</p>' +
      '<h3 class="product-name">' +
      escapeHtml(product.name) + '</h3>' +
      '<p class="product-price">' +
      renderProductPrice(product) + '</p>' +
      '<button class="btn btn-outline" type="button" ' +
      'data-action="add" data-id="' +
      escapeHtml(product.id) + '">Add to bag</button>' +
      '</div></article>';
  }).join("");

  renderCart();
}

/* CART STORAGE */

function loadCart() {
  try {
    var savedCart = JSON.parse(
      localStorage.getItem(CONFIG.storageKey) || "[]"
    );

    state.cart = Array.isArray(savedCart)
      ? savedCart.filter(function (item) {
          return item &&
            item.id !== undefined &&
            Number(item.quantity) > 0;
        })
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
    // Keep the cart available during the current visit.
  }
}

function findProduct(id) {
  return state.products.find(function (product) {
    return String(product.id) === String(id);
  });
}

function findCartItem(id) {
  return state.cart.find(function (item) {
    return String(item.id) === String(id);
  });
}

function updateSavedCartPrices() {
  state.cart = state.cart.map(function (item) {
    var product = findProduct(item.id);

    if (!product) return item;

    return Object.assign({}, item, {
      name: product.name,
      category: product.category,
      image: normalizeImageUrl(product.image) ||
        item.image || CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product)
    });
  });

  saveCart();
}

/* CART ACTIONS */

function addToCart(id) {
  var product = findProduct(id);
  if (!product) return;

  var existingItem = findCartItem(id);

  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.price = getEffectivePrice(product);
    existingItem.originalPrice = Number(product.price) || 0;
  } else {
    state.cart.push({
      id: String(product.id),
      name: product.name,
      category: product.category || "",
      image: normalizeImageUrl(product.image) ||
        CONFIG.placeholderImage,
      originalPrice: Number(product.price) || 0,
      price: getEffectivePrice(product),
      quantity: 1
    });
  }

  updateCart();
  openCart();
}

function changeQuantity(id, change) {
  var item = findCartItem(id);
  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(function (cartItem) {
      return String(cartItem.id) !== String(id);
    });
  }

  updateCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(function (item) {
    return String(item.id) !== String(id);
  });

  updateCart();
}

function getCartCount() {
  return state.cart.reduce(function (total, item) {
    return total + (Number(item.quantity) || 1);
  }, 0);
}

function getCartTotal() {
  return state.cart.reduce(function (total, item) {
    return total +
      (Number(item.price) || 0) *
      (Number(item.quantity) || 1);
  }, 0);
}

/* CART DISPLAY */

function renderCartItem(item) {
  var originalPrice =
    Number(item.originalPrice) || Number(item.price) || 0;

  var price = Number(item.price) || 0;
  var hasDiscount = originalPrice > price;

  return '<div class="cart-line">' +
    '<img src="' +
    escapeHtml(normalizeImageUrl(item.image) || CONFIG.placeholderImage) +
    '" alt="' + escapeHtml(item.name) + '" loading="lazy" ' +
    'onerror="this.onerror=null;this.src=\'' +
    CONFIG.placeholderImage + '\'">' +
    '<div class="cart-line-info">' +
    '<p class="cat">' + escapeHtml(item.category || "") + '</p>' +
    '<h4>' + escapeHtml(item.name) + '</h4>' +
    '<p class="price">' +
    (hasDiscount
      ? '<span class="price-old">' +
        formatPrice(originalPrice) + '</span>'
      : '') +
    '<span class="price-current">' + formatPrice(price) + '</span>' +
    '</p>' +
    '<div class="qty">' +
    '<button type="button" data-action="qty" data-id="' +
    escapeHtml(item.id) + '" data-delta="-1" ' +
    'aria-label="Decrease quantity">−</button>' +
    '<span>' + (Number(item.quantity) || 1) + '</span>' +
    '<button type="button" data-action="qty" data-id="' +
    escapeHtml(item.id) + '" data-delta="1" ' +
    'aria-label="Increase quantity">+</button>' +
    '</div></div>' +
    '<button type="button" class="remove-item" ' +
    'data-action="remove" data-id="' +
    escapeHtml(item.id) + '" aria-label="Remove item">×</button>' +
    '</div>';
}

function renderCart() {
  var itemsContainer = $("#cart-items, .cart-items, [data-cart-items]");

  if (itemsContainer) {
    itemsContainer.innerHTML = state.cart.length
      ? state.cart.map(renderCartItem).join("")
      : '<p class="cart-empty">Your bag is currently empty.</p>';
  }

  var count = getCartCount();
  var total = formatPrice(getCartTotal());

  ["#cart-count", ".cart-count", "[data-cart-count]"].forEach(function (selector) {
    $$(selector).forEach(function (element) {
      element.textContent = count;
      element.classList.toggle("has-items", count > 0);
    });
  });

  ["#cart-total", ".cart-total", "[data-cart-total]"].forEach(function (selector) {
    $$(selector).forEach(function (element) {
      element.textContent = total;
    });
  });

  $$("[data-checkout], #checkout-button, #checkout, .checkout-button")
    .forEach(function (button) {
      button.disabled = state.cart.length === 0;
    });
}

function updateCart() {
  saveCart();
  renderCart();
}

function openCart() {
  var drawer = $(
    "#cart-drawer, .cart-drawer, [data-cart-drawer], #cart-overlay"
  );

  if (!drawer) return;

  drawer.classList.add("is-open", "open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-locked");
}

function closeCart() {
  var drawer = $(
    "#cart-drawer, .cart-drawer, [data-cart-drawer], #cart-overlay"
  );

  if (!drawer) return;

  drawer.classList.remove("is-open", "open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-locked");
}

/* WHATSAPP CHECKOUT */

function checkout() {
  if (!state.cart.length) return;

  var orderLines = state.cart.map(function (item) {
    var originalPrice =
      Number(item.originalPrice) || Number(item.price);

    var currentPrice = Number(item.price) || 0;

    var priceText = originalPrice > currentPrice
      ? formatPrice(originalPrice) + " -> " + formatPrice(currentPrice)
      : formatPrice(currentPrice);

    return "• " + item.name + " x " + item.quantity + " = " + priceText;
  });

  var message = [
    "Hello " + CONFIG.brand + "! I'd like to place an order:",
    "",
    ...orderLines,
    "",
    "Total: " + formatPrice(getCartTotal()),
    "",
    "Name:",
    "Phone:",
    "Address:"
  ].join("\n");

  var whatsappUrl =
    "https://wa.me/" + CONFIG.whatsapp +
    "?text=" + encodeURIComponent(message);

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

/* HERO SLIDER */

function setupSlider() {
  slider.el = $("#hero-slider-image");
  if (!slider.el) return;

  var catalogImages = state.products
    .map(function (product) {
      return normalizeImageUrl(product.image);
    })
    .filter(Boolean);

  var driveImages = Object.values(state.driveImages)
    .reduce(function (all, items) {
      return all.concat(Array.isArray(items) ? items : []);
    }, [])
    .map(function (image) {
      return image && normalizeImageUrl(image.url || image.image);
    })
    .filter(Boolean);

  var images = catalogImages.length ? catalogImages : driveImages;
  slider.slides = Array.from(new Set(images));

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

  slider.timer = setInterval(function () {
    slider.index = (slider.index + 1) % slider.slides.length;
    slider.el.src = slider.slides[slider.index];
  }, CONFIG.slideInterval);
}

/* CONTACT LINKS */

function setContactLinks() {
  $$("[data-wa]").forEach(function (link) {
    link.href = "https://wa.me/" + CONFIG.whatsapp;
  });

  $$("[data-tel]").forEach(function (link) {
    link.href = "tel:+" + CONFIG.whatsapp;
  });

  $$("[data-ig]").forEach(function (link) {
    link.href = CONFIG.instagram;
  });
}

/* MOBILE NAVIGATION */

function setMenu(isOpen) {
  var header = $(".site-header");
  var button = $("#menu-toggle");

  if (!header || !button) return;

  header.classList.toggle("nav-open", isOpen);
  button.setAttribute("aria-expanded", String(isOpen));
}

/* EVENTS */

function bindEvents() {
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionElement = target.closest("[data-action]");

    if (actionElement) {
      var action = actionElement.dataset.action;
      var id = actionElement.dataset.id;

      if (action === "add") {
        addToCart(id);
        return;
      }

      if (action === "qty") {
        changeQuantity(id, Number(actionElement.dataset.delta));
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

      if (action === "open-cart") {
        openCart();
        return;
      }

      if (action === "menu") {
        var header = $(".site-header");
        setMenu(!(header && header.classList.contains("nav-open")));
        return;
      }
    }

    var filterElement = target.closest("[data-filter]");

    if (filterElement) {
      setFilter(filterElement.dataset.filter || "all");

      if (filterElement.closest(
        ".category-grid, #category-grid, .cat-grid, [data-category-grid]"
      )) {
        var productsElement = $("#products");

        if (productsElement) {
          productsElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }

      return;
    }

    if (target.closest(
      "[data-checkout], #checkout-button, #checkout, .checkout-button"
    )) {
      checkout();
      return;
    }

    if (target.closest("[data-cart-open], #cart-open, .cart-open")) {
      openCart();
      return;
    }

    if (target.closest("[data-cart-close], #cart-close, .cart-close")) {
      closeCart();
      return;
    }

    if (target.closest("#menu-toggle")) {
      var menuHeader = $(".site-header");
      setMenu(!(menuHeader && menuHeader.classList.contains("nav-open")));
      return;
    }

    if (target.closest(".site-header.nav-open a")) {
      setMenu(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeCart();
      setMenu(false);
    }
  });

  window.addEventListener("scroll", function () {
    var header = $(".site-header");

    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    }
  }, { passive: true });
}

/* INITIALIZE */

async function init() {
  var year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  bindEvents();
  setContactLinks();
  loadCart();
  renderCart();

  var data = await fetchCatalog();

  state.products = data && Array.isArray(data.catalog)
    ? data.catalog
        .filter(function (product) {
          return product && product.id && product.name;
        })
        .map(function (product) {
          return Object.assign({}, product, {
            image: normalizeImageUrl(product.image)
          });
        })
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

  var status = $("#catalog-status, [data-catalog-status]");

  if (status) {
    status.textContent = state.products.length
      ? ""
      : "Products could not be loaded. Please refresh the page.";

    status.hidden = state.products.length > 0;
  }

  if (!state.products.length) {
    console.warn(
      "No products loaded. Check the API response and Google Sheet."
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```
