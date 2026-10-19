
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const API_URL = "http://localhost:5000/api";

type Status = "New" | "In Progress" | "Resolved";

type Inquiry = {
  id: number;
  customer_name: string;
  contact: string;
  subject: string;
  description: string;
  status: Status;
  created_at: string;
};

export default function Home() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInquiries(
    searchText = search,
    statusText = filterStatus
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      if (statusText) {
        params.set("status", statusText);
      }

      const response = await fetch(
        `${API_URL}/inquiries?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load inquiries.");
      }

      setInquiries(data.inquiries);
    } catch {
      setError("Could not connect to the server. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries("", "");
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          contact,
          subject,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save inquiry.");
      }

      setCustomerName("");
      setContact("");
      setSubject("");
      setDescription("");
      setSearch("");
      setFilterStatus("");
      setMessage("Inquiry created successfully.");

      await loadInquiries("", "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save inquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: Status) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/inquiries/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update status.");
      }

      setMessage("Inquiry status updated.");
      await loadInquiries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update status."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-2xl bg-slate-900 p-6 text-white shadow">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            Coffee Ninja
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Customer Inquiry Management
          </h1>
          <p className="mt-2 text-slate-300">
            Record, search and manage customer inquiries.
          </p>
        </header>

        {message && (
          <p role="status" className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
            {error}
          </p>
        )}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Create New Inquiry</h2>

          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <input
              required
              maxLength={100}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="rounded-lg border border-slate-300 p-3"
            />

            <input
              required
              maxLength={30}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact number or email"
              className="rounded-lg border border-slate-300 p-3"
            />

            <input
              required
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Inquiry subject"
              className="rounded-lg border border-slate-300 p-3 sm:col-span-2"
            />

            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              rows={3}
              className="rounded-lg border border-slate-300 p-3 sm:col-span-2"
            />

            <button
              disabled={saving}
              type="submit"
              className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50 sm:col-span-2"
            >
              {saving ? "Saving..." : "Create Inquiry"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Customer Inquiries</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadInquiries(search, filterStatus);
            }}
            className="mb-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact or subject..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
            >
              Search
            </button>
          </form>

          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading inquiries...</p>
          ) : inquiries.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No inquiries found. Try another search or create an inquiry.
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <article
                  key={inquiry.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h3 className="text-lg font-bold">{inquiry.subject}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {inquiry.customer_name} · {inquiry.contact}
                      </p>
                    </div>

                    <select
                      aria-label={`Status for ${inquiry.subject}`}
                      value={inquiry.status}
                      onChange={(e) =>
                        handleStatusChange(inquiry.id, e.target.value as Status)
                      }
                      className="h-fit rounded-lg border border-slate-300 p-2"
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-slate-700">
                    {inquiry.description}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Inquiry #{inquiry.id} ·{" "}
                    {new Date(inquiry.created_at).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
