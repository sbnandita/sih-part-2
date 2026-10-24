// Synthetic Demo Data — fictional.
// This dataset is purely synthetic for demonstration and testing purposes.
// Official APAAR API is not connected. All IDs and names are fictional.
// No sensitive attributes (gender, caste, religion, income, disability, address) are included.

import {
  StudentRecord,
  ProcessingHistory,
  REQUIRED_DOCUMENT_TYPES,
  DocumentStatus,
  ApplicationStatus,
} from '../types';

// Deterministic Pseudo-Random Generator (Mulberry32)
function createPrng(seed: number) {
  let s = seed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createPrng(42);

const FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aditi', 'Diya', 'Rohan', 'Ananya', 'Ishaan', 'Meera',
  'Kabir', 'Tanvi', 'Siddharth', 'Pooja', 'Arjun', 'Sneha', 'Dev', 'Kavya',
  'Aditya', 'Rhea', 'Kunal', 'Shruti', 'Nikhil', 'Priyanka', 'Vikram', 'Neha',
  'Rahul', 'Swati', 'Manish', 'Ritika', 'Harsh', 'Simran', 'Akash', 'Divya',
  'Varun', 'Nandini', 'Gaurav', 'Tara', 'Ayush', 'Shreya', 'Pranav', 'Bhavna'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Patel', 'Nair', 'Reddy', 'Chatterjee', 'Gupta',
  'Deshmukh', 'Mehta', 'Bose', 'Rao', 'Kulkarni', 'Malhotra', 'Kapoor', 'Sen',
  'Menon', 'Joshi', 'Chopra', 'Saxena', 'Pandey', 'Bhat', 'Pillai', 'Mishra'
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Information Technology',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering'
];

const INSTITUTIONS = [
  'National Institute of Technology, Demo Campus',
  'Apex Institute of Engineering & Technology',
  'Metro Technical University',
  'Zenith State University of Technology'
];

// Helper to format date offset from reference date (2026-10-24)
function daysAgoDate(days: number): string {
  const d = new Date('2026-10-24T00:00:00Z');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function generateSeedData(): {
  students: StudentRecord[];
  history: ProcessingHistory[];
} {
  const students: StudentRecord[] = [];

  // Breakdown for 40 records:
  // 00-15: 16 Clean & complete (40%)
  // 16-25: 10 Missing 1 document (25%)
  // 26-31: 6 Missing 3+ documents (15%)
  // 32-39: 8 Date / Academic inconsistencies (20%)
  for (let i = 1; i <= 40; i++) {
    const id = `std-${i.toString().padStart(4, '0')}`;
    const demoApaarId = `DEMO-APAAR-${i.toString().padStart(4, '0')}`;
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const studentName = `${firstName} ${lastName}`;
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const institution = INSTITUTIONS[i % INSTITUTIONS.length];

    // Submission age between 2 and 58 days ago
    const submittedDaysAgo = Math.floor(random() * 55) + 3;
    const submittedDate = daysAgoDate(submittedDaysAgo);
    const lastUpdatedDate = daysAgoDate(Math.max(1, submittedDaysAgo - Math.floor(random() * 5)));

    // Standard baseline
    const birthYear = 2004 - (i % 3);
    let dob = `${birthYear}-${String((i % 12) + 1).padStart(2, '0')}-15`;
    let admissionDate = `2024-08-01`;
    let enrollmentYear = 2024;
    let expectedGraduationYear = 2028;
    let previousPercentage = 78 + Math.round(random() * 18);
    let currentCgpa = Number((7.0 + random() * 2.5).toFixed(2));
    let status: ApplicationStatus = 'Pending';

    // Construct documents default
    let docs = REQUIRED_DOCUMENT_TYPES.map((type) => ({
      type,
      status: 'Submitted' as DocumentStatus,
      fileName: `${type.toLowerCase().replace(/\s+/g, '_')}_${i}.pdf`,
      uploadedAt: submittedDate,
    }));

    if (i <= 16) {
      // 40% Clean records
      status = i % 3 === 0 ? 'Verified in Demo' : (i % 2 === 0 ? 'Under Review' : 'Pending');
    } else if (i <= 26) {
      // 25% Missing 1 document
      const missingIndex = (i % REQUIRED_DOCUMENT_TYPES.length);
      docs[missingIndex].status = 'Missing';
      docs[missingIndex].fileName = undefined;
      status = i % 2 === 0 ? 'Pending' : 'Under Review';
    } else if (i <= 32) {
      // 15% Missing 3+ documents
      docs[0].status = 'Missing';
      docs[0].fileName = undefined;
      docs[1].status = 'Missing';
      docs[1].fileName = undefined;
      docs[4].status = 'Rejected';
      status = 'Needs Correction';
    } else {
      // 20% Inconsistencies
      status = 'Needs Correction';
      if (i === 33) {
        // Admission date earlier than DOB + 15
        dob = '2012-05-10'; // only 12 years old at admission in 2024!
      } else if (i === 34) {
        // Enrollment year after graduation year
        enrollmentYear = 2026;
        expectedGraduationYear = 2024;
      } else if (i === 35) {
        // Course duration mismatch (B.Tech 4 years, but set to 1 year graduation)
        enrollmentYear = 2024;
        expectedGraduationYear = 2025;
      } else if (i === 36) {
        // CGPA > 10 invalid
        currentCgpa = 11.5;
      } else if (i === 37) {
        // Percentage > 100 invalid
        previousPercentage = 105;
      } else if (i === 38) {
        // Future submitted date
        admissionDate = '2026-11-15';
      } else if (i === 39) {
        // Both missing docs and invalid dates
        docs[2].status = 'Missing';
        docs[3].status = 'Missing';
        dob = '2014-01-01';
      } else {
        // Missing docs with under review
        docs[1].status = 'Rejected';
        docs[2].status = 'Missing';
      }
    }

    students.push({
      id,
      demoApaarId,
      studentName,
      institution,
      course: 'Bachelor of Technology (B.Tech)',
      department,
      dateOfBirth: dob,
      admissionDate,
      enrollmentYear,
      expectedGraduationYear,
      previousQualification: 'Higher Secondary School Certificate (10+2)',
      previousPercentage,
      currentCgpa,
      documents: docs,
      applicationStatus: status,
      submittedDate,
      lastUpdatedDate,
      createdAt: new Date(`${submittedDate}T09:00:00Z`).toISOString(),
    });
  }

  // Generate 80 synthetic ProcessingHistory records
  const history: ProcessingHistory[] = [];
  for (let h = 1; h <= 80; h++) {
    const isClean = h <= 35;
    const hasMissingDocs = !isClean && h % 2 === 0;
    const missingDocCount = isClean ? 0 : (h % 3 === 0 ? 3 : 1);
    const issueCount = isClean ? 0 : (h % 4 === 0 ? 2 : 1);
    
    // Duration in days: clean takes 3-10 days, missing docs / issues take 15-45 days
    const durationDays = isClean
      ? Math.floor(random() * 8) + 3
      : Math.floor(random() * 28) + 14;
    
    const reviewCount = isClean ? 1 : Math.floor(random() * 3) + 2;
    const finalStatus: ApplicationStatus = h % 7 === 0 ? 'Needs Correction' : 'Verified in Demo';
    const subDaysAgo = durationDays + Math.floor(random() * 60) + 10;
    const submissionDate = daysAgoDate(subDaysAgo);
    const completionDate = daysAgoDate(subDaysAgo - durationDays);

    history.push({
      applicationId: `HIST-APP-${h.toString().padStart(4, '0')}`,
      submissionDate,
      completionDate,
      durationDays,
      missingDocsAtSubmission: hasMissingDocs,
      missingDocCount,
      issueCount,
      reviewCount,
      finalStatus,
    });
  }

  return { students, history };
}
