-- Customer Inquiry Management System - Database Schema
-- Database: PostgreSQL

-- 1. Create Staff Users Table
CREATE TABLE IF NOT EXISTS staff_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL DEFAULT 'Staff Member',
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
    created_by_id INTEGER REFERENCES staff_users(id) ON DELETE RESTRICT,
    assigned_to_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade existing tables if columns are missing
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT 'Staff Member';
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin', 'employee'));
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES staff_users(id) ON DELETE RESTRICT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Indexes for optimized querying, searching and filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_contact ON inquiries(contact);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned ON inquiries(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_by ON inquiries(created_by_id);
