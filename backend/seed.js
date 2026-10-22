require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seedDatabase() {
  console.log("Starting database seed...");

  try {
    // 1. Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL DEFAULT 'Staff Member',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT 'Staff Member';

      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL,
        contact VARCHAR(50) NOT NULL,
        subject VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
        assigned_to_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
      CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inquiries_contact ON inquiries(contact);
    `);

    // 2. Hash default password
    const defaultPassword = "Password123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 3. Upsert default staff accounts
    const staff1Result = await pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
       RETURNING id, username`,
      ["staff1", passwordHash, "Sarah Perera"]
    );

    const staff2Result = await pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
       RETURNING id, username`,
      ["staff2", passwordHash, "Kasun Silva"]
    );

    const staff1Id = staff1Result.rows[0].id;
    const staff2Id = staff2Result.rows[0].id;

    console.log("Staff accounts seeded:");
    console.log(`- Username: staff1 / Password: ${defaultPassword} (Sarah Perera)`);
    console.log(`- Username: staff2 / Password: ${defaultPassword} (Kasun Silva)`);

    // 4. Seed sample inquiries if none exist
    const countCheck = await pool.query("SELECT COUNT(*) FROM inquiries");
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      await pool.query(
        `INSERT INTO inquiries (customer_name, contact, subject, description, status, assigned_to_id)
         VALUES
         ($1, $2, $3, $4, 'New', NULL),
         ($5, $6, $7, $8, 'In Progress', $9),
         ($10, $11, $12, $13, 'Resolved', $14)`,
        [
          // Inquiry 1 - New
          "Amila Fernando",
          "amila.f@example.com",
          "Inquiry regarding Cold Brew monthly subscription",
          "Hi, I would like to know if you offer weekly delivery packages for office supplies of freshly brewed cold brew canisters.",
          // Inquiry 2 - In Progress
          "Dinesh Jayawardena",
          "+94 77 123 4567",
          "Espresso Machine Calibration Request",
          "Our café unit's steam wand is displaying pressure irregularities after the morning rush. Requesting technician support.",
          staff1Id,
          // Inquiry 3 - Resolved
          "Nirosha Perera",
          "nirosha@techcorp.lk",
          "Corporate Event Coffee Catering",
          "Inquiring about mobile bar setup for our annual meetup with 80 attendees. Quotation sent and date confirmed.",
          staff2Id,
        ]
      );
      console.log("3 initial sample inquiries successfully inserted.");
    } else {
      console.log(`Inquiries table already contains ${countCheck.rows[0].count} records. Skipped sample insert.`);
    }

    console.log("Database seed completed successfully!");
  } catch (err) {
    console.error("Database seed failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDatabase();
