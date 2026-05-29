CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    category VARCHAR(80) NOT NULL,
    color VARCHAR(80),
    colors_json LONGTEXT NOT NULL,
    sizes_json LONGTEXT NOT NULL,
    material VARCHAR(150),
    season VARCHAR(120),
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2),
    image VARCHAR(500),
    image_large VARCHAR(500),
    rating DECIMAL(3, 2) DEFAULT 0,
    description TEXT,
    long_description TEXT,
    stock INT DEFAULT 0,
    sku VARCHAR(80),
    badges_json LONGTEXT NOT NULL,
    reviews_json LONGTEXT NOT NULL,
    care_instructions TEXT,
    similar_ids_json LONGTEXT NOT NULL,
    INDEX idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
