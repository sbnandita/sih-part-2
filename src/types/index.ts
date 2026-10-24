// Synthetic Demo Data Types & Zod Schemas
// Note: Sensitive attributes (gender, religion, caste, disability, income, address/region)
// are strictly excluded from the data model and risk engine per non-negotiable guidelines.
import { z } from 'zod';

export type UserRole = 'Admin' | 'Reviewer' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
}

export type DocumentType =
  | 'Identity Proof'
  | 'Date of Birth Proof'
  | 'Previous Marksheet'
  | 'Admission Letter'
  | 'Fee Receipt';

export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'Identity Proof',
  'Date of Birth Proof',
  'Previous Marksheet',
  'Admission Letter',
  'Fee Receipt',
];

export type DocumentStatus = 'Submitted' | 'Missing' | 'Rejected';

export interface StudentDocument {
  type: DocumentType;
  status: DocumentStatus;
  fileName?: string;
  uploadedAt?: string;
}

export type ApplicationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Verified in Demo'
  | 'Needs Correction';

export interface StudentRecord {
  id: string;
  demoApaarId: string;
  studentName: string;
  institution: string;
  course: string;
  department: string;
  dateOfBirth: string; // YYYY-MM-DD
  admissionDate: string; // YYYY-MM-DD
  enrollmentYear: number;
  expectedGraduationYear: number;
  previousQualification: string;
  previousPercentage: number;
  currentCgpa: number;
  documents: StudentDocument[];
  applicationStatus: ApplicationStatus;
  submittedDate: string; // YYYY-MM-DD
  lastUpdatedDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export type IssueSeverity = 'Low' | 'Medium' | 'High';

export interface ValidationIssue {
  id: string;
  studentId: string;
  type: string;
  description: string;
  severity: IssueSeverity;
  fixHint?: string;
  resolved: boolean;
  detectedAt?: string;
}

export interface ProcessingHistory {
  applicationId: string;
  submissionDate: string;
  completionDate?: string;
  durationDays?: number;
  missingDocsAtSubmission: boolean;
  missingDocCount?: number;
  issueCount?: number;
  reviewCount: number;
  finalStatus: ApplicationStatus;
}

export type RiskLabel = 'Low' | 'Medium' | 'High';

export interface SimilarCaseSummary {
  matchedCount: number;
  averageDays: number;
  extraReviewRate: number; // percentage 0-100
  sampleApplicationIds: string[];
}

export interface DelayAssessment {
  studentId: string;
  riskLabel: RiskLabel;
  score: number; // Internal risk points
  reasons: string[];
  recommendedActions: string[];
  similarCases?: SimilarCaseSummary;
  assessedAt: string;
}

export type CaseStatus = 'Open' | 'Reviewed' | 'Follow-Up Required' | 'Resolved';

export interface ReviewCase {
  studentId: string;
  caseStatus: CaseStatus;
  notes: string;
  assignedTo?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  recordId: string;
  recordIdentifier?: string; // e.g. student name or demo APAAR ID
  oldValue?: string;
  newValue?: string;
  timestamp: string; // ISO string
}

export interface DelayRiskConfig {
  pointsPerMissingDoc: number;
  pointsPerOpenValidationIssue: number;
  pointsHighSeverityIssue: number;
  pendingDaysMedium: number;
  pendingDaysHigh: number;
  extraPointsStatusNeedsCorrection: number;
  extraPointsPerPriorReview: number;
  similarCasePoints: number;
  thresholdLowMax: number; // Low: score < thresholdLowMax (e.g. 3)
  thresholdMediumMax: number; // Medium: 3 to 5
}

// Zod Validation Schemas
export const studentDocumentSchema = z.object({
  type: z.enum([
    'Identity Proof',
    'Date of Birth Proof',
    'Previous Marksheet',
    'Admission Letter',
    'Fee Receipt',
  ]),
  status: z.enum(['Submitted', 'Missing', 'Rejected']),
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
});

export const studentRecordSchema = z.object({
  id: z.string().optional(),
  demoApaarId: z
    .string()
    .regex(/^DEMO-APAAR-\d{4,}$/, 'Format must be DEMO-APAAR-XXXX (Synthetic Demo ID)'),
  studentName: z.string().min(2, 'Name is required (at least 2 characters)'),
  institution: z.string().min(2, 'Institution is required'),
  course: z.string().min(2, 'Course is required'),
  department: z.string().min(2, 'Department is required'),
  dateOfBirth: z.string().min(1, 'Date of Birth is required'),
  admissionDate: z.string().min(1, 'Admission Date is required'),
  enrollmentYear: z.coerce.number().int().min(2000).max(2050),
  expectedGraduationYear: z.coerce.number().int().min(2000).max(2050),
  previousQualification: z.string().min(1, 'Previous qualification is required'),
  previousPercentage: z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  currentCgpa: z.coerce.number().min(0).max(10, 'CGPA must be between 0 and 10'),
  documents: z.array(studentDocumentSchema).min(1, 'At least one document item required'),
  applicationStatus: z.enum([
    'Pending',
    'Under Review',
    'Verified in Demo',
    'Needs Correction',
  ]),
  submittedDate: z.string().min(1, 'Submission date is required'),
  lastUpdatedDate: z.string().min(1, 'Last updated date is required'),
});

export type StudentRecordFormData = z.infer<typeof studentRecordSchema>;
