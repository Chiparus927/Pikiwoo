/* =========================
   PRODUSE (date complete)
========================= */

const PD_SIZES_ALL = [
    "2-3 ani",
    "4-5 ani",
    "6-7 ani",
    "8-9 ani",
    "10-12 ani"
];

let products = [];

/* =========================
   API – bază de date
========================= */

const API_BASE = "";

async function apiFetch(path, options) {
    const session = getSession();
    const headers = Object.assign(
        {
            "Content-Type": "application/json"
        },
        (options && options.headers) || {}
    );

    if (session && session.id) {
        headers["X-User-Id"] = session.id;
    }

    const res = await fetch(
        API_BASE + path,
        Object.assign(
            {
                headers: headers
            },
            options || {}
        )
    );

    let data = null;

    try {
        data = await res.json();
    } catch (e) {
        data = null;
    }

    if (!res.ok) {

        const msg =
            (data && data.error) ||
            "Eroare server (" + res.status + ")";

        throw new Error(msg);
    }

    return data;
}

async function loadProductsFromDb() {

    products = await apiFetch("/api/products");
}

function saveSession(user) {

    sessionStorage.setItem(
        "pikwoSession",
        JSON.stringify(user)
    );
}

function getSession() {

    try {

        return JSON.parse(
            sessionStorage.getItem("pikwoSession")
        );

    } catch (e) {

        return null;
    }
}

function clearSession() {

    sessionStorage.removeItem("pikwoSession");
}

async function bootstrapApp() {

    try {

        await loadProductsFromDb();

    } catch (err) {

        console.error(err);

        alert(
            "Nu mă pot conecta la baza de date.\n\n" +
            "În folderul server rulează:\n" +
            "npm install\n" +
            "npm run export-products\n" +
            "npm run init-db\n" +
            "npm start\n\n" +
            "Apoi deschide http://localhost:3000"
        );

        return;
    }

    const session = getSession();

    if (session && session.fullName) {

        currentUser = session.fullName;
        currentUserRole =
            session.role ||
            (Number(session.id) === 2 ? "admin" : "customer");

        $("loginSection").style.display =
            "none";

        updateUserHeader();

        showHome();

    } else {

        $("loginSection").style.display =
            "flex";

        showRegister();
    }

    updateCounters();
}

document.addEventListener(
    "DOMContentLoaded",
    bootstrapApp
);

/* =========================
   VARIABILE
========================= */

let favorites = [];
let cart = [];
let currentUser = null;
let currentUserRole = "customer";
let currentCategory = "toate";

let pdSelectedSize = "";
let pdSelectedColor = "";
let pdQuantity = 1;
let pdCurrentId = null;

/* =========================
   SELECTOR
========================= */

function $(id) {
    return document.getElementById(id);
}

/* =========================
   UTILIZATOR / CONT
========================= */

function getInitialFromName(fullName) {

    let s =
        String(fullName || "")
        .trim();

    if (!s) {
        return "?";
    }

    let firstWord =
        s.split(/\s+/)[0];

    let ch =
        firstWord.charAt(0);

    if (!ch) {
        return "?";
    }

    return ch.toLocaleUpperCase("ro-RO");
}

function validatePasswordRules(pw) {

    if (pw.length < 8) {

        return (
            "Parola trebuie să aibă minim 8 caractere."
        );
    }

    if (!/\p{Lu}/u.test(pw)) {

        return (
            "Parola trebuie să conțină cel puțin o literă mare " +
            "(ex: A, Ă, Î, Ș, Ț)."
        );
    }

    if (!/[^\p{L}\p{N}\s]/u.test(pw)) {

        return (
            "Parola trebuie să conțină cel puțin un simbol " +
            "(ex: ! @ # * _ . ?)."
        );
    }

    return null;
}

function emailsMatch(a, b) {

    return (
        String(a || "")
        .trim()
        .toLowerCase() ===
        String(b || "")
        .trim()
        .toLowerCase()
    );
}

function updateUserHeader() {

    let wrap =
        $("userNavWrap");

    let menu =
        $("userMenuDropdown");

    if (!wrap || !menu) {
        return;
    }

    if (!currentUser) {

        wrap.style.display =
            "none";

        menu.style.display =
            "none";

        $("username").textContent =
            "";

        let adminLink =
            $("adminMenuBtn");

        if (adminLink) {
            adminLink.style.display = "none";
        }

        let mailEl =
            $("userMenuEmail");

        if (mailEl) {
            mailEl.textContent = "";
        }

        return;
    }

    wrap.style.display =
        "flex";

    $("username").textContent =
        "Bine ai venit, " +
        currentUser +
        "!";

    $("userAvatarBtn").textContent =
        getInitialFromName(currentUser);

    $("userMenuName").textContent =
        currentUser;

    const session = getSession();

    let savedEmail =
        (session && session.email) ||
        "";

    let mailEl =
        $("userMenuEmail");

    if (mailEl) {
        mailEl.textContent =
            savedEmail;
    }

    const adminBtn =
        $("adminMenuBtn");

    if (adminBtn) {
        adminBtn.style.display =
            currentUserRole === "admin"
            ? "block"
            : "none";
    }

    menu.style.display =
        "none";

    $("userAvatarBtn").setAttribute(
        "aria-expanded",
        "false"
    );
}

function toggleUserMenu() {

    let m =
        $("userMenuDropdown");

    let btn =
        $("userAvatarBtn");

    let isOpen =
        m.style.display === "block";

    m.style.display =
        isOpen ? "none" : "block";

    btn.setAttribute(
        "aria-expanded",
        isOpen ? "false" : "true"
    );
}

function closeUserMenu() {

    let m =
        $("userMenuDropdown");

    let btn =
        $("userAvatarBtn");

    if (m) {
        m.style.display = "none";
    }

    if (btn) {
        btn.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

function closeUserMenuIfOutside(e) {

    let wrap =
        $("userNavWrap");

    if (
        !wrap ||
        wrap.style.display === "none"
    ) {
        return;
    }

    if (!wrap.contains(e.target)) {

        closeUserMenu();
    }
}

document.addEventListener(
    "click",
    closeUserMenuIfOutside
);

/* =========================
   HELPERS PRODUS
========================= */

function getProductById(id) {
    return products.find(
        pr => pr.id === id
    );
}

function hasDiscount(p) {
    return (
        p.oldPrice != null &&
        p.oldPrice > p.price
    );
}

function discountPercent(p) {
    if (!hasDiscount(p)) {
        return 0;
    }

    return Math.round(
        (1 - p.price / p.oldPrice) * 100
    );
}

function collectBadges(p) {

    let list = [].concat(
        p.badges || []
    );

    if (
        hasDiscount(p) &&
        list.indexOf("Reducere") === -1
    ) {
        list.push("Reducere");
    }

    return list;
}

function badgeClass(tag) {

    let key =
        tag
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /\//g,
            "-"
        );

    return "prod-badge prod-badge-" + key;
}

function badgesHtml(p) {

    return collectBadges(p)
        .map(
            t =>
            `<span class="${badgeClass(t)}">${t}</span>`
        )
        .join("");
}

function priceCardHtml(p) {

    if (hasDiscount(p)) {

        let pct = discountPercent(p);

        return `

            <div class="product-price-row">

                <span class="price-old">${p.oldPrice} lei</span>

                <span class="product-price">${p.price} lei</span>

                <span class="price-pct">-${pct}%</span>

            </div>

        `;
    }

    return `

        <div class="product-price">

            ${p.price} lei

        </div>

    `;
}

function starRowHtml(rating) {

    let html =
        '<span class="pd-stars" aria-label="Rating ' +
        rating +
        ' din 5">';

    for (let i = 1; i <= 5; i++) {

        let cls =
            rating >= i
            ? "pd-star pd-star-full"
            : rating >= i - 0.5
            ? "pd-star pd-star-half"
            : "pd-star pd-star-empty";

        html +=
            '<span class="' +
            cls +
            '">★</span>';
    }

    html +=
        '<span class="pd-rating-num">' +
        Number(rating).toFixed(1) +
        "</span></span>";

    return html;
}

function cartLineId(id, size, color) {
    return (
        id +
        "|" +
        size +
        "|" +
        color
    );
}

/* =========================
   MODAL DETALII
========================= */

function pdModalBackdropClick(e) {

    if (e.target.id === "productDetailModal") {

        closeProductDetail();
    }
}

function openProductDetail(productId) {

    if (!currentUser) {

        alert(
            "Conectează-te pentru a vedea detaliile produsului."
        );

        return;
    }

    let p = getProductById(productId);

    if (!p) {
        return;
    }

    pdCurrentId = productId;
    pdSelectedSize = "";
    pdSelectedColor = "";
    pdQuantity = 1;

    $("productDetailBody").innerHTML =
        buildProductDetailHtml(p);

    let modal = $("productDetailModal");

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    requestAnimationFrame(
        () => {

            modal.classList.add(
                "pd-modal-visible"
            );
        }
    );

    document.body.style.overflow =
        "hidden";
}

function closeProductDetailImmediate() {

    let modal = $("productDetailModal");

    modal.classList.remove(
        "active",
        "pd-modal-visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    $("productDetailBody").innerHTML =
        "";

    pdCurrentId = null;
}

function closeProductDetail() {

    let modal = $("productDetailModal");

    modal.classList.remove(
        "pd-modal-visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    setTimeout(
        () => {

            modal.classList.remove("active");

            document.body.style.overflow =
                "";

            $("productDetailBody").innerHTML =
                "";

            pdCurrentId = null;
        },
        280
    );
}

function pdSetSize(size) {

    pdSelectedSize = size;

    document
    .querySelectorAll(".pd-chip-size")
    .forEach(
        el => {

            el.classList.toggle(
                "pd-chip-active",
                el.dataset.size === size
            );
        }
    );
}

function pdSetColor(color) {

    pdSelectedColor = color;

    document
    .querySelectorAll(".pd-chip-color")
    .forEach(
        el => {

            el.classList.toggle(
                "pd-chip-active",
                el.dataset.color === color
            );
        }
    );
}

function pdChangeQty(delta) {

    let p = getProductById(pdCurrentId);

    if (!p) {
        return;
    }

    let input =
        $("pdQtyInput");

    let v =
        parseInt(
            input.value,
            10
        ) || 1;

    v += delta;

    if (v < 1) {
        v = 1;
    }

    if (v > p.stock) {
        v = p.stock;
    }

    pdQuantity = v;

    input.value = v;
}

function pdOnQtyInput() {

    let p = getProductById(pdCurrentId);

    if (!p) {
        return;
    }

    let input =
        $("pdQtyInput");

    let v =
        parseInt(
            input.value,
            10
        ) || 1;

    if (v < 1) {
        v = 1;
    }

    if (v > p.stock) {
        v = p.stock;
    }

    pdQuantity = v;

    input.value = v;
}

function pdValidateOptions() {

    if (!pdSelectedSize) {

        alert(
            "Te rugăm să selectezi mărimea înainte de a continua."
        );

        return false;
    }

    if (!pdSelectedColor) {

        alert(
            "Te rugăm să selectezi culoarea înainte de a continua."
        );

        return false;
    }

    return true;
}

function pdAddToCartInternal(goCheckout) {

    let p = getProductById(pdCurrentId);

    if (!p) {
        return;
    }

    if (p.stock < 1) {

        alert(
            "Produsul nu este disponibil în stoc."
        );

        return;
    }

    if (!pdValidateOptions()) {
        return;
    }

    pdOnQtyInput();

    let qty =
        parseInt(
            $("pdQtyInput").value,
            10
        ) || 1;

    if (qty > p.stock) {

        alert(
            "Cantitatea depășește stocul disponibil (" +
            p.stock +
            ")."
        );

        return;
    }

    addToCartLine({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        quantity: qty,
        size: pdSelectedSize,
        color: pdSelectedColor
    });

    if (goCheckout) {

        closeProductDetailImmediate();

        proceedToCheckout();
    } else {

        alert(
            "🛒 Produsul a fost adăugat în coș!"
        );
    }
}

function buildProductDetailHtml(p) {

    let discBlock =
        hasDiscount(p)
        ? `

        <div class="pd-price-block">

            <span class="price-old">${p.oldPrice} lei</span>

            <span class="pd-price-main">${p.price} lei</span>

            <span class="pd-discount-tag">

                −${discountPercent(p)}%

            </span>

        </div>

    `
        : `

        <div class="pd-price-block">

            <span class="pd-price-main">${p.price} lei</span>

        </div>

    `;

    let stockLabel =
        p.stock > 0
        ? "În stoc (" + p.stock + " buc.)"
        : "Stoc epuizat";

    let stockClass =
        p.stock > 0
        ? "pd-stock-ok"
        : "pd-stock-no";

    let sizes =
        p.sizes && p.sizes.length
        ? p.sizes
        : PD_SIZES_ALL;

    let colors =
        p.colors && p.colors.length
        ? p.colors
        : [p.color];

    let sizesHtml =
        sizes
        .map(
            s => `

            <button
            type="button"
            class="pd-chip pd-chip-size"
            data-size="${escapeAttr(s)}"
            onclick="pdSetSize('${escapeJsStr(s)}')">

                ${s}

            </button>

        `
        )
        .join("");

    let colorsHtml =
        colors
        .map(
            c => `

            <button
            type="button"
            class="pd-chip pd-chip-color"
            data-color="${escapeAttr(c)}"
            onclick="pdSetColor('${escapeJsStr(c)}')">

                ${c}

            </button>

        `
        )
        .join("");

    let reviewsHtml =
        (p.reviews || [])
        .map(
            r => `

            <div class="pd-review">

                ${starRowHtml(r.stars)}

                <p class="pd-review-text">

                    “${r.text}”

                </p>

                <span class="pd-review-author">

                    — ${r.author}

                </span>

            </div>

        `
        )
        .join("");

    let similar =
        getSimilarProducts(p);

    let similarHtml =
        similar.length
        ? similar
            .map(
                sp => `

                <div
                class="pd-mini-card"
                onclick="openProductDetail(${sp.id})">

                    <img
                    src="${sp.image}"
                    alt="${escapeAttr(sp.name)}">

                    <div class="pd-mini-info">

                        <span>${sp.name}</span>

                        <strong>${sp.price} lei</strong>

                    </div>

                </div>

            `
            )
            .join("")
        : "";

    let disabled =
        p.stock < 1
        ? "disabled"
        : "";

    return `

        <div class="pd-layout">

            <div class="pd-gallery">

                <div class="pd-badges-top">

                    ${badgesHtml(p)}

                </div>

                <img
                class="pd-hero-img"
                src="${p.imageLarge}"
                alt="${escapeAttr(p.name)}">

                <p class="pd-delivery-note">

                    🚚 Livrare rapidă în 1–3 zile

                </p>

                <p class="pd-return-note">

                    ↩ Retur în 14 zile

                </p>

            </div>

            <div class="pd-info">

                <p class="pd-sku">

                    Cod produs:
                    <strong>${p.sku}</strong>

                </p>

                <h2 id="pdTitle" class="pd-title">

                    ${p.name}

                </h2>

                ${discBlock}

                <div class="pd-rating-row">

                    ${starRowHtml(p.rating)}

                </div>

                <p class="pd-desc-short">

                    ${p.description}

                </p>

                <ul class="pd-meta-list">

                    <li>

                        <strong>Categorie:</strong>
                        ${p.category}

                    </li>

                    <li>

                        <strong>Material:</strong>
                        ${p.material}

                    </li>

                    <li>

                        <strong>Sezon:</strong>
                        ${p.season}

                    </li>

                    <li class="${stockClass}">

                        <strong>Disponibilitate:</strong>
                        ${stockLabel}

                    </li>

                </ul>

                <div class="pd-field">

                    <label>

                        Mărime

                    </label>

                    <div class="pd-chips">

                        ${sizesHtml}

                    </div>

                </div>

                <div class="pd-field">

                    <label>

                        Culoare

                    </label>

                    <div class="pd-chips">

                        ${colorsHtml}

                    </div>

                </div>

                <div class="pd-field pd-qty-row">

                    <label for="pdQtyInput">

                        Cantitate

                    </label>

                    <div class="pd-qty-ctrl">

                        <button
                        type="button"
                        class="pd-qty-btn"
                        onclick="pdChangeQty(-1)"
                        ${disabled}>

                            −

                        </button>

                        <input
                        type="number"
                        id="pdQtyInput"
                        class="pd-qty-input"
                        min="1"
                        max="${p.stock}"
                        value="1"
                        onchange="pdOnQtyInput()"
                        ${disabled}>

                        <button
                        type="button"
                        class="pd-qty-btn"
                        onclick="pdChangeQty(1)"
                        ${disabled}>

                            +

                        </button>

                    </div>

                </div>

                <div class="pd-actions-main">

                    <button
                    type="button"
                    class="btn-primary pd-btn-wide"
                    onclick="pdAddToCartInternal(false)"
                    ${disabled}>

                        Adaugă în coș

                    </button>

                    <button
                    type="button"
                    class="btn-secondary pd-btn-wide"
                    onclick="pdBuyNow()"
                    ${disabled}>

                        Cumpără acum

                    </button>

                </div>

                <div class="pd-actions-secondary">

                    <button
                    type="button"
                    class="pd-outline-btn"
                    onclick="pdAddFavoriteFromDetail()">

                        Adaugă la favorite

                    </button>

                    <button
                    type="button"
                    class="pd-outline-btn"
                    onclick="closeProductDetail(); showProducts();">

                        Înapoi la produse

                    </button>

                </div>

            </div>

        </div>

        <div class="pd-section">

            <h3>

                Instrucțiuni de întreținere

            </h3>

            <p class="pd-care">

                ${p.careInstructions}

            </p>

        </div>

        <div class="pd-section">

            <h3>

                Descriere detaliată

            </h3>

            <p class="pd-long">

                ${p.longDescription}

            </p>

        </div>

        ${
            reviewsHtml
            ? `

            <div class="pd-section">

                <h3>

                    Recenzii

                </h3>

                <div class="pd-reviews">

                    ${reviewsHtml}

                </div>

            </div>

        `
            : ""
        }

        ${
            similarHtml
            ? `

            <div class="pd-section">

                <h3>

                    Produse similare & recomandate

                </h3>

                <div class="pd-similar-grid">

                    ${similarHtml}

                </div>

            </div>

        `
            : ""
        }

    `;
}

function escapeAttr(s) {

    return String(s)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        );
}

function escapeJsStr(s) {

    return String(s)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /\n/g,
            "\\n"
        );
}

function getSimilarProducts(p) {

    let ids =
        new Set(
            p.similarIds || []
        );

    let sameCat =
        products.filter(
            x =>
            x.id !== p.id &&
            x.category === p.category
        );

    sameCat.forEach(
        x => ids.add(x.id)
    );

    return products.filter(
        x =>
        x.id !== p.id &&
        ids.has(x.id)
    )
    .slice(
        0,
        4
    );
}

function pdAddFavoriteFromDetail() {

    if (pdCurrentId != null) {

        addToFav(pdCurrentId);
    }
}

function pdBuyNow() {

    pdAddToCartInternal(true);
}

/* =========================
   REGISTER / LOGIN
========================= */

function showLogin() {

    $("registerCard").style.display = "none";

    $("loginCard").style.display = "block";
}

function showRegister() {

    $("registerCard").style.display = "block";

    $("loginCard").style.display = "none";
}

async function onRegisterSubmit(e) {

    if (e && typeof e.preventDefault === "function") {

        e.preventDefault();
    }

    await registerUser();

    return false;
}

async function onLoginSubmit(e) {

    if (e && typeof e.preventDefault === "function") {

        e.preventDefault();
    }

    await login();

    return false;
}

/* =========================
   REGISTER
========================= */

async function registerUser() {

    let fullName =
        $("registerFullName").value.trim();

    let email =
        $("registerEmail").value.trim();

    let password =
        $("registerPass").value.trim();

    if (
        fullName === "" ||
        email === "" ||
        password === ""
    ) {

        alert(
            "Completează toate câmpurile!"
        );

        return;
    }

    let emailOk =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        );

    if (!emailOk) {

        alert(
            "Introdu o adresă de email validă " +
            "(exemplu: nume@email.ro)."
        );

        return;
    }

    let pwErr =
        validatePasswordRules(password);

    if (pwErr) {

        alert(pwErr);

        return;
    }

    try {

        const user = await apiFetch(
            "/api/auth/register",
            {
                method: "POST",
                body: JSON.stringify({
                    fullName: fullName,
                    email: email,
                    password: password
                })
            }
        );

        saveSession(user);

        currentUser = user.fullName;
        currentUserRole =
            Number(user.id) === 2 ? "admin" : "customer";

    } catch (err) {

        alert(err.message);

        return;
    }

    $("loginSection").style.display =
        "none";

    updateUserHeader();

    alert(
        "✅ Cont creat cu succes!"
    );

    showHome();
}

/* =========================
   LOGIN
========================= */

async function login() {

    let email =
        $("loginEmail").value.trim();

    let password =
        $("pass").value.trim();

    try {

        const user = await apiFetch(
            "/api/auth/login",
            {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        saveSession(user);

        currentUser = user.fullName;
        currentUserRole =
            Number(user.id) === 2 ? "admin" : "customer";

    } catch (err) {

        alert(err.message);

        return;
    }

    $("loginSection").style.display =
        "none";

    updateUserHeader();

    showHome();
}

/* =========================
   LOGOUT
========================= */

function logout() {

    clearSession();

    currentUser = null;
    currentUserRole = "customer";

    cart = [];

    favorites = [];

    closeProductDetail();

    closeUserMenu();

    $("loginSection").style.display =
        "flex";

    updateUserHeader();

    showRegister();

    updateCounters();
}

/* =========================
   SECTIONS
========================= */

function showSection(id) {

    document
    .querySelectorAll(".section")
    .forEach(sec => {

        sec.style.display = "none";

    });

    $(id).style.display = "block";
}

function showHome() {

    if (!currentUser) {
        return;
    }

    showSection("homeSection");
}

function showProducts() {

    if (!currentUser) {
        return;
    }

    currentCategory = "toate";

    document
    .querySelectorAll(".filter-btn")
    .forEach(btn => {

        let cat =
            btn.getAttribute("data-cat");

        btn.classList.toggle(
            "active",
            cat === "toate"
        );
    });

    showSection("productsSection");

    displayProducts(products);
}

async function showAdminPanel() {
    if (currentUserRole !== "admin") {
        alert("Doar adminul poate deschide panoul.");
        return;
    }

    closeUserMenu();
    showSection("adminSection");
    await loadAdminPanel();
}

/* =========================
   CATEGORY
========================= */

function showCategory(category) {

    currentCategory = category;

    let filtered =
        category === "toate"
        ? products
        : products.filter(
            pr => pr.category === category
        );

    showSection("productsSection");

    document
    .querySelectorAll(".filter-btn")
    .forEach(btn => {

        let cat =
            btn.getAttribute("data-cat");

        btn.classList.toggle(
            "active",
            cat === category
        );
    });

    displayProducts(filtered);
}

/* =========================
   DISPLAY PRODUCTS
========================= */

function displayProducts(list) {

    const div = $("products");

    div.innerHTML = "";

    if (!list.length) {

        div.innerHTML =
            "<div class='empty-message'>" +
            "Nu s-au găsit produse.</div>";

        return;
    }

    list.forEach(p => {

        div.innerHTML += `

        <div
        class="product product-clickable"
        role="button"
        tabindex="0"
        onclick="openProductDetail(${p.id})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductDetail(${p.id});}">

            <div class="product-image">

                <div class="product-badges-wrap">

                    ${badgesHtml(p)}

                </div>

                <img src="${p.image}" alt="${escapeAttr(p.name)}">

            </div>

            <div class="product-content">

                <h4>${p.name}</h4>

                ${starRowHtml(p.rating)}

                <p class="product-snippet">

                    ${p.description}

                </p>

                ${priceCardHtml(p)}

                <div
                class="product-buttons"
                onclick="event.stopPropagation()">

                    <button
                    type="button"
                    onclick="addToFav(${p.id})">

                        ❤️ Favorite

                    </button>

                    <button
                    type="button"
                    onclick="openProductDetail(${p.id})">

                        🔍 Detalii &amp; coș

                    </button>

                </div>

            </div>

        </div>

        `;
    });
}

/* =========================
   ADMIN
========================= */

async function loadAdminPanel() {
    try {
        const summary = await apiFetch("/api/admin/summary");
        const users = await apiFetch("/api/admin/users");

        $("adminUsersCount").textContent = summary.users;
        $("adminProductsCount").textContent = summary.products;
        $("adminStockCount").textContent = summary.stock;

        renderAdminUsers(users);
        renderAdminProducts();
    } catch (err) {
        alert(err.message);
    }
}

function renderAdminUsers(users) {
    const body = $("adminUsersBody");

    body.innerHTML = users.map((u) => `
        <tr>
            <td>${u.id}</td>
            <td>${escapeHtml(u.fullName)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.role === "admin" ? "Admin" : "Client"}</td>
        </tr>
    `).join("");
}

function renderAdminProducts() {
    const body = $("adminProductsBody");

    body.innerHTML = products.map((p) => `
        <tr>
            <td>${p.id}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td>${p.price} lei</td>
            <td>${p.stock}</td>
            <td>
                <button type="button" onclick="adminEditProduct(${p.id})">
                    Editeaza
                </button>
                <button type="button" onclick="adminDeleteProduct(${p.id})">
                    Sterge
                </button>
            </td>
        </tr>
    `).join("");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function adminEditProduct(id) {
    const p = products.find((item) => item.id === id);

    if (!p) {
        return;
    }

    $("adminProductId").value = p.id;
    $("adminProductName").value = p.name || "";
    $("adminProductCategory").value = p.category || "Fete";
    $("adminProductColor").value = p.color || "";
    $("adminProductColors").value = (p.colors || []).join(", ");
    $("adminProductSizes").value = (p.sizes || []).join(", ");
    $("adminProductMaterial").value = p.material || "";
    $("adminProductSeason").value = p.season || "";
    $("adminProductPrice").value = p.price || "";
    $("adminProductOldPrice").value = p.oldPrice || "";
    $("adminProductStock").value = p.stock || "";
    $("adminProductSku").value = p.sku || "";
    $("adminProductRating").value = p.rating || "";
    $("adminProductBadges").value = (p.badges || []).join(", ");
    $("adminProductImage").value = p.image || "";
    $("adminProductImageLarge").value = p.imageLarge || "";
    $("adminProductDescription").value = p.description || "";
    $("adminProductLongDescription").value = p.longDescription || "";
    $("adminProductCare").value = p.careInstructions || "";
    $("adminProductSimilar").value = (p.similarIds || []).join(", ");
}

function adminClearProductForm() {
    $("adminProductForm").reset();
    $("adminProductId").value = "";
}

function adminProductPayload() {
    return {
        id: $("adminProductId").value,
        name: $("adminProductName").value,
        category: $("adminProductCategory").value,
        color: $("adminProductColor").value,
        colors: $("adminProductColors").value,
        sizes: $("adminProductSizes").value,
        material: $("adminProductMaterial").value,
        season: $("adminProductSeason").value,
        price: $("adminProductPrice").value,
        oldPrice: $("adminProductOldPrice").value,
        stock: $("adminProductStock").value,
        sku: $("adminProductSku").value,
        rating: $("adminProductRating").value,
        badges: $("adminProductBadges").value,
        image: $("adminProductImage").value,
        imageLarge: $("adminProductImageLarge").value,
        description: $("adminProductDescription").value,
        longDescription: $("adminProductLongDescription").value,
        careInstructions: $("adminProductCare").value,
        similarIds: $("adminProductSimilar").value
    };
}

async function adminSaveProduct(e) {
    if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
    }

    const payload = adminProductPayload();
    const id = payload.id;

    try {
        await apiFetch(
            id
            ? "/api/admin/products/" + id
            : "/api/admin/products",
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(payload)
            }
        );

        await loadProductsFromDb();
        renderAdminProducts();
        adminClearProductForm();
        alert("Produs salvat.");
    } catch (err) {
        alert(err.message);
    }

    return false;
}

async function adminDeleteProduct(id) {
    if (!confirm("Stergi produsul #" + id + "?")) {
        return;
    }

    try {
        await apiFetch("/api/admin/products/" + id, {
            method: "DELETE"
        });

        await loadProductsFromDb();
        renderAdminProducts();
        displayProducts(products);
        alert("Produs sters.");
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   FAVORITES
========================= */

function addToFav(productId) {

    if (
        favorites.includes(productId)
    ) {

        alert(
            "Produs deja la favorite!"
        );

        return;
    }

    favorites.push(productId);

    updateCounters();

    alert(
        "❤️ Produs adăugat la favorite!"
    );

    displayFavorites();
}

function removeFromFav(productId) {

    favorites =
        favorites.filter(
            id => id !== productId
        );

    updateCounters();

    displayFavorites();
}

function displayFavorites() {

    const div =
        $("favoriteItems");

    if (!favorites.length) {

        div.innerHTML =
        "<div class='empty-message'>Nu ai favorite.</div>";

        return;
    }

    div.innerHTML = "";

    favorites.forEach(id => {

        let p =
            products.find(
                prod => prod.id === id
            );

        if (!p) {
            return;
        }

        div.innerHTML += `

        <div
        class="product product-clickable"
        role="button"
        tabindex="0"
        onclick="openProductDetail(${p.id})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductDetail(${p.id});}">

            <div class="product-image">

                <div class="product-badges-wrap">

                    ${badgesHtml(p)}

                </div>

                <img src="${p.image}" alt="${escapeAttr(p.name)}">

            </div>

            <div class="product-content">

                <h4>${p.name}</h4>

                ${priceCardHtml(p)}

                <div
                class="product-buttons"
                onclick="event.stopPropagation()">

                    <button
                    type="button"
                    onclick="openProductDetail(${p.id})">

                        🔍 Detalii

                    </button>

                    <button
                    type="button"
                    class="fav-remove-btn"
                    onclick="removeFromFav(${p.id})">

                        🗑️ Șterge din favorite

                    </button>

                </div>

            </div>

        </div>

        `;
    });
}

function openFavorites() {

    showSection("favoritesSection");

    displayFavorites();
}

/* =========================
   CART
========================= */

function addToCartLine(entry) {

    let lineId =
        cartLineId(
            entry.id,
            entry.size,
            entry.color
        );

    let existing =
        cart.find(
            item =>
            item.lineId === lineId
        );

    if (existing) {

        existing.quantity += entry.quantity;

    } else {

        cart.push(
            Object.assign(
                { lineId: lineId },
                entry
            )
        );
    }

    updateCounters();

    displayCart();
}

function removeCartLine(lineId) {

    cart =
        cart.filter(
            item =>
            item.lineId !== lineId
        );

    updateCounters();

    displayCart();
}

function removeCartLineFromBtn(btn) {

    let lineId =
        btn.getAttribute("data-line-id");

    removeCartLine(lineId);
}

function displayCart() {

    const div = $("cartItems");

    if (!cart.length) {

        div.innerHTML =
        "<div class='empty-message'>Coșul este gol.</div>";

        $("subtotalPrice").textContent =
            "0";

        $("totalPrice").textContent =
            "0";

        return;
    }

    let total = 0;

    div.innerHTML = "";

    cart.forEach(item => {

        let itemTotal =
            item.price *
            item.quantity;

        total += itemTotal;

        let safeAttr =
            escapeAttr(item.lineId);

        div.innerHTML += `

        <div class="cart-item">

            <img
            class="cart-thumb"
            src="${item.image}"
            alt="">

            <div class="cart-item-info">

                <h4>${item.name}</h4>

                <p class="cart-variant">

                    Mărime:
                    <strong>${item.size}</strong>
                    · Culoare:
                    <strong>${item.color}</strong>

                </p>

                <span class="cart-item-price">

                    ${item.price} lei × ${item.quantity}
                    =
                    ${itemTotal} lei

                </span>

            </div>

            <div class="cart-item-actions">

                <button
                type="button"
                class="cart-remove-btn"
                data-line-id="${safeAttr}"
                onclick="removeCartLineFromBtn(this)">

                    Șterge

                </button>

            </div>

        </div>

        `;
    });

    $("subtotalPrice").textContent =
        total;

    $("totalPrice").textContent =
        total;
}

function openCart() {

    showSection("cartSection");

    displayCart();
}

/* =========================
   CHECKOUT
========================= */

function proceedToCheckout() {

    if (!cart.length) {

        alert(
            "Coșul este gol!"
        );

        return;
    }

    showSection(
        "checkoutSection"
    );

    displayCheckoutSummary();
}

function displayCheckoutSummary() {

    const div =
        $("checkoutItems");

    div.innerHTML = "";

    let total = 0;

    cart.forEach(item => {

        let itemTotal =
            item.price *
            item.quantity;

        total += itemTotal;

        div.innerHTML += `

            <p class="checkout-line">

            <img
            class="checkout-thumb"
            src="${item.image}"
            alt="">

            <span>

                <strong>${item.name}</strong><br>

                ${item.size} · ${item.color}
                × ${item.quantity}
                =
                <strong>${itemTotal} lei</strong>

            </span>

            </p>

        `;
    });

    $("subtotal").textContent =
        total;

    $("checkoutTotal").textContent =
        total;
}

function processCheckout() {

    let firstName =
        $("firstName").value.trim();

    let lastName =
        $("lastName").value.trim();

    let email =
        $("email").value.trim();

    let phone =
        $("phone").value.trim();

    let address =
        $("address").value.trim();

    let city =
        $("city").value.trim();

    let zipcode =
        $("zipcode").value.trim();

    if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !address ||
        !city ||
        !zipcode
    ) {

        alert(
            "Completează toate datele!"
        );

        return;
    }

    alert(
        "✅ Comandă finalizată!"
    );

    cart = [];

    updateCounters();

    showHome();
}

/* =========================
   COUNTERS
========================= */

function updateCounters() {

    let totalItems =
        cart.reduce(
            (sum, item) =>
            sum + item.quantity,
            0
        );

    $("cartCount").textContent =
        totalItems;

    $("favCount").textContent =
        favorites.length;
}

/* =========================
   SEARCH
========================= */

function getCategoryBaseList() {

    return currentCategory === "toate"
        ? products
        : products.filter(
            pr =>
            pr.category === currentCategory
        );
}

function searchProduct() {

    let value =
        $("searchNav")
        .value
        .toLowerCase()
        .trim();

    let base =
        getCategoryBaseList();

    if (value === "") {

        displayProducts(base);

        return;
    }

    let filtered =
        base.filter(pr =>

            pr.name
            .toLowerCase()
            .includes(value)

            ||

            String(pr.color)
            .toLowerCase()
            .includes(value)

            ||

            (pr.colors || [])
            .some(
                c =>
                c.toLowerCase()
                .includes(value)
            )

            ||

            pr.material
            .toLowerCase()
            .includes(value)

            ||

            pr.category
            .toLowerCase()
            .includes(value)

            ||

            pr.description
            .toLowerCase()
            .includes(value)

            ||

            String(pr.sku || "")
            .toLowerCase()
            .includes(value)
        );

    displayProducts(filtered);
}
