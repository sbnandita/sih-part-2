import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentRecordSchema, StudentRecordFormData, REQUIRED_DOCUMENT_TYPES, ValidationIssue, DocumentStatus } from '../types';
import { getRepository } from '../data/localStorageRepo';
import { validateStudentRecord } from '../lib/validation';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  SearchCheck,
  AlertCircle,
} from 'lucide-react';

export const StudentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const repo = getRepository();

  const [loading, setLoading] = useState(isEditing);
  const [liveIssues, setLiveIssues] = useState<ValidationIssue[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(studentRecordSchema) as any,
    defaultValues: {
      demoApaarId: `DEMO-APAAR-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: '',
      institution: 'National Institute of Technology, Demo Campus',
      course: 'Bachelor of Technology (B.Tech)',
      department: 'Computer Science & Engineering',
      dateOfBirth: '2004-05-15',
      admissionDate: '2024-08-01',
      enrollmentYear: 2024,
      expectedGraduationYear: 2028,
      previousQualification: 'Higher Secondary School Certificate (10+2)',
      previousPercentage: 82,
      currentCgpa: 8.2,
      applicationStatus: 'Pending',
      submittedDate: new Date().toISOString().split('T')[0],
      lastUpdatedDate: new Date().toISOString().split('T')[0],
      documents: REQUIRED_DOCUMENT_TYPES.map((type) => ({
        type,
        status: 'Submitted' as DocumentStatus,
        fileName: `${type.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      })),
    },
  });

  const { fields, update } = useFieldArray({
    control,
    name: 'documents',
  });

  useEffect(() => {
    if (isEditing && id) {
      async function fetchStudent() {
        setLoading(true);
        const record = await repo.getStudentById(id!);
        if (record) {
          reset({
            demoApaarId: record.demoApaarId,
            studentName: record.studentName,
            institution: record.institution,
            course: record.course,
            department: record.department,
            dateOfBirth: record.dateOfBirth,
            admissionDate: record.admissionDate,
            enrollmentYear: record.enrollmentYear,
            expectedGraduationYear: record.expectedGraduationYear,
            previousQualification: record.previousQualification,
            previousPercentage: record.previousPercentage,
            currentCgpa: record.currentCgpa,
            applicationStatus: record.applicationStatus,
            submittedDate: record.submittedDate,
            lastUpdatedDate: record.lastUpdatedDate,
            documents: record.documents || [],
          });
        } else {
          showToast('Student record not found', 'error');
          navigate('/students');
        }
        setLoading(false);
      }
      fetchStudent();
    }
  }, [id, isEditing, reset, navigate, showToast]);

  const handleRunValidation = async () => {
    setIsValidating(true);
    const formVals = getValues();
    const mockRecord: any = {
      ...formVals,
      id: id || 'temp-id',
      createdAt: new Date().toISOString(),
    };
    const all = await repo.getAllStudentsRaw();
    const issues = validateStudentRecord(mockRecord, all);
    setLiveIssues(issues);
    setIsValidating(false);

    if (issues.length === 0) {
      showToast('Validation passed! No discrepancies detected.');
    } else {
      showToast(`Detected ${issues.length} discrepancy issue(s).`, 'info');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && id) {
        const oldRecord = await repo.getStudentById(id);
        await repo.updateStudent(id, data);
        await repo.addAuditLog({
          userId: user?.id || 'usr-staff',
          userName: user?.name || 'Authorized Staff',
          action: 'Updated Student Record',
          recordId: id,
          recordIdentifier: `${data.studentName} (${data.demoApaarId})`,
          oldValue: oldRecord?.applicationStatus,
          newValue: data.applicationStatus,
        });
        showToast(`Successfully updated ${data.studentName}`);
        navigate(`/students/${id}`);
      } else {
        const created = await repo.createStudent(data as any);
        await repo.addAuditLog({
          userId: user?.id || 'usr-staff',
          userName: user?.name || 'Authorized Staff',
          action: 'Created New Student Record',
          recordId: created.id,
          recordIdentifier: `${data.studentName} (${data.demoApaarId})`,
          newValue: 'Record Created',
        });
        showToast(`Successfully added student ${data.studentName}`);
        navigate(`/students/${created.id}`);
      }
    } catch (err: any) {
      showToast(`Failed to save record: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">
        Loading student form details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={isEditing ? `/students/${id}` : '/students'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {isEditing ? 'Student Record' : 'Directory'}</span>
        </Link>
        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200">
          Synthetic Demo Form
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Form Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-navy-900">
              {isEditing ? 'Edit Student Record' : 'Add New Student Record'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Input student details and document verification checklist. Synthetic IDs only.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunValidation}
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
          >
            <SearchCheck className="w-4 h-4 text-blue-600" />
            <span>{isValidating ? 'Validating...' : 'Run Live Validation'}</span>
          </button>
        </div>

        {/* Live Validation Results Alert (if run) */}
        {liveIssues !== null && (
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            {liveIssues.length === 0 ? (
              <div className="flex items-center gap-2.5 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All verification checks passed! No missing documents or academic inconsistencies detected.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{liveIssues.length} Discrepancy Issue(s) Detected in Form Data:</span>
                </div>
                <div className="space-y-1.5">
                  {liveIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-rose-200 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <span className="font-semibold text-rose-900">[{issue.type}]</span>{' '}
                        <span className="text-slate-700">{issue.description}</span>
                        {issue.fixHint && (
                          <div className="text-[11px] text-slate-500 mt-1 font-medium">
                            💡 Fix Hint: {issue.fixHint}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                          issue.severity === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.severity} Severity
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Section 1: Identification & Basic Info */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              1. Student Identification & Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Synthetic Demo APAAR ID *
                </label>
                <input
                  type="text"
                  {...register('demoApaarId')}
                  placeholder="DEMO-APAAR-XXXX"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
                {errors.demoApaarId?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.demoApaarId.message)}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Format must strictly start with DEMO-APAAR-
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name (Fictional) *
                </label>
                <input
                  type="text"
                  {...register('studentName')}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.studentName?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.studentName.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth (DOB) *
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.dateOfBirth?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.dateOfBirth.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution *
                </label>
                <input
                  type="text"
                  {...register('institution')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.institution?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.institution.message)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Academic Program & Timeline */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              2. Academic Program & Admission Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Degree *</label>
                <input
                  type="text"
                  {...register('course')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.course?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.course.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <input
                  type="text"
                  {...register('department')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.department?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.department.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date *</label>
                <input
                  type="date"
                  {...register('admissionDate')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.admissionDate?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.admissionDate.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment Year *</label>
                <input
                  type="number"
                  {...register('enrollmentYear')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.enrollmentYear?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.enrollmentYear.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Graduation Year *</label>
                <input
                  type="number"
                  {...register('expectedGraduationYear')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.expectedGraduationYear?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.expectedGraduationYear.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Status *</label>
                <select
                  {...register('applicationStatus')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Verified in Demo">Verified in Demo</option>
                  <option value="Needs Correction">Needs Correction</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Scores & Marks */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
              3. Performance Metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Qualification</label>
                <input
                  type="text"
                  {...register('previousQualification')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Percentage (0-100) *</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('previousPercentage')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.previousPercentage?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.previousPercentage.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current CGPA (0.0-10.0) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('currentCgpa')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.currentCgpa?.message && (
                  <p className="text-[11px] text-rose-600 mt-1">{String(errors.currentCgpa.message)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Document Checklist */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>4. Required Document Submissions Checklist</span>
              <span className="text-[11px] text-slate-400 font-normal">All 5 mandatory</span>
            </h2>

            <div className="space-y-3">
              {fields.map((field: any, index) => (
                <div
                  key={field.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        field.status === 'Submitted'
                          ? 'bg-emerald-500'
                          : field.status === 'Rejected'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-800">{field.type}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Status:</span>
                    <select
                      value={field.status}
                      onChange={(e) => {
                        update(index, {
                          ...field,
                          status: e.target.value as DocumentStatus,
                          fileName: e.target.value === 'Submitted' ? `${field.type.toLowerCase().replace(/\s+/g, '_')}.pdf` : undefined,
                        });
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Missing">Missing</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Student Record' : 'Create Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
