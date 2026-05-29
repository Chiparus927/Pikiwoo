const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "Pikowoo",
    waitForConnections: true,
    connectionLimit: 10
};

let pool = null;

function quoteIdentifier(value) {
    return "`" + String(value).replace(/`/g, "``") + "`";
}

async function ensureDatabase() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
    });

    await connection.query(
        "CREATE DATABASE IF NOT EXISTS " +
        quoteIdentifier(dbConfig.database) +
        " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    await connection.end();
}

async function getDb() {
    if (!pool) {
        await ensureDatabase();
        pool = mysql.createPool(dbConfig);
    }

    return pool;
}

async function runSchema() {
    const schema = fs.readFileSync(
        path.join(__dirname, "schema.sql"),
        "utf8"
    );

    const db = await getDb();
    const statements = schema
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);

    for (const statement of statements) {
        await db.query(statement);
    }

    await runMigrations(db);
}

async function runMigrations(db) {
    const [roleColumns] = await db.query(
        "SHOW COLUMNS FROM users LIKE 'role'"
    );

    if (!roleColumns.length) {
        await db.query(
            "ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'customer'"
        );
    }

    await db.query(
        "UPDATE users SET role = 'customer' WHERE id <> 2"
    );

    await db.query(
        "UPDATE users SET role = 'admin' WHERE id = 2"
    );
}

function readJson(value, fallback = []) {
    if (!value) {
        return fallback;
    }

    if (Array.isArray(value) || typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function productFromRow(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        category: row.category,
        color: row.color,
        colors: readJson(row.colors_json),
        sizes: readJson(row.sizes_json),
        material: row.material,
        season: row.season,
        price: Number(row.price),
        oldPrice: row.old_price === null ? null : Number(row.old_price),
        image: row.image,
        imageLarge: row.image_large,
        rating: Number(row.rating || 0),
        description: row.description,
        longDescription: row.long_description,
        stock: Number(row.stock || 0),
        sku: row.sku,
        badges: readJson(row.badges_json),
        reviews: readJson(row.reviews_json),
        careInstructions: row.care_instructions,
        similarIds: readJson(row.similar_ids_json)
    };
}

function productToRow(p) {
    return [
        p.id,
        p.name,
        p.category,
        p.color || "",
        JSON.stringify(p.colors || []),
        JSON.stringify(p.sizes || []),
        p.material || "",
        p.season || "",
        p.price,
        p.oldPrice ?? null,
        p.image || "",
        p.imageLarge || p.image || "",
        p.rating ?? 0,
        p.description || "",
        p.longDescription || "",
        p.stock ?? 0,
        p.sku || "",
        JSON.stringify(p.badges || []),
        JSON.stringify(p.reviews || []),
        p.careInstructions || "",
        JSON.stringify(p.similarIds || [])
    ];
}

module.exports = {
    getDb,
    runSchema,
    productFromRow,
    productToRow,
    dbConfig
};
