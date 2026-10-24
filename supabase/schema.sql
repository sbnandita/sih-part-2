-- Supabase Schema & Row-Level Security (RLS) for APAAR Verify Platform
-- NOTE: Synthetic Demo Schema — No real citizen or personal identifiable data is stored.
-- Sensitive attributes (gender, religion, caste, disability, income, address) are strictly prohibited.

-- 1. Create User Roles Enum
CREATE TYPE app_role AS ENUM ('Admin', 'Reviewer', 'Viewer');

-- 2. Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'Viewer',
  institution TEXT NOT NULL DEFAULT 'Apex Institute of Technology',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Student Records Table
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  demo_apaar_id TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  course TEXT NOT NULL,
  department TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  admission_date DATE NOT NULL,
  enrollment_year INT NOT NULL,
  expected_graduation_year INT NOT NULL,
  previous_qualification TEXT NOT NULL,
  previous_percentage NUMERIC(5,2) NOT NULL CHECK (previous_percentage >= 0 AND previous_percentage <= 100),
  current_cgpa NUMERIC(4,2) NOT NULL CHECK (current_cgpa >= 0 AND current_cgpa <= 10),
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  application_status TEXT NOT NULL DEFAULT 'Pending',
  submitted_date DATE NOT NULL,
  last_updated_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_apaar_id ON students(demo_apaar_id);
CREATE INDEX idx_students_status ON students(application_status);
CREATE INDEX idx_students_department ON students(department);

-- 4. Historical Processing Cohort Table (for similarity metrics)
CREATE TABLE processing_history (
  application_id TEXT PRIMARY KEY,
  submission_date DATE NOT NULL,
  completion_date DATE,
  duration_days INT,
  missing_docs_at_submission BOOLEAN NOT NULL DEFAULT FALSE,
  missing_doc_count INT DEFAULT 0,
  issue_count INT DEFAULT 0,
  review_count INT NOT NULL DEFAULT 1,
  final_status TEXT NOT NULL
);

-- 5. Review Cases Table
CREATE TABLE review_cases (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  case_status TEXT NOT NULL DEFAULT 'Open',
  notes TEXT DEFAULT '',
  assigned_to TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit Trail Table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_identifier TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check staff role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS POLICIES FOR STUDENTS TABLE
-- 1. Everyone with an authorized account (Admin, Reviewer, Viewer) can read records
CREATE POLICY "Authorized staff can read students"
ON students FOR SELECT
TO authenticated
USING (true);

-- 2. Reviewer and Admin can insert new student records
CREATE POLICY "Reviewer and Admin can insert students"
ON students FOR INSERT
TO authenticated
WITH CHECK (current_user_role() IN ('Admin', 'Reviewer'));

-- 3. Reviewer and Admin can update student records
CREATE POLICY "Reviewer and Admin can update students"
ON students FOR UPDATE
TO authenticated
USING (current_user_role() IN ('Admin', 'Reviewer'))
WITH CHECK (current_user_role() IN ('Admin', 'Reviewer'));

-- 4. Only Admin can delete student records
CREATE POLICY "Only Admin can delete students"
ON students FOR DELETE
TO authenticated
USING (current_user_role() = 'Admin');

-- RLS POLICIES FOR REVIEW CASES
CREATE POLICY "Authorized staff can read review cases"
ON review_cases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Reviewer and Admin can upsert review cases"
ON review_cases FOR ALL
TO authenticated
USING (current_user_role() IN ('Admin', 'Reviewer'));

-- RLS POLICIES FOR AUDIT LOGS
CREATE POLICY "Authorized staff can read audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized staff can append audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS FOR PROCESSING HISTORY
CREATE POLICY "Authorized staff can read processing history"
ON processing_history FOR SELECT
TO authenticated
USING (true);
