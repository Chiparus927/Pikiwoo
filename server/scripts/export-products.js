/**
 * Extrage lista de produse din script.js și o salvează în seed/products.json
 * Rulează: npm run export-products
 */

const fs = require("fs");
const path = require("path");

const scriptPath = path.join(__dirname, "..", "..", "script.js");
const outPath = path.join(__dirname, "..", "seed", "products.json");

let content = fs.readFileSync(scriptPath, "utf8");

content = content.replace(/\r\n/g, "\n");

const markerStart = "let products = [";
const markerEnd =
    "];\n\n/* =========================\n   VARIABILE\n========================= */";

const start = content.indexOf(markerStart);

if (start === -1) {
    console.error("Nu găsesc 'let products = [' în script.js");
    process.exit(1);
}

const end = content.indexOf(markerEnd, start);

if (end === -1) {
    console.error("Nu găsesc sfârșitul array-ului products în script.js");
    process.exit(1);
}

const arrayCode =
    content.slice(
        start + "let products = ".length,
        end + 1
    );

let products;

try {
    products = eval(arrayCode);
} catch (err) {
    console.error("Eroare la parsare produse:", err.message);
    process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });

fs.writeFileSync(
    outPath,
    JSON.stringify(products, null, 2),
    "utf8"
);

console.log(
    "Salvat " +
    products.length +
    " produse în seed/products.json"
);
