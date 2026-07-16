-- =============================================================================
-- ERICKO ENTERPRISE POS — MySQL Schema (XAMPP)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    parent_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS brands (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    category_id CHAR(36),
    brand_id CHAR(36),
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL,
    reorder_level INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    code VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    requires_reference TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id CHAR(36),
    user_id CHAR(36),
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL,
    change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    sale_id CHAR(36) NOT NULL,
    product_id CHAR(36),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =============================================================================
-- SEED DATA
-- =============================================================================
INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@ericko.co.ke', 'HASHED_PASSWORD_HERE', 'Admin', 'User');

INSERT IGNORE INTO payment_methods (id, name, code, requires_reference) VALUES
('00000000-0000-0000-0000-000000000002', 'Cash', 'CASH', 0),
('00000000-0000-0000-0000-000000000003', 'M-Pesa', 'MPESA', 1),
('00000000-0000-0000-0000-000000000004', 'Card', 'CARD', 1);

INSERT IGNORE INTO categories (id, name, description, display_order) VALUES
('00000000-0000-0000-0000-000000000010', 'Electronics', 'Electronic devices and accessories', 1),
('00000000-0000-0000-0000-000000000011', 'Groceries', 'Food and household items', 2);

INSERT IGNORE INTO products (id, sku, barcode, name, description, selling_price, cost_price, reorder_level, category_id) VALUES
('00000000-0000-0000-0000-000000000100', 'SKU001', '1234567890123', 'Coca-Cola 500ml', 'Refreshing soft drink', 50.00, 35.00, 24, '00000000-0000-0000-0000-000000000011'),
('00000000-0000-0000-0000-000000000101', 'SKU002', '1234567890124', 'Bread White', 'Fresh white bread', 60.00, 45.00, 10, '00000000-0000-0000-0000-000000000011');
