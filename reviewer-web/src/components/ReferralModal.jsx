import React, { useState } from 'react';
import { FileCheck, Printer, Copy, Check, X, Building2 } from 'lucide-react';
import { api } from '../api';

export function ReferralModal({ caseData, onClose, onRefreshCase, currentReviewer }) {
  const [destination, setDestination] = useState(
    caseData.referral_destination || 'Civil Hospital / District Medical College Emergency Triage'
  );
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const predefinedDestinations = [
    'Civil Hospital / District Medical College Emergency Triage',
    'Primary Health Center (PHC) - Internal Medicine Outpatient',
    'Sub-District Hospital - High-Risk Obstetric & Antenatal Unit',
    'Industrial Estate Occupational Health & Toxicology Clinic',
    'Campus Health Center - High Dependency Viral Isolation Unit'
  ];

  const referralSlipText = `================================================================================
GOVERNMENT & INSTITUTIONAL HEALTH FACILITIES REFERRAL SLIP
CLINICAL HANDOFF NOTE (TRIAGE-BOT ESCALATION)
================================================================================
DATE & TIME:        ${new Date().toLocaleString()}
CASE NUMBER:        ${caseData.case_number}
PATIENT ID:         ${caseData.patient_user_id}
PATIENT NAME:       ${caseData.patient_name} (${caseData.patient_age || 'N/A'} Yrs / ${caseData.patient_gender || 'N/A'})
SCENARIO:           ${caseData.scenario.replace(/_/g, ' ')}
TRIAGE LEVEL:       ${caseData.urgency_level} (Score: ${caseData.ai_summary?.urgency_score || 85}/100)

REFERRING CLINICIAN:
Reviewer Name:      ${currentReviewer?.full_name || caseData.assigned_reviewer_name || 'Medical Officer'}
Reviewer ID:        ${currentReviewer?.user_id || caseData.assigned_reviewer_id || 'REV-DR-RAO'}

DESTINATION FACILITY:
${destination}

CHIEF COMPLAINT:
${caseData.chief_complaint || 'Acute clinical presentation'}

CLINICAL TIMELINE & AI SYNTHESIS:
${caseData.ai_summary?.clinical_timeline || 'N/A'}

EXTRACTED DIAGNOSTIC FLAGS:
${(caseData.ai_summary?.lab_findings_summary || []).join('\n') || 'None'}

DOCTOR'S CLINICAL NOTES:
${caseData.reviewer_notes || 'Patient referred for urgent secondary/tertiary evaluation and stabilization.'}

DISCLAIMER:
Advisory clinical handoff document generated for registered medical officer review.
================================================================================`;

  const handleConfirmReferral = async () => {
    setSubmitting(true);
    try {
      await api.updateCaseReview(caseData.id, {
        referral_destination: destination,
        status: 'REFERRED'
      });
      await onRefreshCase();
      alert('Referral note finalized and case marked as REFERRED.');
      onClose();
    } catch (err) {
      alert(`Error updating referral: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralSlipText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Referral Slip & Handoff Note</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Select Referral Destination Facility:
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {predefinedDestinations.map((dest, i) => (
                <option key={i} value={dest}>{dest}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400">Formatted Referral Document Preview:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-cyan-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-72">
              {referralSlipText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmReferral}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Finalizing...' : 'Finalize & Mark Referred'}
          </button>
        </div>
      </div>
    </div>
  );
}

