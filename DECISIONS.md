# Engineering Decisions & System Design

This document summarizes the implemented scope, key decisions, and known limitations of the Customer Inquiry Management System for Coffee Ninja (Pvt) Ltd, in the context of the assignment workflow.

## Implemented scope and assumptions

- A Coffee Ninja staff member (employee or admin) signs in and records an inquiry on behalf of a customer who contacted the business. Customers do not have app accounts or submit inquiries directly.
- Employees can access inquiries they created or that are assigned to them; admins can access all inquiries. The API enforces this scope, and inaccessible inquiry details return `404`.
- Staff can assign or unassign inquiries, search and filter the queue, edit customer-provided details, and move inquiries between `New`, `In Progress`, and `Resolved`. Reopening a resolved inquiry requires confirmation in the UI and changes it to `In Progress`; a direct transition to `New` is rejected.
- The create form suggests the staff member with the lowest active workload. This is a suggestion, not a guaranteed or automatic assignment. Admins also have Team Profiles.
- Assignment addresses who is handling the inquiry, but the app does not keep a chronological activity history of status or assignment changes. It shows current status and last-updated time, not a full audit trail.

## Key decisions and trade-offs

- **Staff ownership and assignment:** `created_by_id` records which signed-in staff member entered an inquiry, while `assigned_to_id` records its current handler. Keeping creator access after handoff supports the staff workflow. The assignment permits one additional field or interaction when it improves tracking; assignment is the workflow enhancement, while creator attribution supports access control.
- **Authentication:** JWTs use HTTP-only, `SameSite=Lax` cookies rather than browser storage, so client-side JavaScript cannot read the token. Cookie settings alone do not prevent every web security risk.
- **Status lifecycle:** Transitions are validated by the API. Reopening a resolved inquiry goes through `In Progress` to make active follow-up explicit.
- **Stale data:** Detail edits require `expected_updated_at`; status updates send it from the UI, but the API checks it only when provided. A timestamp difference greater than one second returns `409 Conflict`; differences within one second are treated as matching. Both routes check the timestamp and update the row in separate queries, so the safeguard is not atomic and a race remains. There is no automatic polling or real-time sync; users can refresh to see newer data.

## Known gaps and next steps

These are not implemented features:

- Make stale-update checks mandatory where appropriate and perform the comparison and update atomically.
- Add PostgreSQL-backed inquiry workflow tests and frontend tests for inquiry creation/editing. Current backend route tests use query stubs in places; current frontend tests cover shared navigation/header behavior, not full inquiry workflows.
- Add activity history only if the assignment or operational need requires tracking prior changes.
- Consider pagination or more detailed roles only when scale or requirements justify them.

Complete and rehearse the assignment's required 3–5 minute end-to-end screen recording before adding optional product features.

## AI and outside resources

AI tools helped generate mock seed data, explore contact-validation regex patterns, and draft frontend test scenarios. Antigravity was used to brainstorm optional feature ideas; those ideas are not presented as implemented. AI-assisted suggestions also informed the dynamic-port test server and inquiry search approach. Automatic three-second polling was considered and rejected in favor of manual refresh and timestamp checks. The implementation remains subject to the limitations described above.
