import { describe, it, expect } from 'vitest';
import {
  validateRequiredFields,
  validateDocuments,
  validateAdmissionAge,
  validateAcademicYears,
  validateScores,
  validateDates,
  validateUniqueness,
  validateStudentRecord,
} from './validation';
import { StudentRecord } from '../types';

describe('Validation Engine Rules', () => {
  const validRecord: StudentRecord = {
    id: 'std-valid',
    demoApaarId: 'DEMO-APAAR-0001',
    studentName: 'Aarav Sharma',
    institution: 'Apex Institute of Technology',
    course: 'Bachelor of Technology (B.Tech)',
    department: 'Computer Science & Engineering',
    dateOfBirth: '2004-05-15',
    admissionDate: '2024-08-01',
    enrollmentYear: 2024,
    expectedGraduationYear: 2028,
    previousQualification: 'Class 12',
    previousPercentage: 85,
    currentCgpa: 8.5,
    documents: [
      { type: 'Identity Proof', status: 'Submitted' },
      { type: 'Date of Birth Proof', status: 'Submitted' },
      { type: 'Previous Marksheet', status: 'Submitted' },
      { type: 'Admission Letter', status: 'Submitted' },
      { type: 'Fee Receipt', status: 'Submitted' },
    ],
    applicationStatus: 'Pending',
    submittedDate: '2026-10-10',
    lastUpdatedDate: '2026-10-10',
    createdAt: '2026-10-10T00:00:00Z',
  };

  it('passes completely for valid and consistent record', () => {
    const issues = validateStudentRecord(validRecord, [validRecord]);
    expect(issues.length).toBe(0);
  });

  it('detects missing mandatory student name with High severity', () => {
    const badRecord = { ...validRecord, studentName: '' };
    const issues = validateRequiredFields(badRecord);
    expect(issues.some((i) => i.severity === 'High' && i.type === 'Missing Mandatory Field')).toBe(true);
  });

  it('detects 1 missing document with Medium severity', () => {
    const docRecord: StudentRecord = {
      ...validRecord,
      documents: [
        { type: 'Identity Proof', status: 'Submitted' },
        { type: 'Date of Birth Proof', status: 'Submitted' },
        { type: 'Previous Marksheet', status: 'Submitted' },
        { type: 'Admission Letter', status: 'Submitted' },
        { type: 'Fee Receipt', status: 'Missing' },
      ],
    };
    const issues = validateDocuments(docRecord);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('Medium');
  });

  it('escalates to High severity when 3 or more documents are missing or rejected', () => {
    const docRecord: StudentRecord = {
      ...validRecord,
      documents: [
        { type: 'Identity Proof', status: 'Missing' },
        { type: 'Date of Birth Proof', status: 'Rejected' },
        { type: 'Previous Marksheet', status: 'Submitted' },
        { type: 'Admission Letter', status: 'Submitted' },
        { type: 'Fee Receipt', status: 'Missing' },
      ],
    };
    const issues = validateDocuments(docRecord);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('High');
  });

  it('flags student under 15 years old at admission with High severity', () => {
    const youngRecord: StudentRecord = {
      ...validRecord,
      dateOfBirth: '2012-05-15', // only 12 at 2024 admission
    };
    const issues = validateAdmissionAge(youngRecord);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('High');
    expect(issues[0].type).toBe('Age Inconsistency');
  });

  it('flags graduation year prior to enrollment year with High severity', () => {
    const yearRecord: StudentRecord = {
      ...validRecord,
      enrollmentYear: 2026,
      expectedGraduationYear: 2024,
    };
    const issues = validateAcademicYears(yearRecord);
    expect(issues.some((i) => i.severity === 'High' && i.type === 'Timeline Inconsistency')).toBe(true);
  });

  it('flags CGPA > 10 or Percentage > 100 with High severity', () => {
    const scoreRecord: StudentRecord = {
      ...validRecord,
      currentCgpa: 11.5,
      previousPercentage: 110,
    };
    const issues = validateScores(scoreRecord);
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.severity === 'High')).toBe(true);
  });

  it('flags duplicate demo APAAR ID across cohort', () => {
    const duplicateRecord: StudentRecord = {
      ...validRecord,
      id: 'std-another',
      demoApaarId: validRecord.demoApaarId,
    };
    const issues = validateUniqueness(duplicateRecord, [validRecord, duplicateRecord]);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('High');
    expect(issues[0].type).toBe('Duplicate Demo APAAR ID');
  });
});
