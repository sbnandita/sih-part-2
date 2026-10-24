// Validation Engine: Pure functions detecting missing and inconsistent student information.
import {
  StudentRecord,
  ValidationIssue,
  REQUIRED_DOCUMENT_TYPES,
} from '../types';

/**
 * Validate required student fields (Name, course, department, DOB, admission date, etc.)
 */
export function validateRequiredFields(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!record.studentName || record.studentName.trim().length < 2) {
    issues.push({
      id: `issue-req-name-${record.id}`,
      studentId: record.id,
      type: 'Missing Mandatory Field',
      description: 'Student full name is missing or less than 2 characters.',
      severity: 'High',
      fixHint: 'Enter student legal name as appearing on official identity documents.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!record.course || record.course.trim().length === 0) {
    issues.push({
      id: `issue-req-course-${record.id}`,
      studentId: record.id,
      type: 'Missing Mandatory Field',
      description: 'Enrolled academic course/degree program is missing.',
      severity: 'High',
      fixHint: 'Select the assigned course from the institutional curriculum catalog.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!record.department || record.department.trim().length === 0) {
    issues.push({
      id: `issue-req-dept-${record.id}`,
      studentId: record.id,
      type: 'Missing Mandatory Field',
      description: 'Academic department is not specified.',
      severity: 'High',
      fixHint: 'Assign student to their respective academic department.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!record.dateOfBirth) {
    issues.push({
      id: `issue-req-dob-${record.id}`,
      studentId: record.id,
      type: 'Missing Mandatory Field',
      description: 'Date of Birth (DOB) is missing.',
      severity: 'High',
      fixHint: 'Provide Date of Birth as verified on birth certificate or Class 10 certificate.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!record.admissionDate) {
    issues.push({
      id: `issue-req-adm-${record.id}`,
      studentId: record.id,
      type: 'Missing Mandatory Field',
      description: 'Institutional admission date is missing.',
      severity: 'High',
      fixHint: 'Input the formal admission date from the student admission letter.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return issues;
}

/**
 * Validate document submissions: missing or rejected documents.
 * Severity: Medium (High if 3 or more documents are missing/rejected).
 */
export function validateDocuments(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const missingOrRejected: string[] = [];

  for (const reqType of REQUIRED_DOCUMENT_TYPES) {
    const doc = record.documents?.find((d) => d.type === reqType);
    if (!doc || doc.status === 'Missing' || doc.status === 'Rejected') {
      const statusLabel = doc ? doc.status : 'Missing';
      missingOrRejected.push(`${reqType} (${statusLabel})`);
    }
  }

  if (missingOrRejected.length > 0) {
    const isHigh = missingOrRejected.length >= 3;
    issues.push({
      id: `issue-docs-${record.id}`,
      studentId: record.id,
      type: 'Document Incompleteness',
      description: `${missingOrRejected.length} required document(s) are missing or rejected: ${missingOrRejected.join(', ')}.`,
      severity: isHigh ? 'High' : 'Medium',
      fixHint: 'Upload legible and certified copies of the missing or rejected documents.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return issues;
}

/**
 * Validate admission age: Admission date must not be earlier than DOB + 15 years.
 */
export function validateAdmissionAge(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!record.dateOfBirth || !record.admissionDate) return issues;

  const dob = new Date(record.dateOfBirth);
  const adm = new Date(record.admissionDate);

  if (isNaN(dob.getTime()) || isNaN(adm.getTime())) return issues;

  // Calculate age at admission in years
  let ageAtAdmission = adm.getFullYear() - dob.getFullYear();
  const m = adm.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && adm.getDate() < dob.getDate())) {
    ageAtAdmission--;
  }

  if (ageAtAdmission < 15) {
    issues.push({
      id: `issue-age-${record.id}`,
      studentId: record.id,
      type: 'Age Inconsistency',
      description: `Student age at admission is calculated as ${ageAtAdmission} years (under minimum threshold of 15 years for tertiary admission).`,
      severity: 'High',
      fixHint: 'Verify DOB and admission date against the official matriculation marksheet.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return issues;
}

/**
 * Validate enrollment and graduation year logic.
 * - Enrollment year after expected graduation year -> High
 * - Expected graduation year minus enrollment year inconsistent with standard course duration -> Medium
 */
export function validateAcademicYears(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const enroll = record.enrollmentYear;
  const grad = record.expectedGraduationYear;

  if (enroll && grad) {
    if (enroll > grad) {
      issues.push({
        id: `issue-year-order-${record.id}`,
        studentId: record.id,
        type: 'Timeline Inconsistency',
        description: `Enrollment year (${enroll}) cannot be after expected graduation year (${grad}).`,
        severity: 'High',
        fixHint: 'Correct the enrollment or expected graduation year in academic record.',
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    } else {
      const diff = grad - enroll;
      // Standard undergraduate engineering is typically 3 (lateral) or 4 years, postgraduate 2 years
      if (diff < 2 || diff > 6) {
        issues.push({
          id: `issue-duration-${record.id}`,
          studentId: record.id,
          type: 'Duration Mismatch',
          description: `Calculated program duration (${diff} years between ${enroll} and ${grad}) is unusual for enrolled course (${record.course}).`,
          severity: 'Medium',
          fixHint: 'Confirm standard degree duration (typically 3–4 years for B.Tech / BCA, 2 years for M.Tech).',
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return issues;
}

/**
 * Validate academic scores: Percentage outside 0-100 or CGPA outside 0-10 -> High
 */
export function validateScores(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    record.previousPercentage !== undefined &&
    record.previousPercentage !== null &&
    (record.previousPercentage < 0 || record.previousPercentage > 100)
  ) {
    issues.push({
      id: `issue-pct-${record.id}`,
      studentId: record.id,
      type: 'Score Out of Range',
      description: `Previous qualification percentage (${record.previousPercentage}%) is outside the valid 0–100 range.`,
      severity: 'High',
      fixHint: 'Correct previous percentage according to the official qualifying marksheet.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  if (
    record.currentCgpa !== undefined &&
    record.currentCgpa !== null &&
    (record.currentCgpa < 0 || record.currentCgpa > 10)
  ) {
    issues.push({
      id: `issue-cgpa-${record.id}`,
      studentId: record.id,
      type: 'Score Out of Range',
      description: `Current CGPA (${record.currentCgpa}) is outside the standard 10-point scale (0–10).`,
      severity: 'High',
      fixHint: 'Ensure CGPA is entered on a standard 10.0 scale.',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return issues;
}

/**
 * Validate submission date: Cannot be in the future.
 */
export function validateDates(record: StudentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (record.submittedDate) {
    const sub = new Date(record.submittedDate);
    // Allow small 1 day buffer for timezones
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (sub > tomorrow) {
      issues.push({
        id: `issue-future-sub-${record.id}`,
        studentId: record.id,
        type: 'Invalid Date',
        description: `Application submission date (${record.submittedDate}) is set in the future.`,
        severity: 'Medium',
        fixHint: 'Update the submission date to the actual date the student applied.',
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return issues;
}

/**
 * Validate uniqueness of demoApaarId across the provided cohort of records.
 */
export function validateUniqueness(
  record: StudentRecord,
  allRecords: StudentRecord[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const duplicates = allRecords.filter(
    (s) => s.id !== record.id && s.demoApaarId.trim().toUpperCase() === record.demoApaarId.trim().toUpperCase()
  );

  if (duplicates.length > 0) {
    issues.push({
      id: `issue-dup-apaar-${record.id}`,
      studentId: record.id,
      type: 'Duplicate Demo APAAR ID',
      description: `Demo APAAR ID ${record.demoApaarId} is already assigned to student ${duplicates[0].studentName} (${duplicates[0].id}).`,
      severity: 'High',
      fixHint: 'Assign a unique synthetic Demo APAAR ID (e.g. DEMO-APAAR-XXXX).',
      resolved: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return issues;
}

/**
 * Validate an individual student record against all rules.
 */
export function validateStudentRecord(
  record: StudentRecord,
  allRecords: StudentRecord[] = []
): ValidationIssue[] {
  return [
    ...validateRequiredFields(record),
    ...validateDocuments(record),
    ...validateAdmissionAge(record),
    ...validateAcademicYears(record),
    ...validateScores(record),
    ...validateDates(record),
    ...validateUniqueness(record, allRecords),
  ];
}
