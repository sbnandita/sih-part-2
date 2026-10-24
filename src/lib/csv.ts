// CSV Import / Export Utilities using PapaParse
import Papa from 'papaparse';
import { StudentRecord, AuditLog } from '../types';

export function exportStudentsToCsv(students: StudentRecord[]): void {
  const flattened = students.map((s) => ({
    'Student ID': s.id,
    'Demo APAAR ID': s.demoApaarId,
    'Student Name': s.studentName,
    Institution: s.institution,
    Course: s.course,
    Department: s.department,
    'Date of Birth': s.dateOfBirth,
    'Admission Date': s.admissionDate,
    'Enrollment Year': s.enrollmentYear,
    'Expected Graduation': s.expectedGraduationYear,
    'Previous Qualification': s.previousQualification,
    'Previous Percentage': s.previousPercentage,
    'Current CGPA': s.currentCgpa,
    'Application Status': s.applicationStatus,
    'Submitted Date': s.submittedDate,
    'Last Updated': s.lastUpdatedDate,
    'Missing Documents': s.documents
      .filter((d) => d.status === 'Missing' || d.status === 'Rejected')
      .map((d) => `${d.type}(${d.status})`)
      .join('; ') || 'None',
    'Data Classification': 'Synthetic Demo Data',
  }));

  const csv = Papa.unparse(flattened);
  downloadBlob(csv, `apaar_students_demo_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportAuditLogsToCsv(logs: AuditLog[]): void {
  const data = logs.map((l) => ({
    'Log ID': l.id,
    Timestamp: l.timestamp,
    'User ID': l.userId,
    'User Name': l.userName || 'Unknown',
    Action: l.action,
    'Record Identifier': l.recordIdentifier || l.recordId,
    'Old Value': l.oldValue || '',
    'New Value': l.newValue || '',
    Classification: 'Synthetic Demo Data',
  }));

  const csv = Papa.unparse(data);
  downloadBlob(csv, `apaar_audit_logs_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportReviewQueueToCsv(queueItems: any[]): void {
  const data = queueItems.map((item) => ({
    'Demo APAAR ID': item.demoApaarId,
    'Student Name': item.studentName,
    Department: item.department,
    'Risk Level': item.riskLabel,
    'Risk Score': item.score,
    'Days Pending': item.daysPending,
    'Primary Reasons': (item.reasons || []).join(' | '),
    'Recommended Action': (item.recommendedActions || []).join(' | '),
    'Case Status': item.caseStatus || 'Open',
    Classification: 'Synthetic Demo Data',
  }));

  const csv = Papa.unparse(data);
  downloadBlob(csv, `apaar_review_queue_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function parseStudentsCsv(
  file: File
): Promise<{ success: boolean; data?: Partial<StudentRecord>[]; error?: string }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed: Partial<StudentRecord>[] = results.data.map((row: any, idx: number) => {
            const demoId = row['Demo APAAR ID'] || row['demoApaarId'] || `DEMO-APAAR-${(9000 + idx).toString()}`;
            return {
              demoApaarId: demoId.startsWith('DEMO-APAAR-') ? demoId : `DEMO-APAAR-${demoId}`,
              studentName: row['Student Name'] || row['studentName'] || 'Imported Student',
              institution: row['Institution'] || row['institution'] || 'Apex Institute of Technology',
              course: row['Course'] || row['course'] || 'Bachelor of Technology (B.Tech)',
              department: row['Department'] || row['department'] || 'Computer Science & Engineering',
              dateOfBirth: row['Date of Birth'] || row['dateOfBirth'] || '2004-01-01',
              admissionDate: row['Admission Date'] || row['admissionDate'] || '2024-08-01',
              enrollmentYear: Number(row['Enrollment Year'] || row['enrollmentYear'] || 2024),
              expectedGraduationYear: Number(row['Expected Graduation'] || row['expectedGraduationYear'] || 2028),
              previousQualification: row['Previous Qualification'] || row['previousQualification'] || 'Class 12',
              previousPercentage: Number(row['Previous Percentage'] || row['previousPercentage'] || 80),
              currentCgpa: Number(row['Current CGPA'] || row['currentCgpa'] || 8.0),
              applicationStatus: (row['Application Status'] || 'Pending') as any,
              submittedDate: row['Submitted Date'] || new Date().toISOString().split('T')[0],
              lastUpdatedDate: new Date().toISOString().split('T')[0],
              documents: [
                { type: 'Identity Proof', status: 'Submitted' },
                { type: 'Date of Birth Proof', status: 'Submitted' },
                { type: 'Previous Marksheet', status: 'Submitted' },
                { type: 'Admission Letter', status: 'Submitted' },
                { type: 'Fee Receipt', status: 'Submitted' },
              ],
            };
          });
          resolve({ success: true, data: parsed });
        } catch (e: any) {
          resolve({ success: false, error: e.message || 'Failed to parse CSV records' });
        }
      },
      error: (err) => {
        resolve({ success: false, error: err.message });
      },
    });
  });
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
