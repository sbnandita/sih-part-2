import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, ValidationIssue, IssueSeverity } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/auth';
import { useToast } from '../components/Toast';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  AlertOctagon,
  Filter,
  Eye,
  Check,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const ValidationPage: React.FC = () => {
  const { role, user } = useAuthStore();
  const { showToast } = useToast();
  const repo = getRepository();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [resolvedMap, setResolvedMap] = useState<Record<string, boolean>>({});

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Resolved'>('Active');

  const loadData = async () => {
    setLoading(true);
    const all = await repo.getAllStudentsRaw();
    setStudents(all);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute all issues across the cohort
  const allIssues = useMemo(() => {
    const list: (ValidationIssue & { studentName: string; demoApaarId: string })[] = [];
    students.forEach((s) => {
      const issues = validateStudentRecord(s, students);
      issues.forEach((iss) => {
        list.push({
          ...iss,
          studentName: s.studentName,
          demoApaarId: s.demoApaarId,
          resolved: resolvedMap[iss.id] || false,
        });
      });
    });
    return list;
  }, [students, resolvedMap]);

  // Extract unique issue types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const set = new Set(allIssues.map((i) => i.type));
    return Array.from(set);
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          issue.studentName.toLowerCase().includes(q) ||
          issue.demoApaarId.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.type.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (severityFilter !== 'All' && issue.severity !== severityFilter) {
        return false;
      }

      if (typeFilter !== 'All' && issue.type !== typeFilter) {
        return false;
      }

      if (statusFilter === 'Active' && issue.resolved) return false;
      if (statusFilter === 'Resolved' && !issue.resolved) return false;

      return true;
    });
  }, [allIssues, searchQuery, severityFilter, typeFilter, statusFilter]);

  const handleRerunAll = async () => {
    setRevalidating(true);
    await new Promise((r) => setTimeout(r, 400));
    await loadData();
    setRevalidating(false);
    showToast(`Re-validated all ${students.length} student records against current rule engine.`);
  };

  const handleToggleResolve = async (issueId: string) => {
    if (!can(role, 'run:validation')) return;
    const isNowResolved = !resolvedMap[issueId];
    setResolvedMap((prev) => ({
      ...prev,
      [issueId]: isNowResolved,
    }));

    showToast(
      isNowResolved
        ? 'Marked discrepancy as resolved in demo session'
        : 'Reopened discrepancy issue'
    );
  };

  const activeCount = allIssues.filter((i) => !i.resolved).length;
  const highCount = allIssues.filter((i) => !i.resolved && i.severity === 'High').length;
  const mediumCount = allIssues.filter((i) => !i.resolved && i.severity === 'Medium').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Validation & Discrepancy Hub</h1>
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Synthetic Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated consistency checks: missing documentation, age verification, score bounds, and timeline logic.
          </p>
        </div>

        {can(role, 'run:validation') && (
          <button
            onClick={handleRerunAll}
            disabled={revalidating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? 'animate-spin' : ''}`} />
            <span>{revalidating ? 'Scanning Cohort...' : 'Re-run Validation for All'}</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Active Discrepancies</span>
            <div className="text-2xl font-bold text-navy-900 mt-1">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across current loaded records</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">High Severity Issues</span>
            <div className="text-2xl font-bold text-rose-700 mt-1">{highCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Blocks demo verification</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Medium Severity Issues</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{mediumCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Missing document or dates</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID, or discrepancy type..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by Severity"
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Severities</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="Low">Low Severity</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by Issue Type"
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Discrepancy Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(['Active', 'Resolved', 'All'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setStatusFilter(mode)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    statusFilter === mode
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="text-slate-500">
            Showing <strong>{filteredIssues.length}</strong> discrepancy item(s)
          </div>
        </div>
      </div>

      {/* Issues Table */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No matching issues found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Either no records match the chosen filter or all issues are marked resolved.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Discrepancy Type</th>
                  <th className="p-3.5">Student / Identifier</th>
                  <th className="p-3.5">Description & Hint</th>
                  <th className="p-3.5">State</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      issue.resolved ? 'opacity-60 bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          issue.severity === 'High'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : issue.severity === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {issue.severity === 'High' && <AlertOctagon className="w-3.5 h-3.5" />}
                        {issue.severity === 'Medium' && <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{issue.severity}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 whitespace-nowrap">
                      {issue.type}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <Link
                        to={`/students/${issue.studentId}`}
                        className="font-medium text-blue-600 hover:underline block"
                      >
                        {issue.studentName}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-400">
                        {issue.demoApaarId}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-md">
                      <p className="text-slate-800 leading-relaxed">{issue.description}</p>
                      {issue.fixHint && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          💡 <span className="font-semibold text-slate-700">Fix Hint:</span> {issue.fixHint}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {issue.resolved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          <Check className="w-3 h-3" /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                          Unresolved
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {can(role, 'run:validation') && (
                          <button
                            onClick={() => handleToggleResolve(issue.id)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                          >
                            {issue.resolved ? 'Reopen' : 'Mark Resolved'}
                          </button>
                        )}
                        <Link
                          to={`/students/${issue.studentId}`}
                          className="p-1 text-slate-400 hover:text-blue-600"
                          title="View student file"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
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
