import React, { useEffect, useState, useMemo } from 'react';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, ValidationIssue, AuditLog, ReviewCase } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk } from '../lib/delayRisk';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { CardSkeleton } from '../components/LoadingSkeleton';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  FileQuestion,
  History,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const repo = getRepository();
      const allStudents = await repo.getAllStudentsRaw();
      const logs = await repo.getAuditLogs();
      const reviews = await repo.getAllReviewCases();
      setStudents(allStudents);
      setAuditLogs(logs);
      setReviewCases(reviews);
      setLoading(false);
    }
    loadData();
  }, []);

  // Compute all metrics dynamically from the loaded dataset
  const metrics = useMemo(() => {
    const total = students.length;
    let verified = 0;
    let pending = 0;
    let underReview = 0;
    let needsCorrection = 0;
    let recordsWithIssues = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    const issueTypeCounts: Record<string, number> = {};

    students.forEach((s) => {
      if (s.applicationStatus === 'Verified in Demo') verified++;
      else if (s.applicationStatus === 'Pending') pending++;
      else if (s.applicationStatus === 'Under Review') underReview++;
      else if (s.applicationStatus === 'Needs Correction') needsCorrection++;

      const issues = validateStudentRecord(s, students);
      if (issues.length > 0) {
        recordsWithIssues++;
        issues.forEach((iss) => {
          issueTypeCounts[iss.type] = (issueTypeCounts[iss.type] || 0) + 1;
        });
      }

      // Compute delay risk for pending/review applications
      const assessment = assessDelayRisk(s, issues);
      if (assessment.riskLabel === 'High') highRiskCount++;
      else if (assessment.riskLabel === 'Medium') mediumRiskCount++;
      else lowRiskCount++;
    });

    const followUpRequired = reviewCases.filter(
      (r) => r.caseStatus === 'Follow-Up Required' || r.caseStatus === 'Open'
    ).length;

    // Top validation issue types for chart
    const topIssuesData = Object.entries(issueTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Status distribution data for Donut chart
    const statusData = [
      { name: 'Verified in Demo', value: verified, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Under Review', value: underReview, color: '#3B82F6' },
      { name: 'Needs Correction', value: needsCorrection, color: '#EF4444' },
    ].filter((item) => item.value > 0);

    // Delay risk categories data
    const riskData = [
      { name: 'Low Risk', count: lowRiskCount, color: '#10B981' },
      { name: 'Medium Risk', count: mediumRiskCount, color: '#F59E0B' },
      { name: 'High Risk', count: highRiskCount, color: '#EF4444' },
    ];

    return {
      total,
      verified,
      pending,
      underReview,
      needsCorrection,
      recordsWithIssues,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      followUpRequired,
      topIssuesData,
      statusData,
      riskData,
    };
  }, [students, reviewCases]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Synthetic Data Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Institutional Verification Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status overview, discrepancy detection, and rule-based processing backlog triage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Synthetic Demo Data
          </span>
        </div>
      </div>

      {/* 6 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Records */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Records</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-navy-900">{metrics.total}</span>
            <span className="text-[11px] text-slate-400">cohort</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All enrolled records</p>
        </div>

        {/* Verified in Demo */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verified in Demo</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{metrics.verified}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {metrics.total ? Math.round((metrics.verified / metrics.total) * 100) : 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for issuance</p>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Review</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{metrics.pending}</span>
            <span className="text-[11px] text-slate-400">in queue</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting staff action</p>
        </div>

        {/* Missing / Inconsistent Info */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Discrepancies</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{metrics.recordsWithIssues}</span>
            <span className="text-[11px] text-rose-600 font-semibold">
              {metrics.total ? Math.round((metrics.recordsWithIssues / metrics.total) * 100) : 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Missing / invalid data</p>
        </div>

        {/* High Delay Risk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">High Delay Risk</span>
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{metrics.highRiskCount}</span>
            <span className="text-[11px] text-slate-400">cases</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rule score ≥ 6</p>
        </div>

        {/* Follow-up Required */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Follow-Ups</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{metrics.followUpRequired}</span>
            <span className="text-[11px] text-slate-400">cases</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned for follow-up</p>
        </div>
      </div>

      {/* Disclaimers Bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Demo Estimate Notice:</strong> Delay risks are computed via institutional rule heuristics, not machine learning.
            Estimates only, not guaranteed processing times. Human review required.
          </span>
        </div>
        <Link
          to="/delay-risk"
          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-xs shrink-0"
        >
          View Risk Breakdown <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Status Distribution Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Application Status Distribution</h2>
              <p className="text-[11px] text-slate-400">Current cohort status breakdown</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Synthetic
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} students`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Validation Issues Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Top Detected Discrepancies</h2>
              <p className="text-[11px] text-slate-400">Most frequent rule failures</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Synthetic
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.topIssuesData}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 40, bottom: 5 }}
              >
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="type" type="category" width={90} fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} occurrences`, 'Frequency']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Delay-Risk Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Delay-Risk Categories</h2>
              <p className="text-[11px] text-slate-400">Rule-based triage segments</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Rule Heuristics
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.riskData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} students`, 'Applications']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {metrics.riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feed & Quick Queue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Log Feed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Recent Audit Trail</h2>
            </div>
            <Link
              to="/reports"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View Full Log
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-800">{log.action}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Target: <span className="font-medium text-slate-700">{log.recordIdentifier}</span>
                  </div>
                  {log.oldValue && log.newValue && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {log.oldValue} → <span className="text-blue-600 font-medium">{log.newValue}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-slate-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-slate-600 font-medium text-[11px] mt-0.5">
                    {log.userName || log.userId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Pending Actions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-800">High-Risk Backlog Quick View</h2>
              </div>
              <Link
                to="/review-queue"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Go to Review Queue
              </Link>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Applications requiring immediate staff intervention due to high delay scores (≥6):
            </p>

            <div className="space-y-2.5">
              {students
                .filter((s) => s.applicationStatus !== 'Verified in Demo')
                .map((s) => {
                  const issues = validateStudentRecord(s, students);
                  const assessment = assessDelayRisk(s, issues);
                  return { student: s, assessment };
                })
                .filter((item) => item.assessment.riskLabel === 'High')
                .slice(0, 4)
                .map(({ student, assessment }) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{student.studentName}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {student.demoApaarId}
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-700 mt-0.5 line-clamp-1">
                        {assessment.reasons[0] || 'High delay risk detected.'}
                      </div>
                    </div>
                    <Link
                      to={`/students/${student.id}`}
                      className="px-2.5 py-1 rounded bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-[11px] shrink-0"
                    >
                      Review
                    </Link>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Human Review Required on all flagged items</span>
            <span className="font-semibold text-slate-700">{metrics.highRiskCount} high risk total</span>
          </div>
        </div>
      </div>
    </div>
  );
};
