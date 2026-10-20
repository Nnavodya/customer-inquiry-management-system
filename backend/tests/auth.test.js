
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL = "http://localhost:5000";

test("Unauthenticated users cannot access inquiries", async () => {
  const response = await fetch(`${BASE_URL}/api/inquiries`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(
    data.message,
    "Please sign in to continue."
  );
});

test("Invalid authentication tokens are rejected", async () => {
  const response = await fetch(`${BASE_URL}/api/inquiries`, {
    headers: {
      Cookie: "token=invalid-token",
    },
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(
    data.message,
    "Your session is invalid or expired. Please sign in again."
  );
});
