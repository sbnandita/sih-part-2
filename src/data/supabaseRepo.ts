// Supabase implementation of StudentRepository
// Used when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudentRepository, StudentFilterOptions } from './repository';
import {
  StudentRecord,
  ValidationIssue,
  ProcessingHistory,
  ReviewCase,
  AuditLog,
} from '../types';

export class SupabaseRepository implements StudentRepository {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  isDemoMode(): boolean {
    return false;
  }

  async getAllStudentsRaw(): Promise<StudentRecord[]> {
    const { data, error } = await this.client.from('students').select('*');
    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    return (data || []).map(this.mapDbToStudent);
  }

  async getStudents(
    options: StudentFilterOptions = {}
  ): Promise<{ students: StudentRecord[]; total: number }> {
    let query = this.client.from('students').select('*', { count: 'exact' });

    if (options.status && options.status !== 'All') {
      query = query.eq('application_status', options.status);
    }
    if (options.department && options.department !== 'All') {
      query = query.eq('department', options.department);
    }
    if (options.query && options.query.trim()) {
      query = query.or(
        `student_name.ilike.%${options.query}%,demo_apaar_id.ilike.%${options.query}%,department.ilike.%${options.query}%`
      );
    }

    if (options.page && options.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Supabase getStudents error:', error);
      return { students: [], total: 0 };
    }

    return {
      students: (data || []).map(this.mapDbToStudent),
      total: count || 0,
    };
  }

  async getStudentById(id: string): Promise<StudentRecord | null> {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapDbToStudent(data);
  }

  async createStudent(
    data: Omit<StudentRecord, 'id' | 'createdAt'>
  ): Promise<StudentRecord> {
    const nextId = `std-${Date.now().toString().slice(-6)}`;
    const dbPayload = {
      id: nextId,
      demo_apaar_id: data.demoApaarId,
      student_name: data.studentName,
      institution: data.institution,
      course: data.course,
      department: data.department,
      date_of_birth: data.dateOfBirth,
      admission_date: data.admissionDate,
      enrollment_year: data.enrollmentYear,
      expected_graduation_year: data.expectedGraduationYear,
      previous_qualification: data.previousQualification,
      previous_percentage: data.previousPercentage,
      current_cgpa: data.currentCgpa,
      documents: data.documents,
      application_status: data.applicationStatus,
      submitted_date: data.submittedDate,
      last_updated_date: data.lastUpdatedDate,
    };

    const { data: inserted, error } = await this.client
      .from('students')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapDbToStudent(inserted);
  }

  async updateStudent(
    id: string,
    data: Partial<StudentRecord>
  ): Promise<StudentRecord> {
    const payload: any = {
      last_updated_date: new Date().toISOString().split('T')[0],
    };
    if (data.studentName) payload.student_name = data.studentName;
    if (data.course) payload.course = data.course;
    if (data.department) payload.department = data.department;
    if (data.applicationStatus) payload.application_status = data.applicationStatus;
    if (data.documents) payload.documents = data.documents;

    const { data: updated, error } = await this.client
      .from('students')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapDbToStudent(updated);
  }

  async deleteStudent(id: string): Promise<boolean> {
    const { error } = await this.client.from('students').delete().eq('id', id);
    return !error;
  }

  async getValidationIssues(studentId?: string): Promise<ValidationIssue[]> {
    return [];
  }

  async saveValidationIssues(issues: ValidationIssue[]): Promise<void> {}

  async resolveValidationIssue(issueId: string): Promise<void> {}

  async getProcessingHistory(): Promise<ProcessingHistory[]> {
    const { data } = await this.client.from('processing_history').select('*');
    return (data || []).map((h: any) => ({
      applicationId: h.application_id,
      submissionDate: h.submission_date,
      completionDate: h.completion_date,
      durationDays: h.duration_days,
      missingDocsAtSubmission: h.missing_docs_at_submission,
      missingDocCount: h.missing_doc_count,
      issueCount: h.issue_count,
      reviewCount: h.review_count,
      finalStatus: h.final_status,
    }));
  }

  async getReviewCase(studentId: string): Promise<ReviewCase | null> {
    const { data } = await this.client
      .from('review_cases')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (!data) return null;
    return {
      studentId: data.student_id,
      caseStatus: data.case_status,
      notes: data.notes,
      assignedTo: data.assigned_to,
      updatedAt: data.updated_at,
    };
  }

  async getAllReviewCases(): Promise<ReviewCase[]> {
    const { data } = await this.client.from('review_cases').select('*');
    return (data || []).map((d: any) => ({
      studentId: d.student_id,
      caseStatus: d.case_status,
      notes: d.notes,
      assignedTo: d.assigned_to,
      updatedAt: d.updated_at,
    }));
  }

  async saveReviewCase(reviewCase: ReviewCase): Promise<void> {
    await this.client.from('review_cases').upsert({
      student_id: reviewCase.studentId,
      case_status: reviewCase.caseStatus,
      notes: reviewCase.notes,
      assigned_to: reviewCase.assignedTo,
      updated_at: new Date().toISOString(),
    });
  }

  async getAuditLogs(recordId?: string): Promise<AuditLog[]> {
    let q = this.client.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (recordId) {
      q = q.eq('record_id', recordId);
    }
    const { data } = await q;
    return (data || []).map((l: any) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      action: l.action,
      recordId: l.record_id,
      recordIdentifier: l.record_identifier,
      oldValue: l.old_value,
      newValue: l.new_value,
      timestamp: l.timestamp,
    }));
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: log.userId,
      user_name: log.userName,
      action: log.action,
      record_id: log.recordId,
      record_identifier: log.recordIdentifier,
      old_value: log.oldValue,
      new_value: log.newValue,
      timestamp: new Date().toISOString(),
    };
    await this.client.from('audit_logs').insert(entry);
    return {
      id: entry.id,
      userId: entry.user_id,
      userName: entry.user_name,
      action: entry.action,
      recordId: entry.record_id,
      recordIdentifier: entry.record_identifier,
      oldValue: entry.old_value,
      newValue: entry.new_value,
      timestamp: entry.timestamp,
    };
  }

  async resetToSeed(): Promise<void> {}

  private mapDbToStudent(db: any): StudentRecord {
    return {
      id: db.id,
      demoApaarId: db.demo_apaar_id,
      studentName: db.student_name,
      institution: db.institution,
      course: db.course,
      department: db.department,
      dateOfBirth: db.date_of_birth,
      admissionDate: db.admission_date,
      enrollmentYear: db.enrollment_year,
      expectedGraduationYear: db.expected_graduation_year,
      previousQualification: db.previous_qualification,
      previousPercentage: Number(db.previous_percentage),
      currentCgpa: Number(db.current_cgpa),
      documents: db.documents || [],
      applicationStatus: db.application_status,
      submittedDate: db.submitted_date,
      lastUpdatedDate: db.last_updated_date,
      createdAt: db.created_at,
    };
  }
}
