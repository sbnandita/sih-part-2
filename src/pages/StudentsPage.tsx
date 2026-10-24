import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, ApplicationStatus, RiskLabel } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk } from '../lib/delayRisk';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/auth';
import { exportStudentsToCsv, parseStudentsCsv } from '../lib/csv';
import { useToast } from '../components/Toast';
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const { showToast } = useToast();
  const repo = getRepository();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [missingDocsOnly, setMissingDocsOnly] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'studentName' | 'demoApaarId' | 'submittedDate' | 'department'>('submittedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const all = await repo.getAllStudentsRaw();
    setStudents(all);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute assessments and filter/sort in memory
  const processedStudents = useMemo(() => {
    return students.map((s) => {
      const issues = validateStudentRecord(s, students);
      const assessment = assessDelayRisk(s, issues);
      const hasMissing = s.documents.some((d) => d.status === 'Missing' || d.status === 'Rejected');
      return {
        ...s,
        issues,
        assessment,
        hasMissing,
      };
    });
  }, [students]);

  const departmentsList = useMemo(() => {
    const set = new Set(students.map((s) => s.department));
    return Array.from(set).filter(Boolean);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return processedStudents.filter((s) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          s.studentName.toLowerCase().includes(q) ||
          s.demoApaarId.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.institution.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status filter
      if (statusFilter !== 'All' && s.applicationStatus !== statusFilter) {
        return false;
      }

      // Department filter
      if (deptFilter !== 'All' && s.department !== deptFilter) {
        return false;
      }

      // Risk filter
      if (riskFilter !== 'All' && s.assessment.riskLabel !== riskFilter) {
        return false;
      }

      // Missing docs filter
      if (missingDocsOnly && !s.hasMissing) {
        return false;
      }

      return true;
    });
  }, [processedStudents, searchQuery, statusFilter, deptFilter, riskFilter, missingDocsOnly]);

  // Sort
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => {
      const valA = (a[sortBy] || '').toString().toLowerCase();
      const valB = (b[sortBy] || '').toString().toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredStudents, sortBy, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const handleSort = (field: 'studentName' | 'demoApaarId' | 'submittedDate' | 'department') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    exportStudentsToCsv(students);
    showToast('Exported synthetic student records as CSV');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseStudentsCsv(file);
    if (!res.success || !res.data) {
      showToast(res.error || 'Failed to import CSV file', 'error');
      return;
    }

    try {
      for (const item of res.data) {
        if (item.demoApaarId && item.studentName) {
          await repo.createStudent(item as any);
        }
      }
      await repo.addAuditLog({
        userId: user?.id || 'usr-reviewer',
        userName: user?.name || 'Review Staff',
        action: 'Imported CSV Records',
        recordId: 'batch-import',
        recordIdentifier: `${res.data.length} Records Imported`,
        newValue: `${res.data.length} records added to dataset`,
      });
      showToast(`Successfully imported ${res.data.length} records from CSV!`);
      loadData();
    } catch (err: any) {
      showToast('Error importing records: ' + err.message, 'error');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Student Records Directory</h1>
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Synthetic Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse and manage synthetic student records, audit document completeness, and trigger verification reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can(role, 'export:data') && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {can(role, 'import:data') && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".csv"
                className="hidden"
                aria-label="Upload CSV File"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
              </button>
            </>
          )}

          {can(role, 'create:student') && (
            <button
              onClick={() => navigate('/students/new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by student name, DEMO-APAAR-XXXX, department..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Status"
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Application Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified in Demo">Verified in Demo</option>
              <option value="Needs Correction">Needs Correction</option>
            </select>
          </div>

          {/* Department filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Department"
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4">
            {/* Risk filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Delay Risk:</span>
              <select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1 px-2 border border-slate-200 rounded text-xs bg-white font-medium"
                aria-label="Filter by Delay Risk"
              >
                <option value="All">All Risk Levels</option>
                <option value="High">High Risk Only</option>
                <option value="Medium">Medium Risk Only</option>
                <option value="Low">Low Risk Only</option>
              </select>
            </div>

            {/* Missing docs toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={missingDocsOnly}
                onChange={(e) => {
                  setMissingDocsOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Missing/Rejected Docs Only</span>
            </label>
          </div>

          <div className="text-slate-500">
            Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> records
          </div>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No student records matched criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, clear filter criteria, or import new records.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setDeptFilter('All');
              setRiskFilter('All');
              setMissingDocsOnly(false);
            }}
            className="mt-4 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('demoApaarId')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Demo APAAR ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('studentName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Department</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5">Documents</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Delay Risk</th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('submittedDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Submitted</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((s) => {
                  const missingCount = s.documents.filter(
                    (d) => d.status === 'Missing' || d.status === 'Rejected'
                  ).length;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="p-3.5 font-mono text-slate-700 font-semibold whitespace-nowrap">
                        {s.demoApaarId}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                        <Link
                          to={`/students/${s.id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {s.studentName}
                        </Link>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-[180px] truncate">
                        {s.department}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {missingCount === 0 ? (
                          <span className="text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            5/5 Complete
                          </span>
                        ) : (
                          <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {missingCount} Missing/Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={s.applicationStatus} size="sm" />
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <RiskBadge
                          label={s.assessment.riskLabel}
                          score={s.assessment.score}
                          size="sm"
                        />
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {s.submittedDate}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/students/${s.id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View student details and verification checks"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {can(role, 'edit:student') && (
                            <Link
                              to={`/students/${s.id}/edit`}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Edit record & documents"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedStudents.length} results)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded font-medium text-xs transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
