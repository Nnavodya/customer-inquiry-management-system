const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const app = require("../server");

const pool = require("../db");

let server;
let baseUrl;

// Spin up test server on a free dynamic port before tests run
test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("Security Rule: Unauthenticated requests to /api/inquiries are rejected with 401", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries`);
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.message, "Please sign in to continue.");
});

test("Security Rule: Invalid or malformed authentication tokens are rejected with 401", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries`, {
    headers: {
      Cookie: "token=invalid-tampered-token",
    },
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(
    data.message,
    "Your session is invalid or expired. Please sign in again."
  );
});

test("Direct Link Security & Validation: Invalid inquiry ID format is rejected with 400", async () => {
  const secret = process.env.JWT_SECRET || "default_test_secret";
  const validToken = jwt.sign({ id: 1, username: "staff1" }, secret, {
    expiresIn: "1h",
  });

  const response = await fetch(`${baseUrl}/api/inquiries/invalid-id`, {
    headers: {
      Cookie: `token=${validToken}`,
    },
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /invalid inquiry id/i);
});

test("Business Validation: Submitting inquiry with missing required fields is rejected with 400", async () => {
  const secret = process.env.JWT_SECRET || "default_test_secret";
  const validToken = jwt.sign({ id: 1, username: "staff1" }, secret, {
    expiresIn: "1h",
  });

  const response = await fetch(`${baseUrl}/api/inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${validToken}`,
    },
    body: JSON.stringify({
      customer_name: "",
      contact: "valid@email.com",
      subject: "Test",
      description: "Test description",
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /required/i);
});
