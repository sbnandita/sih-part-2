import React, { useEffect, useState, useMemo } from 'react';
import { getRepository } from '../data/localStorageRepo';
import { StudentRecord, AuditLog } from '../types';
import { validateStudentRecord } from '../lib/validation';
import { assessDelayRisk, calculateDaysPending } from '../lib/delayRisk';
import { exportStudentsToCsv, exportAuditLogsToCsv, exportReviewQueueToCsv } from '../lib/csv';
import { useToast } from '../components/Toast';
import {
  FileBarChart,
  Download,
  Printer,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const repo = getRepository();
  const { showToast } = useToast();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const all = await repo.getAllStudentsRaw();
      const logs = await repo.getAuditLogs();
      setStudents(all);
      setAuditLogs(logs);
      setLoading(false);
    }
    loadData();
  }, []);

  // Compute Departmental Analytics
  const departmentStats = useMemo(() => {
    const map: Record<string, { total: number; verified: number; issues: number; highRisk: number }> = {};
    students.forEach((s) => {
      const dept = s.department || 'General';
      if (!map[dept]) {
        map[dept] = { total: 0, verified: 0, issues: 0, highRisk: 0 };
      }
      map[dept].total++;
      if (s.applicationStatus === 'Verified in Demo') map[dept].verified++;
      const iss = validateStudentRecord(s, students);
      if (iss.length > 0) map[dept].issues++;
      const risk = assessDelayRisk(s, iss);
      if (risk.riskLabel === 'High') map[dept].highRisk++;
    });

    return Object.entries(map).map(([name, data]) => ({
      name: name.replace('Engineering', 'Eng.').replace('& Communication', '& Comm'),
      fullName: name,
      Total: data.total,
      Verified: data.verified,
      Issues: data.issues,
      HighRisk: data.highRisk,
      rate: data.total ? Math.round((data.verified / data.total) * 100) : 0,
    }));
  }, [students]);

  // Handle Exports
  const handleExportStudents = () => {
    exportStudentsToCsv(students);
    showToast('Exported synthetic student dataset as CSV');
  };

  const handleExportAuditLogs = () => {
    exportAuditLogsToCsv(auditLogs);
    showToast('Exported platform audit trail as CSV');
  };

  const handleExportReviewQueue = () => {
    const queue = students
      .filter((s) => s.applicationStatus !== 'Verified in Demo')
      .map((s) => {
        const iss = validateStudentRecord(s, students);
        const risk = assessDelayRisk(s, iss);
        return {
          demoApaarId: s.demoApaarId,
          studentName: s.studentName,
          department: s.department,
          riskLabel: risk.riskLabel,
          score: risk.score,
          daysPending: calculateDaysPending(s.submittedDate),
          reasons: risk.reasons,
          recommendedActions: risk.recommendedActions,
        };
      });
    exportReviewQueueToCsv(queue);
    showToast('Exported review queue as CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Institutional Compliance Reports</h1>
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Synthetic Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official APAAR verification progress metrics, bottleneck diagnostics, and immutable audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={handleExportStudents}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Students CSV</span>
          </button>

          <button
            onClick={handleExportReviewQueue}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Queue CSV</span>
          </button>

          <button
            onClick={handleExportAuditLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Audit CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Synthetic Stamp Header for Print & Web */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800">Report Status:</span>
          <span className="text-slate-600">Generated on 2026-10-24 • All data certified synthetic</span>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Classification: [DEMO INTERNAL STAFF USE ONLY]
        </div>
      </div>

      {/* Chart: Departmental Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Departmental Verification & Discrepancy Breakdown</h2>
            <p className="text-[11px] text-slate-400">Total Enrolled vs Verified vs Active Issues</p>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            Synthetic Demo Data
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentStats}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" interval={0} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Total" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Verified" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Issues" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comprehensive Audit Trail Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-navy-900">Institutional Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-500">
            Total <strong>{auditLogs.length}</strong> logged event(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Target Identifier</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="p-3.5 text-blue-600 font-medium whitespace-nowrap">
                    {log.recordIdentifier || log.recordId}
                  </td>
                  <td className="p-3.5 text-slate-700 whitespace-nowrap font-sans">
                    {log.userName || log.userId}
                  </td>
                  <td className="p-3.5 text-slate-600 font-sans max-w-md">
                    {log.oldValue && log.newValue
                      ? `${log.oldValue} → ${log.newValue}`
                      : log.newValue || '-'}
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
