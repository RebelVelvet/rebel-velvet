/* =========================================
   REBEL VELVET
   PRODUCT + CART SYSTEM
   ========================================= */


/* =========================================
   SETTINGS
   ========================================= */

const WHATSAPP_NUMBER = "01092542461";

const API_URL =
    "https://script.google.com/macros/s/AKfycbwobwaeysf_tEYipYYm1b_bJxJFpQeOpWXM_pp4DNLTjYu5zsOxrgTV_ZbV9snLs7lw/exec";


/* =========================================
   PRODUCTS
   ========================================= */

const products = [

    {
        id: 1,
        name: "Velvet Blossom",
        category: "Body Splash",
        price: 350,
        status: "available",
        driveKey: "bodySplash"
    },

    {
        id: 2,
        name: "Rose Kiss",
        category: "Lip Gloss",
        price: 250,
        status: "available",
        driveKey: "lipGloss"
    },

    {
        id: 3,
        name: "Velvet Drive",
        category: "Car Air Freshener",
        price: 200,
        status: "available",
        driveKey: "carAirFreshener"
    }

];


/* =========================================
   COMING SOON
   ========================================= */

const comingSoon = [
    "Body Care",
    "Perfumes",
    "Skincare",
    "Hair Care",
    "Gift Sets"
];


/* =========================================
   CART
   ========================================= */

let cart = [];


/* =========================================
   PRODUCT IMAGES
   ========================================= */

let productImages = {};


/* =========================================
   LOAD IMAGES FROM GOOGLE DRIVE
   ========================================= */

function loadProductImages() {

    const script =
        document.createElement("script");

    const callbackName =
        "rebelVelvetCallback_" +
        Date.now();


    window[callbackName] =
        function(data) {

            if (
                data &&
                data.success &&
                data.products
            ) {

                productImages =
                    data.products;

                displayProducts();

            } else {

                displayProducts();

            }


            delete window[callbackName];

            script.remove();

        };


    script.src =
        API_URL +
        "?callback=" +
        callbackName;


    script.onerror =
        function() {

            console.error(
                "Unable to load product images."
            );

            displayProducts();

            delete window[callbackName];

            script.remove();

        };


    document.body.appendChild(script);

}


/* =========================================
   GET PRODUCT IMAGES
   ========================================= */

function getProductImages(product) {

    if (
        !productImages ||
        !productImages[product.driveKey]
    ) {

        return [];

    }


    return productImages[
        product.driveKey
    ];

}


/* =========================================
   GET MAIN IMAGE
   ========================================= */

function getMainImage(product) {

    const images =
        getProductImages(product);


    if (
        images.length > 0
    ) {

        return images[0].url;

    }


    return "https://placehold.co/700x850/f1dfd8/6d1f2b?text=Rebel+Velvet";

}


/* =========================================
   DISPLAY PRODUCTS
   ========================================= */

function displayProducts() {

    const container =
        document.getElementById(
            "products"
        );


    if (!container) return;


    container.innerHTML = "";


    products.forEach(
        function(product) {

            const card =
                document.createElement("div");


            card.className =
                "product-card";


            const image =
                getMainImage(product);


            card.innerHTML = `

                <img
                    class="product-image"
                    src="${image}"
                    alt="${product.name}"
                    loading="lazy"
                    onerror="
                        this.src='https://placehold.co/700x850/f1dfd8/6d1f2b?text=Rebel+Velvet'
                    "
                >

                <div class="product-info">

                    <div class="product-category">
                        ${product.category}
                    </div>

                    <h3 class="product-name">
                        ${product.name}
                    </h3>

                    <div class="product-price">
                        ${product.price.toLocaleString()} EGP
                    </div>

                    <button
                        class="add-to-cart"
                        onclick="addToCart(${product.id})"
                    >
                        ADD TO BAG
                    </button>

                </div>

            `;


            container.appendChild(card);

        }
    );

}


/* =========================================
   ADD TO CART
   ========================================= */

function addToCart(productId) {

    const product =
        products.find(
            item => item.id === productId
        );


    if (!product) return;


    const existing =
        cart.find(
            item => item.id === productId
        );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({

            id: product.id,

            name: product.name,

            category: product.category,

            price: product.price,

            image: getMainImage(product),

            quantity: 1

        });

    }


    saveCart();

    updateCartCount();

    renderCart();

    openCart();

}


/* =========================================
   REMOVE PRODUCT
   ========================================= */

function removeFromCart(productId) {

    cart =
        cart.filter(
            item => item.id !== productId
        );


    saveCart();

    updateCartCount();

    renderCart();

}


/* =========================================
   CHANGE QUANTITY
   ========================================= */

function changeQuantity(
    productId,
    change
) {

    const item =
        cart.find(
            product =>
                product.id === productId
        );


    if (!item) return;


    item.quantity += change;


    if (item.quantity <= 0) {

        removeFromCart(productId);

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

        } catch {

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


    if (!count) return;


    const total =
        cart.reduce(
            function(sum, item) {

                return sum +
                    item.quantity;

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
    ) return;


    container.innerHTML = "";


    if (cart.length === 0) {

        container.innerHTML = `

            <div
                style="
                    text-align:center;
                    padding:50px 10px;
                    color:#806a69;
                    font-size:13px;
                "
            >
                Your bag is empty.
            </div>

        `;


        totalElement.textContent =
            "0 EGP";


        return;

    }


    let total = 0;


    cart.forEach(
        function(item) {

            total +=
                item.price *
                item.quantity;


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "cart-item";


            element.innerHTML = `

                <img
                    src="${item.image}"
                    alt="${item.name}"
                >

                <div class="cart-item-info">

                    <h4>
                        ${item.name}
                    </h4>

                    <p>
                        ${item.price.toLocaleString()} EGP
                    </p>

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                            margin-top:8px;
                        "
                    >

                        <button
                            onclick="
                                changeQuantity(
                                    ${item.id},
                                    -1
                                )
                            "
                            style="
                                border:1px solid #b98272;
                                background:none;
                                width:25px;
                                height:25px;
                                cursor:pointer;
                            "
                        >
                            −
                        </button>

                        <span>
                            ${item.quantity}
                        </span>

                        <button
                            onclick="
                                changeQuantity(
                                    ${item.id},
                                    1
                                )
                            "
                            style="
                                border:1px solid #b98272;
                                background:none;
                                width:25px;
                                height:25px;
                                cursor:pointer;
                            "
                        >
                            +
                        </button>

                    </div>

                </div>

                <button
                    class="remove-item"
                    onclick="
                        removeFromCart(
                            ${item.id}
                        )
                    "
                >
                    ×
                </button>

            `;


            container.appendChild(element);

        }
    );


    totalElement.textContent =
        total.toLocaleString() +
        " EGP";

}


/* =========================================
   OPEN CART
   ========================================= */

function openCart() {

    const overlay =
        document.getElementById(
            "cart-overlay"
        );


    if (!overlay) return;


    renderCart();

    overlay.classList.add(
        "active"
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


    if (!overlay) return;


    overlay.classList.remove(
        "active"
    );

}


/* =========================================
   WHATSAPP CHECKOUT
   ========================================= */

function checkout() {

    if (cart.length === 0) {

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
                item.price *
                item.quantity;


            total += itemTotal;


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
   CLOSE CART OUTSIDE
   ========================================= */

document.addEventListener(
    "click",
    function(event) {

        const overlay =
            document.getElementById(
                "cart-overlay"
            );


        if (!overlay) return;


        if (
            event.target === overlay
        ) {

            closeCart();

        }

    }
);


/* =========================================
   START WEBSITE
   ========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadCart();

        renderCart();

        loadProductImages();

    }
);
