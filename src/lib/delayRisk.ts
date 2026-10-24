// Delay-Risk Engine: Rule-based demo estimate
// DISCLAIMER: Demo Estimate — Not Trained on Real Historical Data.
// Estimates only, not guaranteed processing times. Human review required.
// Sensitive attributes (gender, religion, caste, disability, income, address) are NEVER used.
// Predictions never auto-reject or deny anything.

import {
  StudentRecord,
  ValidationIssue,
  ProcessingHistory,
  DelayAssessment,
  DelayRiskConfig,
  RiskLabel,
  SimilarCaseSummary,
} from '../types';

export const DEFAULT_DELAY_RISK_CONFIG: DelayRiskConfig = {
  pointsPerMissingDoc: 2,
  pointsPerOpenValidationIssue: 1,
  pointsHighSeverityIssue: 2,
  pendingDaysMedium: 14,
  pendingDaysHigh: 30,
  extraPointsStatusNeedsCorrection: 2,
  extraPointsPerPriorReview: 1,
  similarCasePoints: 1,
  thresholdLowMax: 3, // Low: score < 3
  thresholdMediumMax: 5, // Medium: 3 <= score <= 5, High: >= 6
};

const CONFIG_STORAGE_KEY = 'apaar_delay_risk_config_v1';

export function getDelayRiskConfig(): DelayRiskConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_DELAY_RISK_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to parse delay risk config, using defaults', e);
  }
  return { ...DEFAULT_DELAY_RISK_CONFIG };
}

export function saveDelayRiskConfig(config: DelayRiskConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function resetDelayRiskConfig(): DelayRiskConfig {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_DELAY_RISK_CONFIG));
  return { ...DEFAULT_DELAY_RISK_CONFIG };
}

/**
 * Interface for pluggable future risk models.
 * TODO: Replace this rule-based demo engine with a trained ML risk model
 * (e.g. gradient-boosted trees / regression model) once compliant,
 * institutional-approved historical training datasets become available.
 */
export interface RiskModel {
  assess(
    record: StudentRecord,
    issues: ValidationIssue[],
    history: ProcessingHistory[],
    config: DelayRiskConfig
  ): DelayAssessment;
}

/**
 * Calculate the number of days an application has been pending.
 */
export function calculateDaysPending(submittedDate: string): number {
  if (!submittedDate) return 0;
  const sub = new Date(submittedDate).getTime();
  // Using 2026-10-24 as the reference timestamp or current time if future
  const now = new Date('2026-10-24T00:00:00Z').getTime();
  const diffTime = Math.max(0, now - sub);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Find similar cases from synthetic ProcessingHistory based on missing docs and issue counts.
 */
export function findSimilarCases(
  record: StudentRecord,
  openIssueCount: number,
  history: ProcessingHistory[]
): SimilarCaseSummary | null {
  const missingDocs = (record.documents || []).filter(
    (d) => d.status === 'Missing' || d.status === 'Rejected'
  );
  const missingCount = missingDocs.length;
  const hasMissing = missingCount > 0;

  // Match records with similar missing document profile and comparable issue count (within +-1)
  const matches = history.filter((h) => {
    const matchMissing = h.missingDocsAtSubmission === hasMissing;
    const histIssues = h.issueCount ?? 0;
    const matchIssues = Math.abs(histIssues - openIssueCount) <= 1;
    return matchMissing && matchIssues;
  });

  if (matches.length < 5) {
    return null; // Not enough similar sample cases
  }

  const totalDays = matches.reduce((acc, cur) => acc + (cur.durationDays ?? 12), 0);
  const avgDays = Math.round(totalDays / matches.length);
  const extraReviewCases = matches.filter((m) => m.reviewCount > 1).length;
  const extraReviewRate = Math.round((extraReviewCases / matches.length) * 100);

  return {
    matchedCount: matches.length,
    averageDays: avgDays,
    extraReviewRate,
    sampleApplicationIds: matches.slice(0, 3).map((m) => m.applicationId),
  };
}

/**
 * Rule-based Delay Risk Evaluator.
 * Assigns points for missing documents, open validation issues, days pending, and status.
 */
export function assessDelayRisk(
  record: StudentRecord,
  issues: ValidationIssue[],
  history: ProcessingHistory[] = [],
  config: DelayRiskConfig = getDelayRiskConfig(),
  priorReviewCount = 0
): DelayAssessment {
  let score = 0;
  const reasons: string[] = [];
  const recommendedActions: string[] = [];

  // 1. Missing or Rejected Documents
  const missingDocs = (record.documents || []).filter(
    (d) => d.status === 'Missing' || d.status === 'Rejected'
  );

  if (missingDocs.length > 0) {
    const docPoints = missingDocs.length * config.pointsPerMissingDoc;
    score += docPoints;
    const names = missingDocs.map((d) => `${d.type} (${d.status})`).join(', ');
    reasons.push(
      `${missingDocs.length} required document(s) missing/rejected (${names}) [Adds ${docPoints} pts]`
    );
    recommendedActions.push('Request student to upload verified copies of missing/rejected documents.');
  }

  // 2. Open Validation Issues
  const openIssues = issues.filter((i) => !i.resolved);
  if (openIssues.length > 0) {
    let issuePoints = 0;
    const highIssues = openIssues.filter((i) => i.severity === 'High');
    const nonHighIssues = openIssues.filter((i) => i.severity !== 'High');

    issuePoints += highIssues.length * config.pointsHighSeverityIssue;
    issuePoints += nonHighIssues.length * config.pointsPerOpenValidationIssue;
    score += issuePoints;

    reasons.push(
      `${openIssues.length} unresolved validation issue(s) (${highIssues.length} High severity) [Adds ${issuePoints} pts]`
    );

    if (highIssues.some((i) => i.type.includes('Age') || i.type.includes('Timeline') || i.type.includes('Score'))) {
      recommendedActions.push('Cross-verify conflicting academic marks and dates with institutional admission office.');
    }
    if (highIssues.some((i) => i.type.includes('Duplicate'))) {
      recommendedActions.push('Resolve conflicting APAAR identifier with administrative registrar.');
    }
  }

  // 3. Days Pending
  const daysPending = calculateDaysPending(record.submittedDate);
  if (daysPending >= config.pendingDaysHigh) {
    score += 2;
    reasons.push(
      `Application has been pending for ${daysPending} days (exceeds high threshold of ${config.pendingDaysHigh} days) [Adds 2 pts]`
    );
    recommendedActions.push(
      `Escalate pending application to senior reviewer (aging ${daysPending} days).`
    );
  } else if (daysPending >= config.pendingDaysMedium) {
    score += 1;
    reasons.push(
      `Application has been pending for ${daysPending} days (exceeds alert threshold of ${config.pendingDaysMedium} days) [Adds 1 pt]`
    );
    recommendedActions.push('Follow up with department reviewer regarding queue turnaround.');
  }

  // 4. Status Needs Correction
  if (record.applicationStatus === 'Needs Correction') {
    score += config.extraPointsStatusNeedsCorrection;
    reasons.push(
      `Current application status is marked as 'Needs Correction' [Adds ${config.extraPointsStatusNeedsCorrection} pts]`
    );
    recommendedActions.push('Track student response to correction notices.');
  }

  // 5. Prior Review Iterations
  if (priorReviewCount > 1) {
    const reviewPoints = (priorReviewCount - 1) * config.extraPointsPerPriorReview;
    score += reviewPoints;
    reasons.push(
      `Application has undergone ${priorReviewCount} review cycles [Adds ${reviewPoints} pts]`
    );
    recommendedActions.push('Schedule joint review session to finalize resolution.');
  }

  // 6. Similar historical cases analysis
  const similar = findSimilarCases(record, openIssues.length, history);
  if (similar) {
    if (similar.averageDays > 20 || similar.extraReviewRate >= 50) {
      score += config.similarCasePoints;
      reasons.push(
        `Historical cohort (${similar.matchedCount} similar cases) required avg ${similar.averageDays} days with ${similar.extraReviewRate}% re-review rate [Adds ${config.similarCasePoints} pt]`
      );
    }
  }

  // Ensure default clean recommendation if none triggered
  if (reasons.length === 0) {
    reasons.push('Record is complete with no detected anomalies or aging backlog.');
    recommendedActions.push('Proceed with standard batch verification in demo mode.');
  }

  // Determine Risk Label based on thresholds
  let riskLabel: RiskLabel = 'Low';
  if (score >= config.thresholdMediumMax + 1) {
    riskLabel = 'High';
  } else if (score >= config.thresholdLowMax) {
    riskLabel = 'Medium';
  } else {
    riskLabel = 'Low';
  }

  return {
    studentId: record.id,
    riskLabel,
    score,
    reasons,
    recommendedActions,
    similarCases: similar ?? undefined,
    assessedAt: new Date().toISOString(),
  };
}
