const fs = require("fs");
const path = require("path");

const {
    getDb,
    runSchema,
    productToRow,
    dbConfig
} = require("./database");

async function seedProducts(db) {
    const seedPath = path.join(
        __dirname,
        "..",
        "seed",
        "products.json"
    );

    if (!fs.existsSync(seedPath)) {
        console.error(
            "Lipseste seed/products.json. Ruleaza: npm run export-products"
        );
        process.exit(1);
    }

    const list = JSON.parse(fs.readFileSync(seedPath, "utf8"));

    await db.query(
        `
            INSERT INTO products (
                id, name, category, color,
                colors_json, sizes_json,
                material, season, price, old_price,
                image, image_large, rating,
                description, long_description,
                stock, sku, badges_json, reviews_json,
                care_instructions, similar_ids_json
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                category = VALUES(category),
                color = VALUES(color),
                colors_json = VALUES(colors_json),
                sizes_json = VALUES(sizes_json),
                material = VALUES(material),
                season = VALUES(season),
                price = VALUES(price),
                old_price = VALUES(old_price),
                image = VALUES(image),
                image_large = VALUES(image_large),
                rating = VALUES(rating),
                description = VALUES(description),
                long_description = VALUES(long_description),
                stock = VALUES(stock),
                sku = VALUES(sku),
                badges_json = VALUES(badges_json),
                reviews_json = VALUES(reviews_json),
                care_instructions = VALUES(care_instructions),
                similar_ids_json = VALUES(similar_ids_json)
        `,
        [list.map(productToRow)]
    );

    console.log("Produse in baza de date: " + list.length);
}

async function main() {
    await runSchema();

    const db = await getDb();
    const [productRows] = await db.query(
        "SELECT COUNT(*) AS c FROM products"
    );

    if (Number(productRows[0].c) === 0) {
        await seedProducts(db);
    } else {
        console.log(
            "Baza de date exista deja (" +
            productRows[0].c +
            " produse). Nu re-seed."
        );
    }

    const [userRows] = await db.query(
        "SELECT COUNT(*) AS c FROM users"
    );

    console.log("Utilizatori inregistrati: " + userRows[0].c);
    console.log("Baza MySQL: " + dbConfig.database);

    await db.end();
}

main().catch((err) => {
    console.error("Nu pot initializa baza MySQL.");
    console.error(err.message);
    process.exit(1);
});
