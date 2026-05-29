const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const {
    getDb,
    runSchema,
    productFromRow,
    productToRow,
    dbConfig
} = require("./db/database");

const seedPath = path.join(__dirname, "seed", "products.json");

async function seedProducts(db) {
    if (!fs.existsSync(seedPath)) {
        console.warn(
            "Fara produse in DB si fara seed/products.json. " +
            "Ruleaza: npm run export-products && npm run init-db"
        );
        return;
    }

    const list = JSON.parse(fs.readFileSync(seedPath, "utf8"));

    const sql = `
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
    `;

    await db.query(sql, [list.map(productToRow)]);

    console.log("Auto-seed: " + list.length + " produse");
}

async function ensureDbReady() {
    await runSchema();

    const db = await getDb();
    const [rows] = await db.query(
        "SELECT COUNT(*) AS c FROM products"
    );

    if (Number(rows[0].c) === 0) {
        await seedProducts(db);
    }
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function productPayloadToRow(body) {
    return productToRow({
        id: body.id,
        name: String(body.name || "").trim(),
        category: String(body.category || "").trim(),
        color: String(body.color || "").trim(),
        colors: String(body.colors || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        sizes: String(body.sizes || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        material: String(body.material || "").trim(),
        season: String(body.season || "").trim(),
        price: Number(body.price || 0),
        oldPrice: body.oldPrice === "" ? null : Number(body.oldPrice || 0),
        image: String(body.image || "").trim(),
        imageLarge: String(body.imageLarge || body.image || "").trim(),
        rating: Number(body.rating || 0),
        description: String(body.description || "").trim(),
        longDescription: String(body.longDescription || "").trim(),
        stock: Number(body.stock || 0),
        sku: String(body.sku || "").trim(),
        badges: String(body.badges || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        reviews: [],
        careInstructions: String(body.careInstructions || "").trim(),
        similarIds: String(body.similarIds || "")
            .split(",")
            .map((x) => Number(x.trim()))
            .filter(Boolean)
    });
}

async function requireAdmin(req, res) {
    const userId = Number(req.get("x-user-id") || 0);

    if (userId !== 2) {
        res.status(401).json({
            error: "Doar Stefan poate folosi panoul de administrare"
        });
        return null;
    }

    const db = await getDb();
    const [rows] = await db.query(
        "SELECT id, full_name, email, role FROM users WHERE id = ?",
        [userId]
    );

    const user = rows[0];

    if (!user || user.id !== 2 || user.role !== "admin") {
        res.status(403).json({
            error: "Nu ai acces la panoul de administrare"
        });
        return null;
    }

    return user;
}

async function start() {
    const app = express();
    const PORT = process.env.PORT || 3000;
    const rootDir = path.join(__dirname, "..");

    app.use(cors());
    app.use(express.json());

    await ensureDbReady();

    app.get("/api/products", asyncRoute(async (req, res) => {
        const db = await getDb();
        let sql = "SELECT * FROM products ORDER BY id";
        const params = [];
        const category = req.query.category;

        if (category && category !== "toate") {
            sql =
                "SELECT * FROM products WHERE category = ? ORDER BY id";
            params.push(category);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows.map(productFromRow));
    }));

    app.get("/api/products/:id", asyncRoute(async (req, res) => {
        const db = await getDb();
        const [rows] = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        if (!rows[0]) {
            return res.status(404).json({
                error: "Produs negasit"
            });
        }

        res.json(productFromRow(rows[0]));
    }));

    app.get("/api/products-search", asyncRoute(async (req, res) => {
        const q = String(req.query.q || "").trim().toLowerCase();
        const category = req.query.category;
        const db = await getDb();
        let sql = "SELECT * FROM products";
        const params = [];

        if (category && category !== "toate") {
            sql += " WHERE category = ?";
            params.push(category);
        }

        sql += " ORDER BY id";

        const [rows] = await db.query(sql, params);

        if (!q) {
            return res.json(rows.map(productFromRow));
        }

        const filtered = rows.filter((row) => {
            const p = productFromRow(row);

            return (
                p.name.toLowerCase().includes(q) ||
                String(p.color).toLowerCase().includes(q) ||
                (p.colors || []).some(
                    (c) => c.toLowerCase().includes(q)
                ) ||
                String(p.material).toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                String(p.description).toLowerCase().includes(q) ||
                String(p.sku || "").toLowerCase().includes(q)
            );
        });

        res.json(filtered.map(productFromRow));
    }));

    app.post("/api/auth/register", asyncRoute(async (req, res) => {
        const fullName = String(req.body.fullName || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!fullName || !email || !password) {
            return res.status(400).json({
                error: "Completeaza toate campurile"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: "Introdu o adresa de email valida"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Parola trebuie sa aiba minim 8 caractere"
            });
        }

        if (!/\p{Lu}/u.test(password)) {
            return res.status(400).json({
                error: "Parola trebuie sa contina o litera mare"
            });
        }

        if (!/[^\p{L}\p{N}\s]/u.test(password)) {
            return res.status(400).json({
                error: "Parola trebuie sa contina un simbol"
            });
        }

        const db = await getDb();
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing[0]) {
            return res.status(409).json({
                error: "Exista deja un cont cu acest email"
            });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            [fullName, email, hash]
        );

        res.status(201).json({
            id: result.insertId,
            fullName,
            email,
            role: "customer"
        });
    }));

    app.post("/api/auth/login", asyncRoute(async (req, res) => {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                error: "Completeaza email si parola"
            });
        }

        const db = await getDb();
        const [rows] = await db.query(
            `
                SELECT id, full_name, email, password_hash
                , role
                FROM users
                WHERE email = ?
            `,
            [email]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                error: "Email sau parola incorecta"
            });
        }

        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) {
            return res.status(401).json({
                error: "Email sau parola incorecta"
            });
        }

        res.json({
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.id === 2 ? "admin" : "customer"
        });
    }));

    app.get("/api/admin/summary", asyncRoute(async (req, res) => {
        const admin = await requireAdmin(req, res);
        if (!admin) {
            return;
        }

        const db = await getDb();
        const [[usersCount], [productsCount], [stockCount]] =
            await Promise.all([
                db.query("SELECT COUNT(*) AS c FROM users"),
                db.query("SELECT COUNT(*) AS c FROM products"),
                db.query("SELECT COALESCE(SUM(stock), 0) AS c FROM products")
            ]);

        res.json({
            users: Number(usersCount[0].c),
            products: Number(productsCount[0].c),
            stock: Number(stockCount[0].c)
        });
    }));

    app.get("/api/admin/users", asyncRoute(async (req, res) => {
        const admin = await requireAdmin(req, res);
        if (!admin) {
            return;
        }

        const db = await getDb();
        const [rows] = await db.query(
            `
                SELECT id, full_name AS fullName, email, role, created_at AS createdAt
                FROM users
                ORDER BY id
            `
        );

        res.json(rows);
    }));

    app.post("/api/admin/products", asyncRoute(async (req, res) => {
        const admin = await requireAdmin(req, res);
        if (!admin) {
            return;
        }

        if (!req.body.name || !req.body.category || !req.body.price) {
            return res.status(400).json({
                error: "Completeaza nume, categorie si pret"
            });
        }

        const db = await getDb();
        const [maxRows] = await db.query(
            "SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM products"
        );

        req.body.id = Number(req.body.id || maxRows[0].nextId);

        const values = productPayloadToRow(req.body);

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
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `,
            values
        );

        const [rows] = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [req.body.id]
        );

        res.status(201).json(productFromRow(rows[0]));
    }));

    app.put("/api/admin/products/:id", asyncRoute(async (req, res) => {
        const admin = await requireAdmin(req, res);
        if (!admin) {
            return;
        }

        req.body.id = Number(req.params.id);
        const values = productPayloadToRow(req.body);

        const [result] = await (await getDb()).query(
            `
                UPDATE products SET
                    name = ?, category = ?, color = ?,
                    colors_json = ?, sizes_json = ?,
                    material = ?, season = ?, price = ?, old_price = ?,
                    image = ?, image_large = ?, rating = ?,
                    description = ?, long_description = ?,
                    stock = ?, sku = ?, badges_json = ?, reviews_json = ?,
                    care_instructions = ?, similar_ids_json = ?
                WHERE id = ?
            `,
            values.slice(1).concat(values[0])
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                error: "Produs negasit"
            });
        }

        const [rows] = await (await getDb()).query(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        res.json(productFromRow(rows[0]));
    }));

    app.delete("/api/admin/products/:id", asyncRoute(async (req, res) => {
        const admin = await requireAdmin(req, res);
        if (!admin) {
            return;
        }

        const [result] = await (await getDb()).query(
            "DELETE FROM products WHERE id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                error: "Produs negasit"
            });
        }

        res.json({
            ok: true
        });
    }));

    app.use(express.static(rootDir));

    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }

        res.sendFile(path.join(rootDir, "index.html"));
    });

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).json({
            error: "Eroare server. Verifica MySQL Workbench si parola."
        });
    });

    app.listen(PORT, () => {
        console.log("");
        console.log("  PikiWO server pornit");
        console.log("  http://localhost:" + PORT);
        console.log("  Baza MySQL: " + dbConfig.database);
        console.log("");
    });
}

start().catch((err) => {
    console.error("Nu pot porni serverul.");
    console.error(err.message);
    process.exit(1);
});
