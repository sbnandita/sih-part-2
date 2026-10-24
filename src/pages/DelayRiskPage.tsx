import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, ProcessingHistory } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk, calculateDaysPending, getDelayRiskConfig } from '../lib/delayRisk';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Filter,
  CheckCircle2,
  FileQuestion,
  UserCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export const DelayRiskPage: React.FC = () => {
  const repo = getRepository();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [history, setHistory] = useState<ProcessingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [daysPendingMin, setDaysPendingMin] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const config = getDelayRiskConfig();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const all = await repo.getAllStudentsRaw();
      const hist = await repo.getProcessingHistory();
      setStudents(all);
      setHistory(hist);
      setLoading(false);
    }
    loadData();
  }, []);

  // Compute assessments only for pending/under review/needs correction
  const pendingAssessments = useMemo(() => {
    return students
      .filter((s) => s.applicationStatus !== 'Verified in Demo')
      .map((student) => {
        const issues = validateStudentRecord(student, students);
        const assessment = assessDelayRisk(student, issues, history, config);
        const daysPending = calculateDaysPending(student.submittedDate);
        return {
          student,
          issues,
          assessment,
          daysPending,
        };
      });
  }, [students, history, config]);

  // Summary counts
  const riskCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let totalDays = 0;

    pendingAssessments.forEach((item) => {
      totalDays += item.daysPending;
      if (item.assessment.riskLabel === 'High') high++;
      else if (item.assessment.riskLabel === 'Medium') medium++;
      else low++;
    });

    const avgDays = pendingAssessments.length ? Math.round(totalDays / pendingAssessments.length) : 0;

    return { high, medium, low, total: pendingAssessments.length, avgDays };
  }, [pendingAssessments]);

  // Filtered list
  const filteredList = useMemo(() => {
    return pendingAssessments.filter((item) => {
      if (highRiskOnly && item.assessment.riskLabel !== 'High') {
        return false;
      }
      if (item.daysPending < daysPendingMin) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.student.studentName.toLowerCase().includes(q) ||
          item.student.demoApaarId.toLowerCase().includes(q) ||
          item.student.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [pendingAssessments, highRiskOnly, daysPendingMin, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Mandatory Disclaimer Callout */}
      <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4.5 sm:p-5 text-amber-900 shadow-2xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h2 className="font-bold text-sm tracking-tight text-amber-950 flex items-center gap-2">
              <span>Demo Estimate — Not Trained on Real Historical Data</span>
              <span className="bg-amber-200/80 text-amber-900 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">
                Rule-Based Only
              </span>
            </h2>
            <p className="text-amber-900/90 leading-relaxed">
              Delay risk is a <strong>rule-based synthetic heuristic</strong> designed for process bottleneck demonstration.
              No machine learning model is claimed or active. <strong>Estimates only, not guaranteed processing times. Human review required.</strong>
              Sensitive attributes (gender, religion, caste, disability, income, region) are strictly excluded. Predictions never auto-reject or deny applications.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Delay-Risk Assessment & Triage</h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritize aging applications, detect document submission bottlenecks, and review rule-driven delay drivers.
          </p>
        </div>

        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Tune Rule Thresholds</span>
        </Link>
      </div>

      {/* Flow Diagram (Submission -> Validation -> Risk Rules -> Risk Label -> Staff Action) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Delay Risk Pipeline Architecture</span>
          <span className="text-[10px] font-normal text-slate-400 capitalize">
            (Deterministic Rule Flow)
          </span>
        </h2>

        <div className="flex items-center justify-between min-w-[720px] gap-2 py-2">
          {/* Step 1 */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-1.5">
              1
            </div>
            <div className="font-bold text-slate-800 text-xs">Submission</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Synthetic application & docs</p>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

          {/* Step 2 */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-1.5">
              2
            </div>
            <div className="font-bold text-slate-800 text-xs">Validation</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Discrepancy detection</p>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

          {/* Step 3 */}
          <div className="flex-1 bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
              3
            </div>
            <div className="font-bold text-blue-900 text-xs">Risk Rules</div>
            <p className="text-[10px] text-blue-600 mt-0.5">Points for aging & missing docs</p>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

          {/* Step 4 */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-1.5">
              4
            </div>
            <div className="font-bold text-slate-800 text-xs">Risk Label</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Low (&lt;3), Med (3-5), High (≥6)</p>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

          {/* Step 5 */}
          <div className="flex-1 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
              5
            </div>
            <div className="font-bold text-emerald-900 text-xs">Staff Action</div>
            <p className="text-[10px] text-emerald-700 mt-0.5">Triage & human verification</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Pending Cohort</span>
          <div className="text-2xl font-bold text-navy-900 mt-1">{riskCounts.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Avg aging: {riskCounts.avgDays} days</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-medium text-rose-700">High Delay Risk (Score ≥ 6)</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">{riskCounts.high}</div>
          <p className="text-[11px] text-rose-600 mt-0.5">Requires immediate triage</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-xs font-medium text-amber-800">Medium Delay Risk (3 - 5)</span>
          <div className="text-2xl font-bold text-amber-800 mt-1">{riskCounts.medium}</div>
          <p className="text-[11px] text-amber-700 mt-0.5">Approaching SLA threshold</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-medium text-emerald-700">Low Delay Risk (&lt; 3)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{riskCounts.low}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Normal processing track</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, ID, department..."
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highRiskOnly}
              onChange={(e) => setHighRiskOnly(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="font-semibold text-rose-800">High Risk Only</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Pending aging:</span>
            <select
              value={daysPendingMin}
              onChange={(e) => setDaysPendingMin(Number(e.target.value))}
              className="py-1 px-2 border border-slate-200 rounded text-xs bg-white font-medium"
              aria-label="Filter by days pending"
            >
              <option value="0">All pending days</option>
              <option value="14">Pending &gt; 14 days</option>
              <option value="30">Pending &gt; 30 days (High aging)</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500">
          Showing <strong>{filteredList.length}</strong> pending applications
        </div>
      </div>

      {/* Table of Pending Applications */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Student / ID</th>
                <th className="p-3.5">Days Pending</th>
                <th className="p-3.5">Delay Drivers (Reasons)</th>
                <th className="p-3.5">Recommended Next Steps</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(({ student, assessment, daysPending }) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 whitespace-nowrap">
                    <RiskBadge
                      label={assessment.riskLabel}
                      score={assessment.score}
                      showScore
                      size="sm"
                    />
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <Link
                      to={`/students/${student.id}`}
                      className="font-medium text-blue-600 hover:underline block"
                    >
                      {student.studentName}
                    </Link>
                    <span className="font-mono text-[10px] text-slate-400">
                      {student.demoApaarId}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        daysPending >= 30
                          ? 'text-rose-700'
                          : daysPending >= 14
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {daysPending} days
                    </span>
                  </td>
                  <td className="p-3.5 max-w-sm">
                    <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                      {assessment.reasons.slice(0, 2).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <div className="text-[11px] text-blue-800 font-medium bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                      {assessment.recommendedActions[0] || 'Standard human review.'}
                    </div>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <Link
                      to={`/students/${student.id}`}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-medium text-[11px] transition-colors"
                    >
                      Review Case
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
