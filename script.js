/*************************************************
 * REBEL VELVET
 * SHOP + FILTER + CART
 * GOOGLE SHEET PRODUCTS
 * UNIVERSAL HERO SLIDER
 *************************************************/


/* =========================================
   CONFIG
========================================= */

const WHATSAPP_NUMBER =
    "201092542461";


const API_URL =
    "https://script.google.com/macros/s/AKfycbzWgJUpdKAt0rLBIq69-e0ZqQmQsWG3b0z6OYbFnEd8UJQa5SNg0TfLvUZdqFazvleo/exec";


/* =========================================
   DATA
========================================= */

let products = [];

let productImages = {};

let cart = [];

let currentFilter = "all";


/* =========================================
   HERO SLIDER
========================================= */

let heroSliderImages = [];

let heroSliderIndex = 0;

let heroSliderTimer = null;

let heroSliderTransitionTimer = null;


/* =========================================
   LOAD WEBSITE DATA
========================================= */

function loadWebsiteData() {

    const script =
        document.createElement("script");


    const callbackName =
        "rebelVelvetCallback_" +
        Date.now();


    window[callbackName] =
        function(data) {


            console.log(
                "Rebel Velvet API:",
                data
            );


            if (
                data &&
                data.success
            ) {

                productImages =
                    data.products || {};


                products =
                    data.catalog || [];


                updateHeroImages();

                displayProducts();

            }

            else {

                products = [];

                updateHeroImages();

                displayProducts();

            }


            delete window[callbackName];

            script.remove();

        };


    script.onerror =
        function() {


            console.error(
                "Unable to load products."
            );


            products = [];

            updateHeroImages();

            displayProducts();


            delete window[callbackName];

            script.remove();

        };


    script.src =
        API_URL +
        "?callback=" +
        callbackName +
        "&t=" +
        Date.now();


    document.body.appendChild(
        script
    );

}


/* =========================================
   HERO IMAGES
========================================= */

function updateHeroImages() {

    heroSliderImages = [];


    /*
     * Use catalog images first
     */

    products.forEach(
        function(product) {

            if (
                product &&
                product.image
            ) {

                heroSliderImages.push(
                    product.image
                );

            }

        }
    );


    /*
     * Fallback to Google Drive
     */

    if (
        heroSliderImages.length === 0
    ) {

        Object.keys(productImages)
            .forEach(
                function(key) {

                    const images =
                        productImages[key] || [];


                    images.forEach(
                        function(image) {

                            if (
                                image &&
                                image.url
                            ) {

                                heroSliderImages.push(
                                    image.url
                                );

                            }

                        }
                    );

                }
            );

    }


    /*
     * Remove duplicate images
     */

    heroSliderImages =
        [...new Set(
            heroSliderImages
        )].filter(Boolean);


    startHeroSlider();

}


/* =========================================
   START HERO SLIDER
========================================= */

function startHeroSlider() {

    const sliderImage =
        document.getElementById(
            "hero-slider-image"
        );


    const sliderTotal =
        document.getElementById(
            "hero-slide-total"
        );


    const sliderFrame =
        document.querySelector(
            ".hero-main"
        );


    if (!sliderImage) {
        return;
    }


    if (heroSliderTimer) {

        clearInterval(
            heroSliderTimer
        );

        heroSliderTimer = null;

    }


    if (heroSliderTransitionTimer) {

        clearTimeout(
            heroSliderTransitionTimer
        );

        heroSliderTransitionTimer = null;

    }


    /*
     * No images
     */

    if (
        heroSliderImages.length === 0
    ) {

        sliderImage.removeAttribute(
            "src"
        );


        const current =
            document.getElementById(
                "hero-slide-current"
            );


        if (current) {

            current.textContent =
                "01";

        }


        if (sliderTotal) {

            sliderTotal.textContent =
                "01";

        }


        return;

    }


    heroSliderIndex = 0;


    const totalSlides =
        heroSliderImages.length;


    if (sliderTotal) {

        sliderTotal.textContent =
            String(totalSlides)
                .padStart(2, "0");

    }


    sliderImage.classList.remove(
        "slider-fade"
    );


    sliderImage.src =
        heroSliderImages[0];


    updateHeroSlideNumber();


    if (sliderFrame) {

        sliderFrame.dataset.slide =
            "01";

    }


    /*
     * Start automatic slider
     */

    if (
        heroSliderImages.length > 1
    ) {

        heroSliderTimer =
            setInterval(
                changeHeroSlide,
                3000
            );

    }

}


/* =========================================
   CHANGE SLIDE
========================================= */

function changeHeroSlide() {

    const sliderImage =
        document.getElementById(
            "hero-slider-image"
        );


    const sliderFrame =
        document.querySelector(
            ".hero-main"
        );


    if (!sliderImage) {
        return;
    }


    if (
        heroSliderImages.length <= 1
    ) {
        return;
    }


    sliderImage.classList.add(
        "slider-fade"
    );


    heroSliderTransitionTimer =
        setTimeout(
            function() {


                heroSliderIndex++;


                if (
                    heroSliderIndex >=
                    heroSliderImages.length
                ) {

                    heroSliderIndex = 0;

                }


                updateHeroSlideNumber();


                if (sliderFrame) {

                    sliderFrame.dataset.slide =
                        String(
                            heroSliderIndex + 1
                        ).padStart(2, "0");

                }


                sliderImage.onload =
                    function() {

                        sliderImage.classList.remove(
                            "slider-fade"
                        );

                    };


                sliderImage.src =
                    heroSliderImages[
                        heroSliderIndex
                    ];


                /*
                 * Cached image fallback
                 */

                setTimeout(
                    function() {

                        sliderImage.classList.remove(
                            "slider-fade"
                        );

                    },
                    250
                );


            },
            700
        );

}


/* =========================================
   SLIDE NUMBER
========================================= */

function updateHeroSlideNumber() {

    const current =
        document.getElementById(
            "hero-slide-current"
        );


    if (!current) {
        return;
    }


    current.textContent =
        String(
            heroSliderIndex + 1
        ).padStart(2, "0");

}


/* =========================================
   DISPLAY PRODUCTS
========================================= */

function displayProducts() {

    const container =
        document.getElementById(
            "products"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    let filteredProducts =
        products;


    if (
        currentFilter !== "all"
    ) {

        filteredProducts =
            products.filter(
                function(product) {

                    return (
                        product.category ===
                        currentFilter
                    );

                }
            );

    }


    if (
        filteredProducts.length === 0
    ) {

        container.innerHTML = `

            <div class="no-products">

                <span>✦</span>

                <h3>
                    Coming Soon
                </h3>

                <p>
                    Beautiful new products are on their way.
                </p>

            </div>

        `;

        return;

    }


    filteredProducts.forEach(
        function(product) {


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "product-card";


            card.innerHTML = `

                <div class="product-image-wrap">

                    <img
                        class="product-image"
                        src="${escapeAttribute(product.image)}"
                        alt="${escapeHtml(product.name)}"
                        loading="lazy"
                        onerror="
                            this.src='https://placehold.co/700x850/f1dfd8/6d1f2b?text=Rebel+Velvet'
                        "
                    >

                </div>


                <div class="product-info">

                    <div class="product-category">
                        ${escapeHtml(product.category)}
                    </div>


                    <h3 class="product-name">
                        ${escapeHtml(product.name)}
                    </h3>


                    <div class="product-price">
                        ${Number(product.price).toLocaleString()}
                        EGP
                    </div>


                    <button
                        class="add-to-cart"
                        onclick="addToCart('${escapeAttribute(product.id)}')"
                    >
                        ADD TO BAG
                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================
   FILTER
========================================= */

function filterProducts(
    category
) {

    currentFilter =
        category;


    updateFilterButtons();

    updateShopTitle();

    displayProducts();


    const shop =
        document.getElementById(
            "shop"
        );


    if (shop) {

        setTimeout(
            function() {

                shop.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            50
        );

    }

}


/* =========================================
   FILTER BUTTONS
========================================= */

function updateFilterButtons() {

    const buttons =
        document.querySelectorAll(
            ".filter-button"
        );


    buttons.forEach(
        function(button) {

            button.classList.remove(
                "active"
            );

        }
    );


    buttons.forEach(
        function(button) {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            if (
                currentFilter === "all" &&
                text === "all products"
            ) {

                button.classList.add(
                    "active"
                );

            }


            if (
                currentFilter !== "all" &&
                text ===
                currentFilter.toLowerCase()
            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================================
   SHOP TITLE
========================================= */

function updateShopTitle() {

    const title =
        document.getElementById(
            "shop-title"
        );


    if (!title) {
        return;
    }


    if (
        currentFilter === "all"
    ) {

        title.textContent =
            "Find Your Favorite";

        return;

    }


    title.textContent =
        currentFilter;

}


/* =========================================
   ADD TO CART
========================================= */

function addToCart(
    productId
) {

    const product =
        products.find(
            function(item) {

                return (
                    String(item.id) ===
                    String(productId)
                );

            }
        );


    if (!product) {
        return;
    }


    const existing =
        cart.find(
            function(item) {

                return (
                    String(item.id) ===
                    String(productId)
                );

            }
        );


    if (existing) {

        existing.quantity++;

    }

    else {

        cart.push({

            id:
                product.id,

            name:
                product.name,

            category:
                product.category,

            price:
                Number(product.price),

            image:
                product.image,

            quantity:
                1

        });

    }


    saveCart();

    updateCartCount();

    renderCart();

    openCart();

}


/* =========================================
   REMOVE
========================================= */

function removeFromCart(
    productId
) {

    cart =
        cart.filter(
            function(item) {

                return (
                    String(item.id) !==
                    String(productId)
                );

            }
        );


    saveCart();

    updateCartCount();

    renderCart();

}


/* =========================================
   QUANTITY
========================================= */

function changeQuantity(
    productId,
    change
) {

    const item =
        cart.find(
            function(product) {

                return (
                    String(product.id) ===
                    String(productId)
                );

            }
        );


    if (!item) {
        return;
    }


    item.quantity +=
        change;


    if (
        item.quantity <= 0
    ) {

        removeFromCart(
            productId
        );

        return;

    }


    saveCart();

    updateCartCount();

    renderCart();

}


/* =========================================
   SAVE CART
========================================= */

function saveCart() {

    localStorage.setItem(
        "rebelVelvetCart",
        JSON.stringify(cart)
    );

}


/* =========================================
   LOAD CART
========================================= */

function loadCart() {

    const saved =
        localStorage.getItem(
            "rebelVelvetCart"
        );


    if (saved) {

        try {

            cart =
                JSON.parse(saved);

        }

        catch {

            cart = [];

        }

    }


    updateCartCount();

}


/* =========================================
   CART COUNT
========================================= */

function updateCartCount() {

    const count =
        document.getElementById(
            "cart-count"
        );


    if (!count) {
        return;
    }


    const total =
        cart.reduce(
            function(sum, item) {

                return (
                    sum +
                    item.quantity
                );

            },
            0
        );


    count.textContent =
        total;

}


/* =========================================
   RENDER CART
========================================= */

function renderCart() {

    const container =
        document.getElementById(
            "cart-items"
        );


    const totalElement =
        document.getElementById(
            "cart-total"
        );


    if (
        !container ||
        !totalElement
    ) {

        return;

    }


    container.innerHTML = "";


    if (
        cart.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-cart">

                <span>
                    ♡
                </span>

                <p>
                    Your bag is empty.
                </p>

            </div>

        `;


        totalElement.textContent =
            "0 EGP";


        return;

    }


    let total = 0;


    cart.forEach(
        function(item) {


            const itemTotal =
                Number(item.price) *
                item.quantity;


            total +=
                itemTotal;


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "cart-item";


            element.innerHTML = `

                <img
                    src="${escapeAttribute(item.image)}"
                    alt="${escapeHtml(item.name)}"
                >


                <div class="cart-item-info">


                    <div class="cart-category">
                        ${escapeHtml(item.category)}
                    </div>


                    <h4>
                        ${escapeHtml(item.name)}
                    </h4>


                    <p>
                        ${Number(item.price).toLocaleString()}
                        EGP
                    </p>


                    <div class="quantity-control">


                        <button
                            onclick="changeQuantity('${escapeAttribute(item.id)}', -1)"
                        >
                            −
                        </button>


                        <span>
                            ${item.quantity}
                        </span>


                        <button
                            onclick="changeQuantity('${escapeAttribute(item.id)}', 1)"
                        >
                            +
                        </button>


                    </div>


                </div>


                <button
                    class="remove-item"
                    onclick="removeFromCart('${escapeAttribute(item.id)}')"
                >
                    ×
                </button>

            `;


            container.appendChild(
                element
            );

        }
    );


    totalElement.textContent =
        total.toLocaleString() +
        " EGP";

}


/* =========================================
   CONTINUE SHOPPING
========================================= */

function continueShopping() {

    closeCart();


    currentFilter =
        "all";


    updateFilterButtons();

    updateShopTitle();

    displayProducts();


    setTimeout(
        function() {

            const shop =
                document.getElementById(
                    "shop"
                );


            if (shop) {

                shop.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        },
        200
    );

}


/* =========================================
   OPEN CART
========================================= */

function openCart() {

    const overlay =
        document.getElementById(
            "cart-overlay"
        );


    if (!overlay) {
        return;
    }


    renderCart();


    overlay.classList.add(
        "active"
    );


    document.body.classList.add(
        "cart-open"
    );

}


/* =========================================
   CLOSE CART
========================================= */

function closeCart() {

    const overlay =
        document.getElementById(
            "cart-overlay"
        );


    if (!overlay) {
        return;
    }


    overlay.classList.remove(
        "active"
    );


    document.body.classList.remove(
        "cart-open"
    );

}


/* =========================================
   WHATSAPP CHECKOUT
========================================= */

function checkout() {

    if (
        cart.length === 0
    ) {

        alert(
            "Your bag is empty."
        );

        return;

    }


    let message =
        "Hello Rebel Velvet!%0A%0A";


    message +=
        "I would like to place an order:%0A%0A";


    let total = 0;


    cart.forEach(
        function(item) {


            const itemTotal =
                Number(item.price) *
                item.quantity;


            total +=
                itemTotal;


            message +=
                "• " +
                item.name +
                " × " +
                item.quantity +
                " = " +
                itemTotal +
                " EGP%0A";

        }
    );


    message +=
        "%0ATotal: " +
        total +
        " EGP%0A%0A";


    message +=
        "Name:%0A";


    message +=
        "Phone:%0A";


    message +=
        "Address:%0A";


    const url =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        message;


    window.open(
        url,
        "_blank"
    );

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================
   ESCAPE ATTRIBUTE
========================================= */

function escapeAttribute(
    value
) {

    return String(value)

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        );

}


/* =========================================
   CLOSE CART BY OUTSIDE CLICK
========================================= */

document.addEventListener(
    "click",
    function(event) {


        const overlay =
            document.getElementById(
                "cart-overlay"
            );


        if (!overlay) {
            return;
        }


        if (
            event.target ===
            overlay
        ) {

            closeCart();

        }

    }
);


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadCart();

        renderCart();

        loadWebsiteData();

    }
);
