/*
# Restaurant Management Schema

## Overview
Creates the core tables for a restaurant order management and analytics system.

## New Tables

### categories
Dish categories (e.g., Appetizers, Mains, Desserts, Drinks).
- id: uuid primary key
- name: text, unique
- color: text (hex color for UI)
- created_at: timestamp

### dishes
Menu items belonging to a category.
- id: uuid primary key
- name: text
- category_id: uuid FK -> categories
- price: numeric
- prep_time_minutes: integer (estimated prep time)
- active: boolean (whether it's currently on menu)
- created_at: timestamp

### orders
Customer orders with line items stored as JSONB array.
- id: uuid primary key
- order_number: integer auto-increment via sequence
- table_number: integer
- status: text (pending, preparing, ready, delivered, cancelled)
- items: jsonb array of {dish_id, dish_name, quantity, unit_price, category_id}
- total_amount: numeric
- notes: text
- ordered_at: timestamptz
- completed_at: timestamptz
- created_at: timestamptz

## Security
- RLS enabled on all tables
- anon + authenticated CRUD (no auth required for this app)
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#4F46E5',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  prep_time_minutes integer NOT NULL DEFAULT 15,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dishes" ON dishes;
CREATE POLICY "anon_select_dishes" ON dishes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dishes" ON dishes;
CREATE POLICY "anon_insert_dishes" ON dishes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dishes" ON dishes;
CREATE POLICY "anon_update_dishes" ON dishes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dishes" ON dishes;
CREATE POLICY "anon_delete_dishes" ON dishes FOR DELETE TO anon, authenticated USING (true);

-- Orders sequence for human-readable order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL DEFAULT nextval('order_number_seq'),
  table_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','delivered','cancelled')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category_id);

-- Seed categories
INSERT INTO categories (name, color) VALUES
  ('Appetizers', '#F59E0B'),
  ('Mains', '#EF4444'),
  ('Pasta & Rice', '#8B5CF6'),
  ('Seafood', '#3B82F6'),
  ('Desserts', '#EC4899'),
  ('Drinks', '#10B981')
ON CONFLICT (name) DO NOTHING;
