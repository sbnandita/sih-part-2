// LocalStorage implementation of StudentRepository
import { StudentRepository, StudentFilterOptions } from './repository';
import {
  StudentRecord,
  ValidationIssue,
  ProcessingHistory,
  ReviewCase,
  AuditLog,
} from '../types';
import { generateSeedData } from './seed';

const STORAGE_KEYS = {
  STUDENTS: 'apaar_students_data_v1',
  HISTORY: 'apaar_processing_history_v1',
  VALIDATION: 'apaar_validation_issues_v1',
  REVIEWS: 'apaar_review_cases_v1',
  AUDIT_LOGS: 'apaar_audit_logs_v1',
};

export class LocalStorageRepository implements StudentRepository {
  constructor() {
    this.ensureInitialized();
  }

  isDemoMode(): boolean {
    return true;
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      this.resetToSeedSync();
    }
  }

  private resetToSeedSync(): void {
    const { students, history } = generateSeedData();
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    // Initialize initial audit logs
    const initialLogs: AuditLog[] = [
      {
        id: 'log-0001',
        userId: 'usr-admin',
        userName: 'System Admin',
        action: 'System Seeded Synthetic Demo Data',
        recordId: 'all',
        recordIdentifier: '40 Synthetic Records',
        oldValue: 'Empty',
        newValue: '40 Records',
        timestamp: new Date('2026-10-24T10:00:00Z').toISOString(),
      },
      {
        id: 'log-0002',
        userId: 'usr-reviewer',
        userName: 'Senior Reviewer (P. Sharma)',
        action: 'Document Verification',
        recordId: 'std-0001',
        recordIdentifier: 'Aarav Sharma (DEMO-APAAR-0001)',
        oldValue: 'Pending',
        newValue: 'Verified in Demo',
        timestamp: new Date('2026-10-24T11:30:00Z').toISOString(),
      },
      {
        id: 'log-0003',
        userId: 'usr-reviewer',
        userName: 'Senior Reviewer (P. Sharma)',
        action: 'Status Updated to Needs Correction',
        recordId: 'std-0027',
        recordIdentifier: 'Tanvi Kapoor (DEMO-APAAR-0027)',
        oldValue: 'Under Review',
        newValue: 'Needs Correction',
        timestamp: new Date('2026-10-24T12:15:00Z').toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialLogs));

    // Initialize initial review cases
    const initialReviews: Record<string, ReviewCase> = {
      'std-0027': {
        studentId: 'std-0027',
        caseStatus: 'Follow-Up Required',
        notes: '3 documents missing including fee receipt. Contacted student via departmental portal.',
        assignedTo: 'Senior Reviewer',
        updatedAt: '2026-10-24T12:15:00Z',
      },
      'std-0033': {
        studentId: 'std-0033',
        caseStatus: 'Open',
        notes: 'Date of birth indicates student was 12 at admission. Requires verification of 10th marksheet.',
        assignedTo: 'Senior Reviewer',
        updatedAt: '2026-10-24T12:30:00Z',
      },
    };
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(initialReviews));
    localStorage.setItem(STORAGE_KEYS.VALIDATION, JSON.stringify([]));
  }

  async resetToSeed(): Promise<void> {
    this.resetToSeedSync();
  }

  async getAllStudentsRaw(): Promise<StudentRecord[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return raw ? JSON.parse(raw) : [];
  }

  async getStudents(
    options: StudentFilterOptions = {}
  ): Promise<{ students: StudentRecord[]; total: number }> {
    const all = await this.getAllStudentsRaw();
    let filtered = [...all];

    // Filter by query (name, apaar ID, course, institution)
    if (options.query && options.query.trim() !== '') {
      const q = options.query.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.demoApaarId.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.institution.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (options.status && options.status !== 'All') {
      filtered = filtered.filter((s) => s.applicationStatus === options.status);
    }

    // Filter by department
    if (options.department && options.department !== 'All') {
      filtered = filtered.filter((s) => s.department === options.department);
    }

    // Filter by missing docs
    if (options.hasMissingDocs) {
      filtered = filtered.filter((s) =>
        s.documents.some((d) => d.status === 'Missing' || d.status === 'Rejected')
      );
    }

    // Sorting
    const sortBy = options.sortBy || 'submittedDate';
    const sortOrder = options.sortOrder || 'desc';
    filtered.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;

    // Pagination
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit;
      filtered = filtered.slice(start, start + options.limit);
    }

    return { students: filtered, total };
  }

  async getStudentById(id: string): Promise<StudentRecord | null> {
    const all = await this.getAllStudentsRaw();
    return all.find((s) => s.id === id || s.demoApaarId === id) || null;
  }

  async createStudent(
    data: Omit<StudentRecord, 'id' | 'createdAt'>
  ): Promise<StudentRecord> {
    const all = await this.getAllStudentsRaw();
    const nextNum = all.length + 1;
    const newStudent: StudentRecord = {
      ...data,
      id: `std-${nextNum.toString().padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newStudent);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
    return newStudent;
  }

  async updateStudent(
    id: string,
    data: Partial<StudentRecord>
  ): Promise<StudentRecord> {
    const all = await this.getAllStudentsRaw();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Student with id ${id} not found`);
    }
    const updated = {
      ...all[index],
      ...data,
      lastUpdatedDate: new Date().toISOString().split('T')[0],
    };
    all[index] = updated;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
    return updated;
  }

  async deleteStudent(id: string): Promise<boolean> {
    const all = await this.getAllStudentsRaw();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
    return true;
  }

  async getValidationIssues(studentId?: string): Promise<ValidationIssue[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.VALIDATION);
    const list: ValidationIssue[] = raw ? JSON.parse(raw) : [];
    if (studentId) {
      return list.filter((item) => item.studentId === studentId);
    }
    return list;
  }

  async saveValidationIssues(issues: ValidationIssue[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.VALIDATION, JSON.stringify(issues));
  }

  async resolveValidationIssue(issueId: string): Promise<void> {
    const issues = await this.getValidationIssues();
    const updated = issues.map((i) =>
      i.id === issueId ? { ...i, resolved: true } : i
    );
    await this.saveValidationIssues(updated);
  }

  async getProcessingHistory(): Promise<ProcessingHistory[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  }

  async getReviewCase(studentId: string): Promise<ReviewCase | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const map: Record<string, ReviewCase> = raw ? JSON.parse(raw) : {};
    return map[studentId] || null;
  }

  async getAllReviewCases(): Promise<ReviewCase[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const map: Record<string, ReviewCase> = raw ? JSON.parse(raw) : {};
    return Object.values(map);
  }

  async saveReviewCase(reviewCase: ReviewCase): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const map: Record<string, ReviewCase> = raw ? JSON.parse(raw) : {};
    map[reviewCase.studentId] = {
      ...reviewCase,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(map));
  }

  async getAuditLogs(recordId?: string): Promise<AuditLog[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
    if (recordId) {
      return logs.filter((l) => l.recordId === recordId);
    }
    return logs;
  }

  async addAuditLog(
    log: Omit<AuditLog, 'id' | 'timestamp'>
  ): Promise<AuditLog> {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
    const newEntry: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    // Keep last 200 logs
    if (logs.length > 200) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    return newEntry;
  }
}

import { SupabaseRepository } from './supabaseRepo';

let instance: StudentRepository | null = null;

export function getRepository(): StudentRepository {
  if (!instance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      instance = new SupabaseRepository(supabaseUrl, supabaseAnonKey);
    } else {
      instance = new LocalStorageRepository();
    }
  }
  return instance;
}
