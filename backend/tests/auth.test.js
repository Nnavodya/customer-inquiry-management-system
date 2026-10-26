const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const app = require("../server");

const pool = require("../db");

let server;
let baseUrl;

function createToken({ id = 1, role = "employee" } = {}) {
  const secret = process.env.JWT_SECRET || "default_test_secret";
  return jwt.sign({ id, username: role, role }, secret, { expiresIn: "1h" });
}

async function withQueryStub(queryStub, callback) {
  const originalQuery = pool.query;
  pool.query = queryStub;
  try {
    return await callback();
  } finally {
    pool.query = originalQuery;
  }
}

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

test("Security Rule: Unauthenticated inquiry edits are rejected with 401", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries/1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: "Customer",
      contact: "customer@example.com",
      subject: "Updated subject",
      description: "Updated description",
    }),
  });
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

test("Security Rule: Signed tokens without a recognized role are rejected with 401", async () => {
  const secret = process.env.JWT_SECRET || "default_test_secret";
  const tokenWithoutRole = jwt.sign(
    { id: 1, username: "staff1" },
    secret,
    { expiresIn: "1h" }
  );

  const response = await fetch(`${baseUrl}/api/inquiries`, {
    headers: {
      Cookie: `token=${tokenWithoutRole}`,
    },
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.match(data.message, /session is invalid or expired/i);
});

test("Authentication: Role token with a numeric-string database ID is accepted", async () => {
  const token = createToken({ id: "7" });

  await withQueryStub(async () => ({ rows: [] }), async () => {
    const response = await fetch(`${baseUrl}/api/inquiries`, {
      headers: {
        Cookie: `token=${token}`,
      },
    });

    assert.equal(response.status, 200);
  });
});

test("Access control: Employee inquiry list is scoped to created or assigned inquiries", async () => {
  let queryText;
  let queryValues;

  await withQueryStub(async (text, values) => {
    queryText = text;
    queryValues = values;
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries`, {
      headers: {
        Cookie: `token=${createToken({ id: 7 })}`,
      },
    });

    assert.equal(response.status, 200);
  });

  assert.match(queryText, /i\.created_by_id = \$5 OR i\.assigned_to_id = \$5/);
  assert.deepEqual(queryValues, ["", "", "", "employee", 7]);
});

test("Access control: Admin inquiry list bypasses employee ownership filtering", async () => {
  let queryText;
  let queryValues;

  await withQueryStub(async (text, values) => {
    queryText = text;
    queryValues = values;
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries`, {
      headers: {
        Cookie: `token=${createToken({ id: 9, role: "admin" })}`,
      },
    });

    assert.equal(response.status, 200);
  });

  assert.match(queryText, /\$4 = 'admin' OR i\.created_by_id = \$5/);
  assert.deepEqual(queryValues, ["", "", "", "admin", 9]);
});

test("Access control: Employee cannot fetch an inquiry they neither created nor were assigned", async () => {
  let queryText;
  let queryValues;

  await withQueryStub(async (text, values) => {
    queryText = text;
    queryValues = values;
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries/42`, {
      headers: {
        Cookie: `token=${createToken({ id: 7 })}`,
      },
    });
    const data = await response.json();

    assert.equal(response.status, 404);
    assert.match(data.message, /does not exist or you do not have access/i);
  });

  assert.match(queryText, /i\.created_by_id = \$3 OR i\.assigned_to_id = \$3/);
  assert.deepEqual(queryValues, ["42", "employee", 7]);
});

test("Access control: Employee cannot edit an inquiry they cannot access", async () => {
  let queryText;

  await withQueryStub(async (text) => {
    queryText = text;
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries/42`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${createToken({ id: 7 })}`,
      },
      body: JSON.stringify({
        customer_name: "Customer",
        contact: "customer@example.com",
        subject: "Updated subject",
        description: "Updated description",
        expected_updated_at: new Date().toISOString(),
      }),
    });

    assert.equal(response.status, 404);
  });

  assert.match(queryText, /created_by_id = \$3 OR assigned_to_id = \$3/);
});

test("Access control: Employee cannot change status of an inquiry they cannot access", async () => {
  let queryText;

  await withQueryStub(async (text) => {
    queryText = text;
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries/42/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${createToken({ id: 7 })}`,
      },
      body: JSON.stringify({ status: "Resolved" }),
    });

    assert.equal(response.status, 404);
  });

  assert.match(queryText, /created_by_id = \$3 OR assigned_to_id = \$3/);
});

test("Access control: Employee cannot reassign an inquiry they cannot access", async () => {
  const queries = [];

  await withQueryStub(async (text) => {
    queries.push(text);
    if (text.includes("FROM staff_users")) {
      return { rows: [{ id: 5 }] };
    }
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries/42/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${createToken({ id: 7 })}`,
      },
      body: JSON.stringify({ assigned_to_id: 5 }),
    });

    assert.equal(response.status, 404);
  });

  assert.equal(queries.length, 2);
  assert.match(queries[1], /created_by_id = \$4 OR assigned_to_id = \$4/);
});

test("Inquiry creation: The authenticated employee is recorded as creator", async () => {
  let insertValues;

  await withQueryStub(async (text, values) => {
    if (text.includes("INSERT INTO inquiries")) {
      insertValues = values;
      return {
        rows: [{ id: 88, customer_name: "Customer", created_by_id: 7 }],
      };
    }
    return { rows: [] };
  }, async () => {
    const response = await fetch(`${baseUrl}/api/inquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${createToken({ id: 7 })}`,
      },
      body: JSON.stringify({
        customer_name: " Customer ",
        contact: "customer@example.com",
        subject: "New inquiry",
        description: "Please help.",
      }),
    });

    assert.equal(response.status, 201);
  });

  assert.equal(insertValues[5], 7);
});

test("Inquiry edit validation: Invalid inquiry ID is rejected with 400", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries/invalid-id`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${createToken()}`,
    },
    body: JSON.stringify({
      customer_name: "Customer",
      contact: "customer@example.com",
      subject: "Updated subject",
      description: "Updated description",
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /invalid inquiry id/i);
});

test("Inquiry edit validation: Missing required fields are rejected with 400", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries/1`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${createToken()}`,
    },
    body: JSON.stringify({
      customer_name: "",
      contact: "customer@example.com",
      subject: "Updated subject",
      description: "Updated description",
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /required/i);
});

test("Direct Link Security & Validation: Invalid inquiry ID format is rejected with 400", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries/invalid-id`, {
    headers: {
      Cookie: `token=${createToken()}`,
    },
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /invalid inquiry id/i);
});

test("Business Validation: Submitting inquiry with missing required fields is rejected with 400", async () => {
  const response = await fetch(`${baseUrl}/api/inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${createToken()}`,
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
