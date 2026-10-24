import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRepository } from '../data/localStorageRepo';
import {
  StudentRecord,
  ValidationIssue,
  ProcessingHistory,
  AuditLog,
  ReviewCase,
  ApplicationStatus,
  CaseStatus,
} from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk } from '../lib/delayRisk';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/auth';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileCheck2,
  Calendar,
  GraduationCap,
  History,
  MessageSquare,
  FileText,
  AlertCircle,
  HelpCircle,
  Send,
  Trash2,
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { showToast } = useToast();
  const repo = getRepository();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [history, setHistory] = useState<ProcessingHistory[]>([]);
  const [reviewCase, setReviewCase] = useState<ReviewCase | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Form state
  const [decisionStatus, setDecisionStatus] = useState<ApplicationStatus>('Pending');
  const [decisionCaseStatus, setDecisionCaseStatus] = useState<CaseStatus>('Open');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const rec = await repo.getStudentById(id);
    if (!rec) {
      showToast('Student record not found', 'error');
      navigate('/students');
      return;
    }
    const all = await repo.getAllStudentsRaw();
    const hist = await repo.getProcessingHistory();
    const rev = await repo.getReviewCase(id);
    const logs = await repo.getAuditLogs(id);

    setStudent(rec);
    setAllStudents(all);
    setHistory(hist);
    setReviewCase(rev);
    setAuditLogs(logs);

    setDecisionStatus(rec.applicationStatus);
    if (rev) {
      setDecisionCaseStatus(rev.caseStatus);
      setDecisionNotes(rev.notes || '');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Dynamic Validation & Risk calculations
  const { issues, assessment } = useMemo(() => {
    if (!student) return { issues: [], assessment: null };
    const iss = validateStudentRecord(student, allStudents);
    const ass = assessDelayRisk(student, iss, history);
    return { issues: iss, assessment: ass };
  }, [student, allStudents, history]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !can(role, 'update:review_status')) return;

    setSubmittingReview(true);
    try {
      const oldStatus = student.applicationStatus;
      const updated = await repo.updateStudent(student.id, {
        applicationStatus: decisionStatus,
      });
      setStudent(updated);

      await repo.saveReviewCase({
        studentId: student.id,
        caseStatus: decisionCaseStatus,
        notes: decisionNotes,
        assignedTo: user?.name || 'Review Staff',
      });

      await repo.addAuditLog({
        userId: user?.id || 'usr-staff',
        userName: user?.name || 'Review Staff',
        action: `Review Status: ${decisionStatus} (${decisionCaseStatus})`,
        recordId: student.id,
        recordIdentifier: `${student.studentName} (${student.demoApaarId})`,
        oldValue: oldStatus,
        newValue: `${decisionStatus} - Note: ${decisionNotes || 'None'}`,
      });

      showToast(`Updated review decision for ${student.studentName}`);
      loadData();
    } catch (err: any) {
      showToast('Error saving review: ' + err.message, 'error');
    }
    setSubmittingReview(false);
  };

  const handleDeleteStudent = async () => {
    if (!student || !can(role, 'delete:student')) return;
    if (!window.confirm(`Are you sure you want to permanently delete record for ${student.studentName}?`)) {
      return;
    }

    try {
      await repo.deleteStudent(student.id);
      await repo.addAuditLog({
        userId: user?.id || 'usr-admin',
        userName: user?.name || 'Administrator',
        action: 'Deleted Student Record',
        recordId: student.id,
        recordIdentifier: `${student.studentName} (${student.demoApaarId})`,
        oldValue: 'Active Record',
        newValue: 'Deleted from Repository',
      });
      showToast(`Successfully deleted ${student.studentName}`);
      navigate('/students');
    } catch (err: any) {
      showToast('Error deleting record: ' + err.message, 'error');
    }
  };

  if (loading || !student || !assessment) {
    return <div className="p-12 text-center text-slate-500">Loading student details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back and Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            aria-label="Back to students list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-900 tracking-tight">{student.studentName}</h1>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
                {student.demoApaarId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{student.institution}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusBadge status={student.applicationStatus} size="md" />
          <RiskBadge label={assessment.riskLabel} score={assessment.score} showScore size="md" />
          {can(role, 'edit:student') && (
            <Link
              to={`/students/${student.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Record</span>
            </Link>
          )}
          {can(role, 'delete:student') && (
            <button
              onClick={handleDeleteStudent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition-colors"
              title="Delete record (Admin only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Left Column (Academic Info & Documents) + Right Column (Risk & Decision) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Student & Academic Profile */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-navy-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Academic & Admission Metadata
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Enrolled Course</span>
                <span className="font-semibold text-slate-800">{student.course}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Department</span>
                <span className="font-semibold text-slate-800">{student.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                <span className="font-semibold text-slate-800">{student.dateOfBirth}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Admission Date</span>
                <span className="font-semibold text-slate-800">{student.admissionDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Program Timeline</span>
                <span className="font-semibold text-slate-800">
                  {student.enrollmentYear} — {student.expectedGraduationYear}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Submission Date</span>
                <span className="font-semibold text-slate-800">{student.submittedDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Previous Qualification</span>
                <span className="font-semibold text-slate-800">{student.previousQualification}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Previous Marks</span>
                <span className="font-semibold text-slate-800">{student.previousPercentage}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current CGPA</span>
                <span className="font-semibold text-slate-800">{student.currentCgpa} / 10.0</span>
              </div>
            </div>
          </div>

          {/* Card 2: Document Completeness Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-navy-900">Document Completeness Checklist</h2>
              </div>
              <span className="text-xs text-slate-500">
                {student.documents.filter((d) => d.status === 'Submitted').length} of {student.documents.length} Submitted
              </span>
            </div>

            <div className="space-y-2.5">
              {student.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {doc.status === 'Submitted' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : doc.status === 'Rejected' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-slate-800">{doc.type}</span>
                      {doc.fileName && (
                        <span className="text-[11px] text-slate-400 block font-mono">{doc.fileName}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      doc.status === 'Submitted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Active Validation Issues */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-navy-900">Detected Inconsistencies & Issues</h2>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  issues.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {issues.length} Issue(s)
              </span>
            </div>

            {issues.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No validation inconsistencies found. Record meets all demographic and academic consistency rules.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((iss, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900">[{iss.type}]</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                        {iss.severity} Severity
                      </span>
                    </div>
                    <p className="text-slate-700">{iss.description}</p>
                    {iss.fixHint && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        💡 How to fix: {iss.fixHint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Change History Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-navy-900">Change History & Audit Trail</h2>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous audit modifications recorded for this student.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="text-xs pl-3 border-l-2 border-blue-400 space-y-0.5">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      By <span className="font-medium text-slate-800">{log.userName || log.userId}</span>
                      {log.newValue && ` • Result: ${log.newValue}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span on desktop) */}
        <div className="space-y-6">
          {/* Card 5: Delay-Risk Assessment Explanation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-900">Delay-Risk Assessment</span>
                <RiskBadge label={assessment.riskLabel} score={assessment.score} showScore size="sm" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Demo Estimate — Not Trained on Real Historical Data.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <span className="font-semibold text-slate-700 block">Assessment Factor Reasons:</span>
              <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                {assessment.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 text-xs space-y-1.5">
              <span className="font-semibold text-blue-900 block">Recommended Staff Action:</span>
              <ul className="space-y-1 text-blue-800 list-disc list-inside text-[11px]">
                {assessment.recommendedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            {/* Similar Historical Cases */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Similar Cohort Comparison
              </span>
              {assessment.similarCases ? (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Matched Historical Cases:</span>
                    <strong className="text-slate-800">{assessment.similarCases.matchedCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Historical Turnaround:</span>
                    <strong className="text-slate-800">{assessment.similarCases.averageDays} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Multiple Reviews:</span>
                    <strong className="text-slate-800">{assessment.similarCases.extraReviewRate}%</strong>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Not enough similar sample cases in historical records (threshold: 5+ required).
                </p>
              )}
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              Estimates only, not guaranteed processing times. Human review required.
            </div>
          </div>

          {/* Card 6: Review Decision Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-navy-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Staff Review Decision
            </h2>

            {can(role, 'update:review_status') ? (
              <form onSubmit={handleDecisionSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Application Status
                  </label>
                  <select
                    value={decisionStatus}
                    onChange={(e) => setDecisionStatus(e.target.value as ApplicationStatus)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Verified in Demo">Verified in Demo</option>
                    <option value="Needs Correction">Needs Correction</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Triage Case Status
                  </label>
                  <select
                    value={decisionCaseStatus}
                    onChange={(e) => setDecisionCaseStatus(e.target.value as CaseStatus)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Follow-Up Required">Follow-Up Required</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Notes / Action Taken
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Enter review findings, communication sent to student, or resolution details..."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReview ? 'Saving Decision...' : 'Save Review Decision'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                <p>
                  Your current demo role (<strong>{role}</strong>) is read-only.
                </p>
                <p className="mt-1">
                  Current Case Status: <strong>{reviewCase?.caseStatus || 'Open'}</strong>
                </p>
                {reviewCase?.notes && (
                  <p className="mt-1 italic">Notes: "{reviewCase.notes}"</p>
                )}
                <p className="mt-2 text-[11px] text-blue-600">
                  Switch to Reviewer or Admin in top navigation to submit review decisions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
