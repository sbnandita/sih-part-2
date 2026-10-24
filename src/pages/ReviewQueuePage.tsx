import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, ReviewCase, CaseStatus, ProcessingHistory } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk, calculateDaysPending, getDelayRiskConfig } from '../lib/delayRisk';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/auth';
import { useToast } from '../components/Toast';
import { exportReviewQueueToCsv } from '../lib/csv';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Download,
  Filter,
  Eye,
  ArrowUpDown,
  Search,
  Check,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const { role, user } = useAuthStore();
  const { showToast } = useToast();
  const repo = getRepository();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [history, setHistory] = useState<ProcessingHistory[]>([]);
  const [reviewCases, setReviewCases] = useState<Record<string, ReviewCase>>({});
  const [loading, setLoading] = useState(true);

  // Filters & sorting
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('Unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'riskScore' | 'daysPending'>('riskScore');

  const config = getDelayRiskConfig();

  const loadData = async () => {
    setLoading(true);
    const all = await repo.getAllStudentsRaw();
    const hist = await repo.getProcessingHistory();
    const cases = await repo.getAllReviewCases();
    const caseMap: Record<string, ReviewCase> = {};
    cases.forEach((c) => {
      caseMap[c.studentId] = c;
    });

    setStudents(all);
    setHistory(hist);
    setReviewCases(caseMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute queue items: prioritize pending applications
  const queueItems = useMemo(() => {
    return students
      .filter((s) => s.applicationStatus !== 'Verified in Demo')
      .map((student) => {
        const issues = validateStudentRecord(student, students);
        const assessment = assessDelayRisk(student, issues, history, config);
        const daysPending = calculateDaysPending(student.submittedDate);
        const rCase = reviewCases[student.id];
        const caseStatus: CaseStatus = rCase?.caseStatus || 'Open';

        const missingDocsList = student.documents
          .filter((d) => d.status === 'Missing' || d.status === 'Rejected')
          .map((d) => `${d.type} (${d.status})`);

        return {
          student,
          studentName: student.studentName,
          demoApaarId: student.demoApaarId,
          department: student.department,
          riskLabel: assessment.riskLabel,
          score: assessment.score,
          reasons: assessment.reasons,
          recommendedActions: assessment.recommendedActions,
          daysPending,
          missingDocsList,
          caseStatus,
          reviewNotes: rCase?.notes || '',
        };
      });
  }, [students, history, reviewCases, config]);

  // Filter queue items
  const filteredItems = useMemo(() => {
    return queueItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.studentName.toLowerCase().includes(q) ||
          item.demoApaarId.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (caseStatusFilter === 'Unresolved') {
        if (item.caseStatus === 'Resolved') return false;
      } else if (caseStatusFilter !== 'All') {
        if (item.caseStatus !== caseStatusFilter) return false;
      }

      return true;
    });
  }, [queueItems, searchQuery, caseStatusFilter]);

  // Sort: Prioritized by risk score, then days pending
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      if (sortBy === 'riskScore') {
        if (b.score !== a.score) return b.score - a.score;
        return b.daysPending - a.daysPending;
      } else {
        if (b.daysPending !== a.daysPending) return b.daysPending - a.daysPending;
        return b.score - a.score;
      }
    });
    return list;
  }, [filteredItems, sortBy]);

  const handleUpdateCaseStatus = async (
    studentId: string,
    studentName: string,
    demoId: string,
    newStatus: CaseStatus
  ) => {
    if (!can(role, 'update:review_status')) return;

    try {
      const oldStatus = reviewCases[studentId]?.caseStatus || 'Open';
      const updatedCase: ReviewCase = {
        studentId,
        caseStatus: newStatus,
        notes: `Triage updated to ${newStatus} by ${user?.name || 'Review Staff'}.`,
        assignedTo: user?.name || 'Review Staff',
      };

      await repo.saveReviewCase(updatedCase);

      // If marked resolved, also update student application status to Verified in Demo
      if (newStatus === 'Resolved') {
        await repo.updateStudent(studentId, {
          applicationStatus: 'Verified in Demo',
        });
      } else if (newStatus === 'Follow-Up Required') {
        await repo.updateStudent(studentId, {
          applicationStatus: 'Needs Correction',
        });
      } else if (newStatus === 'Reviewed') {
        await repo.updateStudent(studentId, {
          applicationStatus: 'Under Review',
        });
      }

      // Add to audit log
      await repo.addAuditLog({
        userId: user?.id || 'usr-staff',
        userName: user?.name || 'Review Staff',
        action: `Review Queue Action: ${newStatus}`,
        recordId: studentId,
        recordIdentifier: `${studentName} (${demoId})`,
        oldValue: `Case Status: ${oldStatus}`,
        newValue: `Case Status: ${newStatus}`,
      });

      showToast(`Updated ${studentName} case status to ${newStatus}`);
      loadData();
    } catch (err: any) {
      showToast('Error updating case: ' + err.message, 'error');
    }
  };

  const handleExport = () => {
    exportReviewQueueToCsv(sortedItems);
    showToast('Exported prioritized review queue as CSV');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Staff Review Queue</h1>
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Prioritized Backlog
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized triaging order based on synthetic delay risk points and elapsed submission age.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can(role, 'export:data') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Queue CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Control bar: search, filters & sort */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by student name, ID..."
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 w-60"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Case Status:</span>
            <select
              value={caseStatusFilter}
              onChange={(e) => setCaseStatusFilter(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded text-xs bg-white font-medium"
              aria-label="Filter by Case Status"
            >
              <option value="Unresolved">Unresolved (Open / Follow-Up / Reviewed)</option>
              <option value="Open">Open Only</option>
              <option value="Follow-Up Required">Follow-Up Required</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Resolved">Resolved</option>
              <option value="All">All Cases</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Sort By:</span>
            <button
              onClick={() =>
                setSortBy((prev) => (prev === 'riskScore' ? 'daysPending' : 'riskScore'))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span>{sortBy === 'riskScore' ? 'Risk Score (High First)' : 'Days Pending (Oldest First)'}</span>
            </button>
          </div>
        </div>

        <div className="text-slate-500">
          <strong>{sortedItems.length}</strong> items in triage queue
        </div>
      </div>

      {/* Queue Table */}
      {sortedItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Queue is clear!</h3>
          <p className="text-xs text-slate-500 mt-1">
            No pending items match the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3.5">Priority / Risk</th>
                  <th className="p-3.5">Student Details</th>
                  <th className="p-3.5">Days Pending</th>
                  <th className="p-3.5">Delay Drivers (Reasons)</th>
                  <th className="p-3.5">Missing Documents</th>
                  <th className="p-3.5">Recommended Action</th>
                  <th className="p-3.5">Case State</th>
                  <th className="p-3.5 text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 whitespace-nowrap">
                      <RiskBadge
                        label={item.riskLabel}
                        score={item.score}
                        showScore
                        size="sm"
                      />
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <Link
                        to={`/students/${item.student.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 hover:underline block"
                      >
                        {item.studentName}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-400">
                        {item.demoApaarId} • {item.department}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`font-semibold inline-flex items-center gap-1 ${
                          item.daysPending >= 30
                            ? 'text-rose-700'
                            : item.daysPending >= 14
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {item.daysPending}d
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="text-[11px] text-slate-700 line-clamp-2">
                        {item.reasons[0] || 'Standard processing'}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {item.missingDocsList.length === 0 ? (
                        <span className="text-emerald-700 font-medium text-[11px]">All Submitted</span>
                      ) : (
                        <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {item.missingDocsList.length} Missing/Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="text-[11px] text-blue-900 bg-blue-50/70 p-1.5 rounded border border-blue-100 line-clamp-2">
                        {item.recommendedActions[0] || 'Review record.'}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <StatusBadge status={item.caseStatus} size="sm" />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {can(role, 'update:review_status') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              handleUpdateCaseStatus(
                                item.student.id,
                                item.studentName,
                                item.demoApaarId,
                                'Reviewed'
                              )
                            }
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold"
                            title="Mark application Reviewed"
                          >
                            Reviewed
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateCaseStatus(
                                item.student.id,
                                item.studentName,
                                item.demoApaarId,
                                'Follow-Up Required'
                              )
                            }
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold"
                            title="Mark as Follow-Up Required"
                          >
                            Follow-Up
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateCaseStatus(
                                item.student.id,
                                item.studentName,
                                item.demoApaarId,
                                'Resolved'
                              )
                            }
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold shadow-2xs"
                            title="Resolve case and mark Verified in Demo"
                          >
                            Resolved
                          </button>
                        </div>
                      ) : (
                        <Link
                          to={`/students/${item.student.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 inline-block"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
