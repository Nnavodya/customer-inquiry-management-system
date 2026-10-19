
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createStaff() {
  const username = "staff1";
  const password = "ChangeMe123!";

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO staff_users (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO NOTHING`,
      [username, passwordHash]
    );

    console.log("Staff account setup completed.");
    console.log("Username:", username);
    console.log("If this is a new account, use the password configured in create-staff.js.");
  } catch (error) {
    console.error("Could not create staff account:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createStaff();
