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


// List all staff members with full workload & performance metrics (active, resolved, total)
app.get("/api/staff", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         su.id, 
         su.username, 
         su.full_name,
         COUNT(i.id) FILTER (WHERE i.status != 'Resolved')::int AS active_count,
         COUNT(i.id) FILTER (WHERE i.status = 'Resolved')::int AS resolved_count,
         COUNT(i.id)::int AS total_assigned
       FROM staff_users su
       LEFT JOIN inquiries i
         ON su.id = i.assigned_to_id
        AND ($1 = 'admin' OR i.assigned_to_id = $2)
       GROUP BY su.id, su.username, su.full_name
       ORDER BY active_count ASC, su.id ASC`,
      [req.staff.role, req.staff.id]
    );
    return res.json({ staff: result.rows });
  } catch (error) {
    console.error("Fetch staff failed:", error.message);
    return res.status(500).json({ message: "Unable to fetch staff members." });
  }
});

// Create new customer inquiry
app.post("/api/inquiries", requireAuth, async (req, res) => {
  try {
    const { customer_name, contact, subject, description, assigned_to_id } = req.body;

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

    const trimmedCustomer = customer_name.trim();
    const trimmedContact = contact.trim();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (
      trimmedCustomer.length > 100 ||
      trimmedContact.length > 50 ||
      trimmedSubject.length > 150
    ) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    // Format validation for contact (either email or phone)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact);
    const isPhone = /^[\d\s+\-()]{7,25}$/.test(trimmedContact);
    if (!isEmail && !isPhone) {
      return res.status(400).json({
        message: "Please provide a valid contact email address or phone number.",
      });
    }

    // Deduplication Policy: Reject identical unresolved inquiries submitted within 10 minutes
    const duplicateCheck = await pool.query(
      `SELECT id, status, created_at
       FROM inquiries
       WHERE LOWER(contact) = LOWER($1)
         AND LOWER(subject) = LOWER($2)
         AND status != 'Resolved'
         AND created_at > NOW() - INTERVAL '10 minutes'
       LIMIT 1`,
      [trimmedContact, trimmedSubject]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        message: `A similar active inquiry (#${duplicateCheck.rows[0].id}) was submitted recently. To prevent duplicates, please update the existing inquiry.`,
      });
    }

    // Validate assigned staff if provided
    let verifiedAssignedId = null;
    if (assigned_to_id) {
      const staffCheck = await pool.query(
        "SELECT id FROM staff_users WHERE id = $1",
        [assigned_to_id]
      );
      if (staffCheck.rows.length > 0) {
        verifiedAssignedId = assigned_to_id;
      }
    }

    const result = await pool.query(
      `INSERT INTO inquiries
        (customer_name, contact, subject, description, assigned_to_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        trimmedCustomer,
        trimmedContact,
        trimmedSubject,
        trimmedDescription,
        verifiedAssignedId,
        req.staff.id,
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

// Update the customer-provided details of an existing inquiry
app.put("/api/inquiries/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, contact, subject, description, expected_updated_at } =
      req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid inquiry ID. Must be a positive integer.",
      });
    }

    if (
      typeof expected_updated_at !== "string" ||
      Number.isNaN(new Date(expected_updated_at).getTime())
    ) {
      return res.status(400).json({
        message: "A valid inquiry update timestamp is required.",
      });
    }

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

    const trimmedCustomer = customer_name.trim();
    const trimmedContact = contact.trim();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (
      trimmedCustomer.length > 100 ||
      trimmedContact.length > 50 ||
      trimmedSubject.length > 150
    ) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact);
    const isPhone = /^[\d\s+\-()]{7,25}$/.test(trimmedContact);
    if (!isEmail && !isPhone) {
      return res.status(400).json({
        message: "Please provide a valid contact email address or phone number.",
      });
    }

    const currentResult = await pool.query(
      `SELECT id, updated_at
       FROM inquiries
       WHERE id = $1
         AND ($2 = 'admin' OR created_by_id = $3 OR assigned_to_id = $3)`,
      [id, req.staff.role, req.staff.id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        message: `Inquiry #${id} does not exist or you do not have access.`,
      });
    }

    const clientTime = new Date(expected_updated_at).getTime();
    const serverTime = new Date(currentResult.rows[0].updated_at).getTime();
    if (Math.abs(serverTime - clientTime) > 1000) {
      return res.status(409).json({
        message:
          "This inquiry was modified by another session. Please refresh your screen to see the latest changes.",
        current_updated_at: currentResult.rows[0].updated_at,
      });
    }

    const result = await pool.query(
      `UPDATE inquiries
       SET customer_name = $1,
           contact = $2,
           subject = $3,
           description = $4,
           updated_at = NOW()
       WHERE id = $5
         AND ($6 = 'admin' OR assigned_to_id = $7)
       RETURNING *`,
      [
        trimmedCustomer,
        trimmedContact,
        trimmedSubject,
        trimmedDescription,
        id,
        req.staff.role,
        req.staff.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `Inquiry #${id} does not exist or you do not have access.`,
      });
    }

    return res.json({
      message: "Inquiry updated successfully.",
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Update inquiry failed:", error.message);
    return res.status(500).json({
      message: "Unable to update inquiry.",
    });
  }
});

// List inquiries with search, status, and staff assignment filtering
app.get("/api/inquiries", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const assignedTo = String(req.query.assigned_to || "").trim();

    const allowedStatuses = ["New", "In Progress", "Resolved"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid inquiry status filter.",
      });
    }

    const result = await pool.query(
      `SELECT 
         i.id,
         i.customer_name,
         i.contact,
         i.subject,
         i.description,
         i.status,
         i.assigned_to_id,
         i.created_at,
         i.updated_at,
         su.username AS assigned_username,
         su.full_name AS assigned_full_name
       FROM inquiries i
       LEFT JOIN staff_users su ON i.assigned_to_id = su.id
       WHERE (
         $1 = ''
         OR i.customer_name ILIKE '%' || $1 || '%'
         OR i.contact ILIKE '%' || $1 || '%'
         OR i.subject ILIKE '%' || $1 || '%'
         OR i.description ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR i.status = $2)
       AND ($3 = '' OR i.assigned_to_id = $3::int)
       AND ($4 = 'admin' OR i.assigned_to_id = $5)
       ORDER BY i.created_at DESC, i.id DESC`,
      [search, status, assignedTo, req.staff.role, req.staff.id]
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

// Get single inquiry detail by ID (Supports Direct Link Situation)
app.get("/api/inquiries/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid inquiry ID. Must be a positive integer.",
      });
    }

    const result = await pool.query(
      `SELECT 
         i.id,
         i.customer_name,
         i.contact,
         i.subject,
         i.description,
         i.status,
         i.assigned_to_id,
         i.created_at,
         i.updated_at,
         su.username AS assigned_username,
         su.full_name AS assigned_full_name
       FROM inquiries i
       LEFT JOIN staff_users su ON i.assigned_to_id = su.id
       WHERE i.id = $1
         AND ($2 = 'admin' OR i.assigned_to_id = $3)`,
      [id, req.staff.role, req.staff.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `Inquiry #${id} does not exist or you do not have access.`,
      });
    }

    return res.json({
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Fetch inquiry detail failed:", error.message);

    return res.status(500).json({
      message: "Unable to fetch inquiry detail.",
    });
  }
});

// Update inquiry status with State Machine Transition & Stale Data checks
app.patch("/api/inquiries/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, expected_updated_at } = req.body;

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

    // 1. Fetch current status to enforce state transition rules
    const currentCheck = await pool.query(
      `SELECT id, status, updated_at
       FROM inquiries
       WHERE id = $1
         AND ($2 = 'admin' OR assigned_to_id = $3)`,
      [id, req.staff.role, req.staff.id]
    );

    if (currentCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Inquiry not found.",
      });
    }

    const currentRecord = currentCheck.rows[0];

    // Check if status is already the requested status
    if (currentRecord.status === status) {
      return res.status(400).json({
        message: `Inquiry is already in '${status}' status.`,
      });
    }

    // State Transition Rule: Cannot jump from Resolved directly back to New
    if (currentRecord.status === "Resolved" && status === "New") {
      return res.status(400).json({
        message: "Resolved inquiries cannot be moved directly to 'New'. Please move to 'In Progress' to reopen.",
      });
    }

    // Stale Data Check (Optimistic Concurrency Control):
    if (expected_updated_at) {
      const clientTime = new Date(expected_updated_at).getTime();
      const serverTime = new Date(currentRecord.updated_at).getTime();
      if (Math.abs(serverTime - clientTime) > 1000) {
        return res.status(409).json({
          message: "This inquiry was modified by another session. Please refresh your screen to see the latest changes.",
          current_status: currentRecord.status,
          current_updated_at: currentRecord.updated_at,
        });
      }
    }

    const result = await pool.query(
      `UPDATE inquiries
       SET status = $1, updated_at = NOW()
       WHERE id = $2
         AND ($3 = 'admin' OR assigned_to_id = $4)
       RETURNING *`,
      [status, id, req.staff.role, req.staff.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `Inquiry #${id} does not exist or you do not have access.`,
      });
    }

    return res.json({
      message: `Inquiry status updated to '${status}'.`,
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Update inquiry status failed:", error.message);

    return res.status(500).json({
      message: "Unable to update inquiry status.",
    });
  }
});

// Assign inquiry to a staff member
app.patch("/api/inquiries/:id/assign", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to_id } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid inquiry ID.",
      });
    }

    if (assigned_to_id !== null && assigned_to_id !== undefined) {
      const staffCheck = await pool.query(
        "SELECT id FROM staff_users WHERE id = $1",
        [assigned_to_id]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Selected staff member does not exist.",
        });
      }
    }

    const result = await pool.query(
      `UPDATE inquiries
       SET assigned_to_id = $1, updated_at = NOW()
       WHERE id = $2
         AND ($3 = 'admin' OR assigned_to_id = $4)
       RETURNING *`,
      [assigned_to_id || null, id, req.staff.role, req.staff.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Inquiry not found or you do not have access.",
      });
    }

    return res.json({
      message: "Inquiry assignment updated.",
      inquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Assign inquiry failed:", error.message);
    return res.status(500).json({ message: "Unable to assign inquiry." });
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
      `SELECT id, username, password_hash, role
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
      { id: Number(staff.id), username: staff.username, role: staff.role },
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
        role: staff.role,
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
      role: req.staff.role,
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


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
