const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const requireAuth = require("./auth");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

// API welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Coffee Ninja API is running!",
  });
});

// Test PostgreSQL connection
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.json({
      status: "ok",
      message: "Database connection successful!",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});


app.post("/api/inquiries", requireAuth , async (req, res) => {
  try {
    const { customer_name, contact, subject, description } = req.body;

    if (
      typeof customer_name !== "string" ||
      typeof contact !== "string" ||
      typeof subject !== "string" ||
      typeof description !== "string" ||
      !customer_name.trim() ||
      !contact.trim() ||
      !subject.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (
      customer_name.trim().length > 100 ||
      contact.trim().length > 30 ||
      subject.trim().length > 150
    ) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    const result = await pool.query(
      `INSERT INTO inquiries
        (customer_name, contact, subject, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        customer_name.trim(),
        contact.trim(),
        subject.trim(),
        description.trim(),
      ]
    );

    return res.status(201).json({
      message: "Inquiry created successfully.",
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Create inquiry failed:", error.message);

    return res.status(500).json({
      message: "Unable to create inquiry.",
    });
  }
});


app.get("/api/inquiries", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();

    const allowedStatuses = ["New", "In Progress", "Resolved"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid inquiry status.",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM inquiries
       WHERE (
         $1 = ''
         OR customer_name ILIKE '%' || $1 || '%'
         OR contact ILIKE '%' || $1 || '%'
         OR subject ILIKE '%' || $1 || '%'
         OR description ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR status = $2)
       ORDER BY created_at DESC, id DESC`,
      [search, status]
    );

    return res.json({
      count: result.rows.length,
      inquiries: result.rows,
    });
  } catch (error) {
    console.error("Fetch inquiries failed:", error.message);

    return res.status(500).json({
      message: "Unable to fetch inquiries.",
    });
  }
});


app.patch("/api/inquiries/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid inquiry ID.",
      });
    }

    const allowedStatuses = ["New", "In Progress", "Resolved"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid inquiry status.",
      });
    }

    const result = await pool.query(
      `UPDATE inquiries
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Inquiry not found.",
      });
    }

    return res.json({
      message: "Inquiry status updated successfully.",
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Update inquiry status failed:", error.message);

    return res.status(500).json({
      message: "Unable to update inquiry status.",
    });
  }
});


app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT id, username, password_hash
       FROM staff_users
       WHERE username = $1`,
      [username.trim()]
    );

    const staff = result.rows[0];

    if (
      !staff ||
      !(await bcrypt.compare(password, staff.password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const token = jwt.sign(
      { id: staff.id, username: staff.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      message: "Login successful.",
      staff: {
        id: staff.id,
        username: staff.username,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      message: "Unable to sign in.",
    });
  }
});


app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    staff: {
      id: req.staff.id,
      username: req.staff.username,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.json({ message: "Logged out successfully." });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
