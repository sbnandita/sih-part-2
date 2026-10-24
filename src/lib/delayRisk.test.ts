import { describe, it, expect } from 'vitest';
import { assessDelayRisk, DEFAULT_DELAY_RISK_CONFIG } from './delayRisk';
import { StudentRecord, ValidationIssue, ProcessingHistory } from '../types';

describe('Delay-Risk Assessment Engine (Rule-based Demo)', () => {
  const baseRecord: StudentRecord = {
    id: 'std-test-01',
    demoApaarId: 'DEMO-APAAR-9999',
    studentName: 'Test Student',
    institution: 'Demo Tech Institute',
    course: 'B.Tech CSE',
    department: 'Computer Science',
    dateOfBirth: '2004-01-01',
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
    submittedDate: '2026-10-22', // 2 days ago
    lastUpdatedDate: '2026-10-22',
    createdAt: '2026-10-22T00:00:00Z',
  };

  it('evaluates clean, complete, recent application as Low Risk', () => {
    const issues: ValidationIssue[] = [];
    const history: ProcessingHistory[] = [];

    const result = assessDelayRisk(baseRecord, issues, history, DEFAULT_DELAY_RISK_CONFIG);

    expect(result.riskLabel).toBe('Low');
    expect(result.score).toBeLessThan(3);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });

  it('evaluates application with 1 missing doc and medium pending days as Medium Risk', () => {
    const mediumRecord: StudentRecord = {
      ...baseRecord,
      documents: [
        { type: 'Identity Proof', status: 'Submitted' },
        { type: 'Date of Birth Proof', status: 'Submitted' },
        { type: 'Previous Marksheet', status: 'Submitted' },
        { type: 'Admission Letter', status: 'Submitted' },
        { type: 'Fee Receipt', status: 'Missing' }, // 2 points
      ],
      submittedDate: '2026-10-05', // 19 days ago (>= 14 adds 1 pt) -> Total 3 pts (Medium)
    };

    const issues: ValidationIssue[] = [];
    const result = assessDelayRisk(mediumRecord, issues, [], DEFAULT_DELAY_RISK_CONFIG);

    expect(result.riskLabel).toBe('Medium');
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.reasons.some((r) => r.includes('missing/rejected'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('pending for 19 days'))).toBe(true);
  });

  it('evaluates application with multiple missing docs, high issues, and backlog as High Risk', () => {
    const highRecord: StudentRecord = {
      ...baseRecord,
      documents: [
        { type: 'Identity Proof', status: 'Missing' },
        { type: 'Date of Birth Proof', status: 'Submitted' },
        { type: 'Previous Marksheet', status: 'Missing' },
        { type: 'Admission Letter', status: 'Submitted' },
        { type: 'Fee Receipt', status: 'Rejected' }, // 3 missing/rejected = 6 points
      ],
      applicationStatus: 'Needs Correction', // 2 points
      submittedDate: '2026-09-10', // > 30 days pending = 2 points
    };

    const issues: ValidationIssue[] = [
      {
        id: 'iss-1',
        studentId: highRecord.id,
        type: 'Timeline Inconsistency',
        description: 'Graduation year conflict',
        severity: 'High', // 2 points
        resolved: false,
      },
    ];

    const result = assessDelayRisk(highRecord, issues, [], DEFAULT_DELAY_RISK_CONFIG);

    expect(result.riskLabel).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(result.reasons.some((r) => r.includes('Needs Correction'))).toBe(true);
  });
});
