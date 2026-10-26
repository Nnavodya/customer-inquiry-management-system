-- Customer Inquiry Management System - Seed Data
-- Test staff credentials:
-- Username: staff1 | Password: Password123!
-- Username: staff2 | Password: Password123!
-- Username: admin | Password: Password123!

-- 1. Insert Seed Staff Users (bcrypt hashed password: Password123!)
INSERT INTO staff_users (username, password_hash, full_name, role)
VALUES
    ('staff1', '$2b$10$N0uZ50Fs1n2TV8NYRy1XG.Cws/LXDq8NuIQ00a91/Oek.BqGuOK/O', 'Sarah Perera', 'employee'),
    ('staff2', '$2b$10$N0uZ50Fs1n2TV8NYRy1XG.Cws/LXDq8NuIQ00a91/Oek.BqGuOK/O', 'Kasun Silva', 'employee'),
    ('admin', '$2b$10$N0uZ50Fs1n2TV8NYRy1XG.Cws/LXDq8NuIQ00a91/Oek.BqGuOK/O', 'System Administrator', 'admin')
ON CONFLICT (username) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Assign historical records to their assignee or the administrator.
UPDATE inquiries
SET created_by_id = COALESCE(
    assigned_to_id,
    (SELECT id FROM staff_users WHERE username = 'admin')
)
WHERE created_by_id IS NULL;

ALTER TABLE inquiries ALTER COLUMN created_by_id SET NOT NULL;

-- 2. Insert Seed Inquiries
INSERT INTO inquiries (customer_name, contact, subject, description, status, assigned_to_id, created_by_id)
VALUES
    (
        'Amila Fernando',
        'amila.f@example.com',
        'Inquiry regarding Cold Brew monthly subscription',
        'Hi, I would like to know if you offer weekly delivery packages for office supplies of freshly brewed cold brew canisters.',
        'New',
        NULL,
        (SELECT id FROM staff_users WHERE username = 'admin')
    ),
    (
        'Dinesh Jayawardena',
        '+94 77 123 4567',
        'Espresso Machine Calibration Request',
        'Our café unit steam wand is displaying pressure irregularities after the morning rush. Requesting technician support.',
        'In Progress',
        (SELECT id FROM staff_users WHERE username = 'staff1'),
        (SELECT id FROM staff_users WHERE username = 'staff1')
    ),
    (
        'Nirosha Perera',
        'nirosha@techcorp.lk',
        'Corporate Event Coffee Catering',
        'Inquiring about mobile bar setup for our annual meetup with 80 attendees. Quotation sent and date confirmed.',
        'Resolved',
        (SELECT id FROM staff_users WHERE username = 'staff2'),
        (SELECT id FROM staff_users WHERE username = 'staff2')
    )
ON CONFLICT DO NOTHING;
