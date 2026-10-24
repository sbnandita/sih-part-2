// Repository Interface for Student Records & Platform State
import {
  StudentRecord,
  ValidationIssue,
  ProcessingHistory,
  ReviewCase,
  AuditLog,
  ApplicationStatus,
  RiskLabel,
} from '../types';

export interface StudentFilterOptions {
  query?: string;
  status?: ApplicationStatus | 'All';
  department?: string | 'All';
  hasMissingDocs?: boolean;
  riskLabel?: RiskLabel | 'All';
  page?: number;
  limit?: number;
  sortBy?: 'studentName' | 'demoApaarId' | 'submittedDate' | 'lastUpdatedDate' | 'department';
  sortOrder?: 'asc' | 'desc';
}

export interface StudentRepository {
  // Student records
  getStudents(options?: StudentFilterOptions): Promise<{ students: StudentRecord[]; total: number }>;
  getAllStudentsRaw(): Promise<StudentRecord[]>;
  getStudentById(id: string): Promise<StudentRecord | null>;
  createStudent(data: Omit<StudentRecord, 'id' | 'createdAt'>): Promise<StudentRecord>;
  updateStudent(id: string, data: Partial<StudentRecord>): Promise<StudentRecord>;
  deleteStudent(id: string): Promise<boolean>;

  // Validation issues
  getValidationIssues(studentId?: string): Promise<ValidationIssue[]>;
  saveValidationIssues(issues: ValidationIssue[]): Promise<void>;
  resolveValidationIssue(issueId: string): Promise<void>;

  // Historical data for delay assessment
  getProcessingHistory(): Promise<ProcessingHistory[]>;

  // Review cases
  getReviewCase(studentId: string): Promise<ReviewCase | null>;
  getAllReviewCases(): Promise<ReviewCase[]>;
  saveReviewCase(reviewCase: ReviewCase): Promise<void>;

  // Audit logs
  getAuditLogs(recordId?: string): Promise<AuditLog[]>;
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;

  // Demo utilities
  resetToSeed(): Promise<void>;
  isDemoMode(): boolean;
}
