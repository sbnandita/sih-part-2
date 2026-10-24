import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getRepository } from '../data/localStorageRepo';
import {
  getDelayRiskConfig,
  saveDelayRiskConfig,
  resetDelayRiskConfig,
  DEFAULT_DELAY_RISK_CONFIG,
} from '../lib/delayRisk';
import { DelayRiskConfig } from '../types';
import { can } from '../lib/auth';
import { useToast } from '../components/Toast';
import {
  Settings,
  Shield,
  Sliders,
  RotateCcw,
  Save,
  Trash2,
  Lock,
  Building,
  User,
  CheckCircle2,
  AlertOctagon,
  FileText,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuthStore();
  const repo = getRepository();
  const { showToast } = useToast();

  const [config, setConfig] = useState<DelayRiskConfig>(getDelayRiskConfig());
  const [resettingData, setResettingData] = useState(false);

  const handleConfigChange = (key: keyof DelayRiskConfig, value: number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveConfig = () => {
    if (!can(role, 'manage:settings')) {
      showToast('Only Admin role can update configuration', 'error');
      return;
    }
    saveDelayRiskConfig(config);
    showToast('Saved custom delay-risk parameters to local storage.');
  };

  const handleResetConfig = () => {
    if (!can(role, 'manage:settings')) {
      showToast('Only Admin role can reset configuration', 'error');
      return;
    }
    const def = resetDelayRiskConfig();
    setConfig(def);
    showToast('Reset delay-risk parameters to system default values.');
  };

  const handleResetSeedData = async () => {
    if (!can(role, 'reset:demo_data')) {
      showToast('Only Admin role can reset synthetic demo data', 'error');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to restore original synthetic demo data? All newly added or modified records will be reseeded.'
      )
    ) {
      return;
    }

    setResettingData(true);
    await repo.resetToSeed();
    setResettingData(false);
    showToast('Seeded dataset restored to initial 40 synthetic student records.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Platform Configuration & Privacy</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tune rule-based risk evaluation weights, inspect staff credentials, and review responsible AI governance.
        </p>
      </div>

      {/* Staff Profile & Role Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-navy-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Active Staff Identity & Authorization
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Staff Name</span>
            <span className="font-semibold text-slate-800">{user?.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Authorized Email</span>
            <span className="font-semibold text-slate-800 font-mono text-[11px]">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Assigned Role</span>
            <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-0.5">
              <Shield className="w-3 h-3" /> {role}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Institution</span>
            <span className="font-semibold text-slate-800">{user?.institution}</span>
          </div>
        </div>
      </div>

      {/* Delay-Risk Parameters Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-navy-900">Delay-Risk Rule Parameters</h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Adjust heuristic points for missing documents, open discrepancies, and backlog aging.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetConfig}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Missing document points */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="ptsMissingDoc">Points per Missing/Rejected Document</label>
              <span className="font-mono text-blue-600 font-bold">{config.pointsPerMissingDoc} pts</span>
            </div>
            <input
              id="ptsMissingDoc"
              type="range"
              min="1"
              max="5"
              step="1"
              value={config.pointsPerMissingDoc}
              onChange={(e) => handleConfigChange('pointsPerMissingDoc', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-blue-600"
            />
            <span className="text-[10px] text-slate-400 block">Default: 2 points per document</span>
          </div>

          {/* High severity validation issue points */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="ptsHighIssue">Points per High-Severity Discrepancy</label>
              <span className="font-mono text-blue-600 font-bold">{config.pointsHighSeverityIssue} pts</span>
            </div>
            <input
              id="ptsHighIssue"
              type="range"
              min="1"
              max="5"
              step="1"
              value={config.pointsHighSeverityIssue}
              onChange={(e) => handleConfigChange('pointsHighSeverityIssue', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-blue-600"
            />
            <span className="text-[10px] text-slate-400 block">Default: 2 points (e.g. age or score bounds)</span>
          </div>

          {/* Pending Days Medium Threshold */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="pendingMed">Aging Alert Threshold (Medium)</label>
              <span className="font-mono text-amber-700 font-bold">{config.pendingDaysMedium} days</span>
            </div>
            <input
              id="pendingMed"
              type="range"
              min="7"
              max="30"
              step="1"
              value={config.pendingDaysMedium}
              onChange={(e) => handleConfigChange('pendingDaysMedium', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">Default: 14 days (+1 pt)</span>
          </div>

          {/* Pending Days High Threshold */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="pendingHigh">Aging Escalation Threshold (High)</label>
              <span className="font-mono text-rose-700 font-bold">{config.pendingDaysHigh} days</span>
            </div>
            <input
              id="pendingHigh"
              type="range"
              min="15"
              max="60"
              step="1"
              value={config.pendingDaysHigh}
              onChange={(e) => handleConfigChange('pendingDaysHigh', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-rose-500"
            />
            <span className="text-[10px] text-slate-400 block">Default: 30 days (+2 pts)</span>
          </div>

          {/* Extra points for Needs Correction */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="extraCorrection">Needs Correction Status Extra Weight</label>
              <span className="font-mono text-blue-600 font-bold">{config.extraPointsStatusNeedsCorrection} pts</span>
            </div>
            <input
              id="extraCorrection"
              type="range"
              min="0"
              max="4"
              step="1"
              value={config.extraPointsStatusNeedsCorrection}
              onChange={(e) => handleConfigChange('extraPointsStatusNeedsCorrection', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-blue-600"
            />
            <span className="text-[10px] text-slate-400 block">Default: 2 points</span>
          </div>

          {/* Low / Medium Score Cutoffs */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <label htmlFor="threshMedium">High Risk Threshold (Cutoff Score)</label>
              <span className="font-mono text-blue-600 font-bold">≥ {config.thresholdMediumMax + 1} pts</span>
            </div>
            <input
              id="threshMedium"
              type="range"
              min="3"
              max="10"
              step="1"
              value={config.thresholdMediumMax}
              onChange={(e) => handleConfigChange('thresholdMediumMax', Number(e.target.value))}
              disabled={!can(role, 'manage:settings')}
              className="w-full accent-blue-600"
            />
            <span className="text-[10px] text-slate-400 block">Default: Medium (3–5), High (≥6)</span>
          </div>
        </div>

        {can(role, 'manage:settings') && (
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Apply Risk Configuration</span>
            </button>
          </div>
        )}
      </div>

      {/* Dataset & Demo State Reset */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600" />
          Reset Demo State & Synthetic Cohort
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Restore the initial reproducible 40 synthetic student records, 80 processing history entries, and demo audit events.
          Useful for resetting the prototype between hackathon demonstration presentations.
        </p>

        {can(role, 'reset:demo_data') ? (
          <button
            type="button"
            onClick={handleResetSeedData}
            disabled={resettingData}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingData ? 'animate-spin' : ''}`} />
            <span>{resettingData ? 'Resetting Data...' : 'Reset to Default Synthetic Seed Data'}</span>
          </button>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Admin permission required to reseed database. Switch to Admin role in header to reset.
          </p>
        )}
      </div>

      {/* Privacy and Responsible-Use Text */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-slate-700 space-y-3 text-xs leading-relaxed">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>Privacy & Responsible AI Governance Architecture</span>
        </div>

        <p>
          <strong>Official APAAR API Integration Requirements:</strong> Full production integration with the Ministry of Education's
          APAAR (Automated Permanent Academic Account Registry) / DigiLocker ecosystem requires formal institutional credentials,
          signed institutional MoUs, PKI digital certificates, and strict compliance with India's <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block">Exclusion of Protected Attributes</span>
            <p className="text-[11px] text-slate-500">
              The platform strictly forbids the ingestion or evaluation of sensitive attributes: gender, religion, caste/category,
              disability status, family income, and residential region. Delay calculations are purely operational.
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block">Human-in-the-Loop Safeguards</span>
            <p className="text-[11px] text-slate-500">
              The delay-risk engine never automatically rejects, revokes, or denies any student credential. High scores merely prioritize
              the record for expedited staff review and proactive student outreach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
