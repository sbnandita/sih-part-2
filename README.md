# APAAR Verify: Smart Student Record Verification & Delay-Risk Platform

> **DEMO DISCLAIMER**:
> **Demo Mode — Official APAAR API Not Connected.**
> All student identifiers (`DEMO-APAAR-XXXX`), names, and dates are 100% synthetic demo data.
> The delay-risk engine is a **rule-based heuristic estimate** (*Demo Estimate — Not Trained on Real Historical Data*). No machine learning model is claimed or active. Estimates are for demonstration triage only and require human review. No sensitive attributes (gender, religion, caste, disability, income, region) are collected or used, and the system never auto-rejects any applicant.

Built with **React 18 + TypeScript + Vite + Tailwind CSS v3 + Lucide Icons + Recharts + React Hook Form + Zod + Zustand + Vitest**.

---

## 🚀 Quick Start (No Supabase Required)

The project runs completely offline in LocalStorage demo mode with pre-seeded reproducible synthetic records.

```bash
# 1. Navigate to the project directory
cd apaar-verify

# 2. Install dependencies (if not already installed)
npm install

# 3. Run development server
npm run dev

# 4. Run automated unit tests
npm test

# 5. Production build
npm run build
```

---

## 👥 Demo Logins & Role-Based Permissions (RBAC)

Use the role selector on the `/login` page or quick-switch at any time using the header role dropdown:

| Role | Demo Identity | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | Dr. Rajesh Sharma | `admin.rajesh@demo.edu.in` | **Full Access**: Add/edit/delete records, live validation, review status updates, risk score weight tuning, reset demo data. |
| **Reviewer** | Prof. Priya Nair | `reviewer.priya@demo.edu.in` | **Operational Reviewer**: Add/edit records, trigger validation checks, update review triage status, add audit notes. |
| **Viewer** | Arun Kulkarni | `viewer.arun@demo.edu.in` | **Read-Only Auditor**: Read directory, view charts, export synthetic CSV reports. Edit and review buttons are hidden. |

---

## ⚙️ How Delay-Risk Rules Work

The delay-risk engine (`src/lib/delayRisk.ts`) operates as a **configurable, transparent point-based heuristic system**:

1. **Missing or Rejected Documents**: `+2 points` per document (e.g., missing Fee Receipt, uncertified Marksheet).
2. **Open Validation Discrepancies**: `+1 point` for standard issues, `+2 points` for High-severity issues (e.g. calculated admission age < 15, graduation before enrollment, scores outside 0–100 or 0–10).
3. **Application Age Backlog**:
   - `+1 point` if pending $\ge 14$ days.
   - `+2 points` if pending $\ge 30$ days.
4. **Correction State**: `+2 points` if current application status is `Needs Correction`.
5. **Prior Review Cycles**: `+1 point` per additional iterative review cycle.
6. **Similar Cohort Comparison**: Compares against synthetic historical processing records (`ProcessingHistory`). Adds `+1 point` if matched cohort historically took $>20$ days or had $>50\%$ re-review rate (requires at least 5 similar sample cases).

### Risk Thresholds:
- **Low Risk**: Total Score $< 3$
- **Medium Risk**: Total Score $3 - 5$
- **High Risk**: Total Score $\ge 6$

*Note: All parameters can be tuned in real time on the `/settings` page.*

---

## ☁️ Connecting Supabase (Optional)

To connect a live Supabase backend instead of the local storage repository:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL schema script located in `supabase/schema.sql` in your Supabase SQL Editor. This sets up the tables, indexes, and Row Level Security (RLS) policies.
3. Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Restart Vite (`npm run dev`). The repository factory will automatically route requests through `SupabaseRepository`.

---

## ⚠️ Limitations & Governance

- **No Official Government API**: Formal integration with the Ministry of Education's APAAR / DigiLocker ecosystem requires an institutional MoU, digital certificate signing, and institutional firewall whitelisting.
- **Privacy Protections**: Compliant with India's **Digital Personal Data Protection (DPDP) Act 2023** principles: no demographic profiling, no sensitive attributes.
- **Human-in-the-Loop**: The risk algorithm never auto-rejects or approves student submissions; it only prioritizes human reviewer attention.

---

## ⏱️ 3-Minute Hackathon Demo Script

Follow this script to present the prototype to judges:

### Minute 1: The Problem & Dashboard Overview (0:00 - 1:00)
1. **Show `/login`**: Mention the non-negotiable **"Demo Mode — Official APAAR API Not Connected"** persistent banner and explain the role-based security model. Log in as **Admin**.
2. **Navigate to `/dashboard`**:
   - Highlight the 6 summary metric cards dynamically calculated from the 40 synthetic student records.
   - Show the **Status Distribution Donut** and the **Top Detected Discrepancies Bar Chart**.
   - Emphasize that all numbers are computed live from the repository, not hard-coded.

### Minute 2: Discrepancy Detection & Live Validation (1:00 - 2:00)
1. **Navigate to `/students`**:
   - Search for student `"Aarav"`, then filter by Department or Missing Documents.
   - Show how the table handles pagination and horizontal responsiveness.
2. **Open `/students/new`**:
   - Input a test synthetic student with intentional inconsistencies (e.g. graduation year before enrollment year).
   - Click **"Run Live Validation"** to display real-time inline discrepancy warnings with plain-English fix hints.
   - Save the record and show the resulting **Audit Trail** log entry.

### Minute 3: Delay Risk Triage & Review Queue (2:00 - 3:00)
1. **Navigate to `/delay-risk`**:
   - Walk through the visual pipeline diagram: *Submission $\to$ Validation $\to$ Risk Rules $\to$ Risk Label $\to$ Staff Action*.
   - Point out the mandatory disclaimer: *"Estimates only, not guaranteed processing times. Human review required."*
2. **Open `/review-queue`**:
   - Show the prioritized triage order (High risk and oldest backlog first).
   - Click **"Follow-Up Required"** or **"Resolved"** on an urgent item. Show the instant status change and corresponding audit log entry.
3. **Open `/settings`**:
   - Show how the rule scoring weights and thresholds can be tuned live, and demonstrate the **"Reset to Default Synthetic Seed Data"** button.
   - Close with the responsible AI and privacy governance principles.
