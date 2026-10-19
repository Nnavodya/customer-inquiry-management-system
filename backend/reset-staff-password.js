
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function resetPassword() {
  const username = "staff1";
  const newPassword = "CoffeeTest789!";

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      `UPDATE staff_users
       SET password_hash = $1
       WHERE username = $2
       RETURNING id, username`,
      [passwordHash, username]
    );

    if (result.rowCount === 0) {
      console.log("Staff account not found.");
    } else {
      console.log("Test password reset successfully.");
      console.log("Username: staff1");
      console.log("Use the password configured in reset-staff-password.js.");
    }
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

resetPassword();
