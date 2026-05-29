const fs = require("fs");
const path = require("path");

const scriptPath = path.join(__dirname, "..", "..", "script.js");

let s = fs.readFileSync(scriptPath, "utf8");

s = s.replace(/\r\n/g, "\n");

const markerStart = "let products = [";
const markerEnd =
    "];\n\n/* =========================\n   VARIABILE\n========================= */";

const start = s.indexOf(markerStart);
const end = s.indexOf(markerEnd, start);

if (start === -1 || end === -1) {
    console.log("script.js deja patch-uit sau structură diferită");
    process.exit(0);
}

const apiBlock = `let products = [];

/* =========================
   API – bază de date
========================= */

const API_BASE = "";

async function apiFetch(path, options) {

    const res = await fetch(
        API_BASE + path,
        Object.assign(
            {
                headers: {
                    "Content-Type": "application/json"
                }
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
            "Nu mă pot conecta la baza de date.\\n\\n" +
            "În folderul server rulează:\\n" +
            "npm install\\n" +
            "npm run export-products\\n" +
            "npm run init-db\\n" +
            "npm start\\n\\n" +
            "Apoi deschide http://localhost:3000"
        );

        return;
    }

    const session = getSession();

    if (session && session.fullName) {

        currentUser = session.fullName;

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

`;

s =
    s.slice(0, start) +
    apiBlock +
    s.slice(end + markerEnd.length);

/* registerUser -> async with API */
s = s.replace(
    /function registerUser\(\) \{/,
    "async function registerUser() {"
);

const oldRegister = `    localStorage.removeItem(
        "pikwoUser"
    );

    localStorage.setItem(
        "pikwoFullName",
        fullName
    );

    localStorage.setItem(
        "pikwoEmail",
        email
    );

    localStorage.setItem(
        "pikwoPass",
        password
    );

    currentUser = fullName;`;

const newRegister = `    try {

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

    } catch (err) {

        alert(err.message);

        return;
    }`;

if (s.includes(oldRegister)) {
    s = s.replace(oldRegister, newRegister);
}

/* login */
s = s.replace(
    /function login\(\) \{/,
    "async function login() {"
);

const oldLogin = `    let savedEmail =
        localStorage.getItem(
            "pikwoEmail"
        );

    let savedPass =
        localStorage.getItem(
            "pikwoPass"
        );

    let savedName =
        localStorage.getItem(
            "pikwoFullName"
        ) ||
        localStorage.getItem(
            "pikwoUser"
        );

    if (
        !savedEmail ||
        !savedPass
    ) {

        alert(
            "Mai întâi trebuie să te înregistrezi!"
        );

        showRegister();

        return;
    }

    if (!emailsMatch(email, savedEmail)) {

        alert(
            "Email sau parolă incorectă!"
        );

        return;
    }

    if (password !== savedPass) {

        alert(
            "Email sau parolă incorectă!"
        );

        return;
    }

    currentUser =
        savedName ||
        "Utilizator";`;

const newLogin = `    try {

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

    } catch (err) {

        alert(err.message);

        return;
    }`;

if (s.includes(oldLogin)) {
    s = s.replace(oldLogin, newLogin);
}

/* logout */
s = s.replace(
    "function logout() {\n\n    currentUser = null;",
    "function logout() {\n\n    clearSession();\n\n    currentUser = null;"
);

/* updateUserHeader email from session */
s = s.replace(
    `    let savedEmail =
        localStorage.getItem(
            "pikwoEmail"
        ) ||
        "";`,
    `    const session = getSession();

    let savedEmail =
        (session && session.email) ||
        "";`
);

/* onRegisterSubmit / onLoginSubmit await */
s = s.replace(
    "    registerUser();\n\n    return false;",
    "    registerUser();\n\n    return false;"
);

s = s.replace(
    "function onRegisterSubmit(e) {",
    "async function onRegisterSubmit(e) {"
);

s = s.replace(
    /(\s+)registerUser\(\);\s+return false;/,
    "$1await registerUser();\n\n    return false;"
);

s = s.replace(
    "function onLoginSubmit(e) {",
    "async function onLoginSubmit(e) {"
);

s = s.replace(
    /(\s+)login\(\);\s+return false;/,
    "$1await login();\n\n    return false;"
);

/* search via API optional - keep client filter for simplicity after load */

fs.writeFileSync(scriptPath, s, "utf8");

console.log("script.js actualizat pentru API + DB");
