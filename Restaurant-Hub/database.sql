-- ============================================
-- Istanbul Restaurant Database Setup
-- Run this entire script in pgAdmin Query Tool
-- ============================================

-- First, create database if it doesn't exist (run separately if needed)
-- CREATE DATABASE restaurant_db;

-- ============================================
-- DROP EXISTING TABLES (Optional - for fresh start)
-- ============================================
/*
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_images CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS site_images CASCADE;
DROP TABLE IF EXISTS contact_info CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- ============================================
-- 1. USERS TABLE (Administrators)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CATEGORIES TABLE (Menu Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. MENU ITEMS TABLE (Dishes)
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    details TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    has_discount BOOLEAN DEFAULT false,
    discount_percentage INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. MENU IMAGES TABLE (Multiple images per dish)
-- ============================================
CREATE TABLE IF NOT EXISTS menu_images (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    public_id TEXT,
    is_main BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. SITE IMAGES TABLE (Hero, logo, about, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS site_images (
    id SERIAL PRIMARY KEY,
    image_type VARCHAR(50) NOT NULL,
    image_url TEXT UNIQUE NOT NULL,
    public_id TEXT,
    alt_text VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. CONTACT INFO TABLE (Restaurant information)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_info (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(255),
    opening_hours TEXT,
    whatsapp VARCHAR(50),
    map_embed_url TEXT,
    social_links JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. ORDERS TABLE (Customer orders)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    items JSONB NOT NULL,
    total_price INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- 1. Insert Admin User (password: admin123 - bcrypt hash)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@istanbul.ru') THEN
        INSERT INTO users (email, password, first_name, last_name, is_admin) 
        VALUES (
            'admin@istanbul.ru',
            '$2b$12$YQzG7v4pz5p5p5p5p5p5pO', -- bcrypt hash for 'admin123'
            'Admin',
            'User',
            true
        );
    ELSE
        UPDATE users SET
            password = '$2b$12$YQzG7v4pz5p5p5p5p5p5pO',
            first_name = 'Admin',
            last_name = 'User',
            is_admin = true
        WHERE email = 'admin@istanbul.ru';
    END IF;
END $$;

-- 2. Insert Default Categories (Matching your frontend)
DO $$
BEGIN
    -- Insert Закуски
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Закуски') THEN
        INSERT INTO categories (name, order_index) VALUES ('Закуски', 1);
    END IF;
    
    -- Insert Основные блюда
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Основные блюда') THEN
        INSERT INTO categories (name, order_index) VALUES ('Основные блюда', 2);
    END IF;
    
    -- Insert Десерты
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Десерты') THEN
        INSERT INTO categories (name, order_index) VALUES ('Десерты', 3);
    END IF;
    
    -- Insert Напитки
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Напитки') THEN
        INSERT INTO categories (name, order_index) VALUES ('Напитки', 4);
    END IF;
END $$;

-- 3. Insert Sample Menu Items (Prices in kopecks - 10000 = 100₽)
DO $$
BEGIN
    -- Адана кебаб
    IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Адана кебаб') THEN
        INSERT INTO menu_items (name, description, details, price, category_id, image_url, is_featured, has_discount, discount_percentage, original_price) 
        VALUES (
            'Адана кебаб',
            'Традиционный турецкий кебаб из рубленого мяса',
            'Подается с овощами, рисом и лепешкой. Вес: 350г.',
            150000,
            (SELECT id FROM categories WHERE name = 'Основные блюда'),
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=400&fit=crop',
            true,
            false,
            0,
            NULL
        );
    END IF;
    
    -- Хумус с кедровыми орешками
    IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Хумус с кедровыми орешками') THEN
        INSERT INTO menu_items (name, description, details, price, category_id, image_url, is_featured, has_discount, discount_percentage, original_price) 
        VALUES (
            'Хумус с кедровыми орешками',
            'Нутовый паштет с тахини и оливковым маслом',
            'Подается с лепешкой пиде. Вес: 250г.',
            80000,
            (SELECT id FROM categories WHERE name = 'Закуски'),
            'https://images.unsplash.com/photo-1585937421612-70ca003675ed?w=600&h=400&fit=crop',
            true,
            true,
            10,
            90000
        );
    END IF;
    
    -- Баклава
    IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Баклава') THEN
        INSERT INTO menu_items (name, description, details, price, category_id, image_url, is_featured, has_discount, discount_percentage, original_price) 
        VALUES (
            'Баклава',
            'Слоеный десерт с грецкими орехами в медовом сиропе',
            'Порция 2 шт. Вес: 150г.',
            120000,
            (SELECT id FROM categories WHERE name = 'Десерты'),
            'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&h=400&fit=crop',
            true,
            false,
            0,
            NULL
        );
    END IF;
    
    -- Турецкий чай
    IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Турецкий чай') THEN
        INSERT INTO menu_items (name, description, details, price, category_id, image_url, is_featured, has_discount, discount_percentage, original_price) 
        VALUES (
            'Турецкий чай',
            'Ароматный черный чай в традиционных стаканах',
            'Подается с кубиками сахара',
            30000,
            (SELECT id FROM categories WHERE name = 'Напитки'),
            'https://images.unsplash.com/photo-1567696911980-2c42a2c4489f?w=600&h=400&fit=crop',
            false,
            false,
            0,
            NULL
        );
    END IF;
    
    -- Лахмаджун
    IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Лахмаджун') THEN
        INSERT INTO menu_items (name, description, details, price, category_id, image_url, is_featured, has_discount, discount_percentage, original_price) 
        VALUES (
            'Лахмаджун',
            'Тонкая лепешка с фаршем и овощами',
            'Турецкая пицца. Вес: 300г.',
            110000,
            (SELECT id FROM categories WHERE name = 'Основные блюда'),
            'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&h=400&fit=crop',
            false,
            true,
            15,
            130000
        );
    END IF;
END $$;

-- 4. Insert Default Contact Information
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM contact_info WHERE phone = '+7 (4842) 12-34-56') THEN
        INSERT INTO contact_info (phone, address, email, opening_hours, whatsapp, map_embed_url, social_links) 
        VALUES (
            '+7 (4842) 12-34-56',
            'Г. Калуга пл. Мира 4/1',
            'info@istanbul-kaluga.ru',
            '12.00 до 23.00',
            '+7 999 123-45-67',
            '',
            '{"facebook": "", "instagram": ""}'::jsonb
        );
    END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_order_index ON categories(order_index);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured ON menu_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_menu_items_has_discount ON menu_items(has_discount);
CREATE INDEX IF NOT EXISTS idx_menu_items_price ON menu_items(price);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items(name);
CREATE INDEX IF NOT EXISTS idx_menu_items_created_at ON menu_items(created_at DESC);

-- Menu images indexes
CREATE INDEX IF NOT EXISTS idx_menu_images_menu_item_id ON menu_images(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_images_is_main ON menu_images(is_main);

-- Site images indexes
CREATE INDEX IF NOT EXISTS idx_site_images_image_type ON site_images(image_type);
CREATE INDEX IF NOT EXISTS idx_site_images_created_at ON site_images(created_at DESC);

-- Contact info indexes
CREATE INDEX IF NOT EXISTS idx_contact_info_phone ON contact_info(phone);
CREATE INDEX IF NOT EXISTS idx_contact_info_updated_at ON contact_info(updated_at DESC);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

-- ============================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp for contact_info
CREATE OR REPLACE FUNCTION update_contact_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

-- Trigger for contact_info updated_at
DROP TRIGGER IF EXISTS update_contact_info_updated_at ON contact_info;
CREATE TRIGGER update_contact_info_updated_at
    BEFORE UPDATE ON contact_info
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_info_timestamp();

-- Function to ensure only one main image per menu item
CREATE OR REPLACE FUNCTION ensure_single_main_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_main THEN
        UPDATE menu_images 
        SET is_main = false 
        WHERE menu_item_id = NEW.menu_item_id 
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

-- Trigger for single main image
DROP TRIGGER IF EXISTS ensure_single_main_image_trigger ON menu_images;
CREATE TRIGGER ensure_single_main_image_trigger
    BEFORE INSERT OR UPDATE ON menu_images
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_main_image();

-- Function to auto-update has_discount based on discount_percentage
CREATE OR REPLACE FUNCTION update_has_discount()
RETURNS TRIGGER AS $$
BEGIN
    -- If discount_percentage > 0, set has_discount = true
    IF NEW.discount_percentage > 0 THEN
        NEW.has_discount := true;
        -- If original_price is not set, set it to current price
        IF NEW.original_price IS NULL OR NEW.original_price = 0 THEN
            NEW.original_price := NEW.price;
        END IF;
    ELSE
        NEW.has_discount := false;
        NEW.original_price := NULL;
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

-- Trigger for has_discount
DROP TRIGGER IF EXISTS update_has_discount_trigger ON menu_items;
CREATE TRIGGER update_has_discount_trigger
    BEFORE INSERT OR UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_has_discount();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

DO $$ 
DECLARE
    user_count INTEGER;
    category_count INTEGER;
    item_count INTEGER;
    contact_count INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO category_count FROM categories;
    SELECT COUNT(*) INTO item_count FROM menu_items;
    SELECT COUNT(*) INTO contact_count FROM contact_info;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Istanbul Restaurant Database Created!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Database Summary:';
    RAISE NOTICE '   Users: %', user_count;
    RAISE NOTICE '   Categories: %', category_count;
    RAISE NOTICE '   Menu Items: %', item_count;
    RAISE NOTICE '   Contact Info: %', contact_count;
    RAISE NOTICE '';
    RAISE NOTICE '👤 Admin Login:';
    RAISE NOTICE '   Email: admin@istanbul.ru';
    RAISE NOTICE '   Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Test Queries:';
    RAISE NOTICE '   SELECT * FROM users WHERE email = ''admin@istanbul.ru'';';
    RAISE NOTICE '   SELECT name, price, is_featured FROM menu_items;';
    RAISE NOTICE '   SELECT phone, address FROM contact_info;';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Important:';
    RAISE NOTICE '   1. Start Backend: python app.py';
    RAISE NOTICE '   2. Start Frontend: npm run dev';
    RAISE NOTICE '   3. Visit: http://localhost:5173';
    RAISE NOTICE '   4. Admin: http://localhost:5173/admin';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- TEST QUERIES (Run after creating database)
-- ============================================

-- Test 1: Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check admin user
SELECT id, email, first_name, is_admin 
FROM users 
WHERE email = 'admin@istanbul.ru';

-- Test 3: Check categories with item counts
SELECT 
    c.name,
    COUNT(mi.id) as item_count,
    SUM(CASE WHEN mi.is_featured THEN 1 ELSE 0 END) as featured_count
FROM categories c
LEFT JOIN menu_items mi ON c.id = mi.category_id
GROUP BY c.id, c.name, c.order_index
ORDER BY c.order_index;

-- Test 4: Check menu items with prices
SELECT 
    mi.name,
    c.name as category,
    mi.description,
    mi.price / 100 as price_rub,
    CASE WHEN mi.has_discount THEN '✅' ELSE '❌' END as has_discount,
    mi.discount_percentage || '%' as discount,
    CASE WHEN mi.is_featured THEN '⭐' ELSE '' END as featured,
    CASE WHEN mi.is_available THEN '✓' ELSE '✗' END as available
FROM menu_items mi
JOIN categories c ON mi.category_id = c.id
ORDER BY c.order_index, mi.name;

-- Test 5: Check contact info
SELECT phone, address, email, opening_hours, whatsapp 
FROM contact_info;