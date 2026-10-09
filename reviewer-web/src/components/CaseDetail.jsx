import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, FileText, Send, UserCheck, ShieldAlert,
  ArrowUpRight, Plus, HelpCircle, Eye, RefreshCw, FileCheck, Stethoscope, ChevronDown
} from 'lucide-react';
import { api } from '../api';

export function CaseDetail({
  caseData,
  onRefreshCase,
  onOpenReferral,
  onOpenAudit,
  currentReviewer
}) {
  const [followUpText, setFollowUpText] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState(caseData.urgency_level);
  const [reviewerNotes, setReviewerNotes] = useState(caseData.reviewer_notes || '');
  const [doctorDisposition, setDoctorDisposition] = useState(caseData.doctor_disposition || 'Pending Review');
  const [savingAction, setSavingAction] = useState(false);
  const [viewingDocText, setViewingDocText] = useState(null);

  const urgencyLevels = ['EMERGENCY', 'URGENT', 'SEMI_URGENT', 'ROUTINE'];
  const dispositions = [
    'Emergency Resuscitation Ward Admission',
    'Acute Day Care Observation & IV Hydration',
    'Priority Outpatient (OPD) Consultation',
    'Specialist Referral (Internal Medicine)',
    'Specialist Referral (Obstetrics & Gynecology)',
    'Specialist Referral (Pulmonology / Occupational)',
    'Home Care with 24-hr Warning Signs Tele-Monitoring'
  ];

  const handleSendFollowUp = async (textToSend) => {
    const text = textToSend || followUpText;
    if (!text.trim()) return;
    setSendingFollowUp(true);
    try {
      await api.sendFollowUp(caseData.id, text.trim());
      setFollowUpText('');
      await onRefreshCase();
    } catch (err) {
      alert(`Error sending follow-up: ${err.message}`);
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleUpdateReview = async () => {
    setSavingAction(true);
    try {
      await api.updateCaseReview(caseData.id, {
        urgency_level: selectedUrgency,
        reviewer_notes: reviewerNotes,
        doctor_disposition: doctorDisposition,
        assigned_reviewer_id: currentReviewer?.user_id
      });
      await onRefreshCase();
      alert('Case triage and clinical notes updated successfully!');
    } catch (err) {
      alert(`Error updating case: ${err.message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'EMERGENCY':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'URGENT':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'SEMI_URGENT':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Patient Overview & Triage Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white">{caseData.patient_name}</h2>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                {caseData.patient_user_id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {caseData.scenario.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Case Number: <span className="font-mono text-slate-300">{caseData.case_number}</span> • Registered: {new Date(caseData.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenAudit}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit & Privacy</span>
            </button>
            <button
              onClick={onOpenReferral}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Generate Referral Slip</span>
            </button>
          </div>
        </div>

        {/* Triage Level Override & Clinical Review Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-5 items-center">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              AI Urgency Score
            </span>
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${getUrgencyBadge(caseData.urgency_level)}`}>
              <span>{caseData.urgency_level}</span>
              {caseData.ai_summary?.urgency_score && (
                <span className="text-[10px] opacity-75 font-mono">({caseData.ai_summary.urgency_score}/100)</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Physician Override
            </label>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
            >
              {urgencyLevels.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Reviewer
            </span>
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-medium truncate">{caseData.assigned_reviewer_name || 'Unassigned (Take Case)'}</span>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={handleUpdateReview}
              disabled={savingAction}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${savingAction ? 'animate-spin' : ''}`} />
              <span>Save Clinical Triage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (AI Triage & Lab OCR) + Right Column (Chat & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Clinical Summary + OCR Reports (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* AI Triage Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">AI Clinical Triage Synthesis</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                NON-DIAGNOSTIC
              </span>
            </div>

            {/* Non-diagnostic notice */}
            <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Advisory Support Only:</strong> {caseData.ai_summary?.disclaimer || "Organizes timeline and highlights urgency flags. Does not replace professional clinical evaluation."}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Clinical Timeline & Onset</span>
                <p className="text-xs text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {caseData.ai_summary?.clinical_timeline || "Timeline being compiled from responses..."}
                </p>
              </div>

              {/* Urgency Rationale */}
              {caseData.ai_summary?.urgency_rationale && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Urgency Rationale</span>
                  <p className="text-xs text-rose-300/90 bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/40">
                    {caseData.ai_summary.urgency_rationale}
                  </p>
                </div>
              )}

              {/* Recommended Queue / Handoff */}
              {caseData.ai_summary?.referral_destination && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Recommended Triage Destination</span>
                  <div className="text-xs text-cyan-300 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-800/60 flex items-center space-x-2">
                    <ArrowUpRight className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{caseData.ai_summary.referral_destination}</span>
                  </div>
                </div>
              )}

              {/* Pertinent Negatives */}
              {caseData.ai_summary?.pertinent_negatives?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Pertinent Negatives</span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
                    {caseData.ai_summary.pertinent_negatives.map((neg, i) => (
                      <li key={i}>{neg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Multimodal OCR & Diagnostic Reports */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Multimodal Diagnostic Reports & OCR</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {caseData.documents?.length || 0} file(s) attached
              </span>
            </div>

            {(!caseData.documents || caseData.documents.length === 0) ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No medical reports uploaded yet. Patient can upload PDF or photos inside the chat.
              </div>
            ) : (
              <div className="space-y-4">
                {caseData.documents.map((doc) => (
                  <div key={doc.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{doc.original_filename}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          OCR Status: <span className="text-emerald-400">{doc.ocr_status}</span> • Processed at {new Date(doc.created_at).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewingDocText(doc)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Raw Text</span>
                        </button>
                      </div>
                    </div>

                    {/* Extracted Clinical Flags */}
                    {doc.clinical_flags && doc.clinical_flags.length > 0 && (
                      <div className="mb-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 space-y-1">
                        <span className="text-[11px] font-bold text-rose-300 block">Extracted Clinical Flags:</span>
                        {doc.clinical_flags.map((flag, idx) => (
                          <div key={idx} className="text-xs text-rose-200 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Structured Lab Data Table */}
                    {doc.structured_lab_data && doc.structured_lab_data.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-2 px-2">Investigation</th>
                              <th className="py-2 px-2">Extracted Value</th>
                              <th className="py-2 px-2">Unit</th>
                              <th className="py-2 px-2">Reference Range</th>
                              <th className="py-2 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {doc.structured_lab_data.map((lab, lIdx) => (
                              <tr key={lIdx} className="hover:bg-slate-900/40">
                                <td className="py-2 px-2 font-medium text-slate-200">{lab.test_name}</td>
                                <td className="py-2 px-2 font-bold text-white font-mono">{lab.value}</td>
                                <td className="py-2 px-2 text-slate-400">{lab.unit}</td>
                                <td className="py-2 px-2 text-slate-400 text-[11px]">{lab.reference_range}</td>
                                <td className="py-2 px-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    lab.status === 'CRITICAL'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : lab.status === 'HIGH' || lab.status === 'LOW'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  }`}>
                                    {lab.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Clinical Information Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 mb-4">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Missing Clinical Information Checklist</h3>
            </div>

            {(!caseData.missing_information || caseData.missing_information.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>All core history questions successfully captured.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {caseData.missing_information.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                  >
                    <span className="text-slate-200">{item}</span>
                    <button
                      onClick={() => handleSendFollowUp(`Dr. Question: Could you please provide details regarding: ${item}?`)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-medium flex items-center space-x-1 cursor-pointer shrink-0 ml-3"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ask Patient</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat Transcript & Reviewer Action Pad (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Conversation History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Guided Chat Transcript</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {caseData.messages?.length || 0} messages
              </span>
            </div>

            {/* Scrollable Chat Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {caseData.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs ${
                    msg.sender_type === 'reviewer'
                      ? 'bg-cyan-950/40 border border-cyan-800/80 text-cyan-100 ml-4'
                      : msg.sender_type === 'patient'
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200 mr-4'
                      : 'bg-slate-800/40 border border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 font-semibold">
                    <span className={msg.sender_type === 'reviewer' ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                      {msg.sender_name} {msg.sender_type === 'reviewer' && '(Reviewer)'}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {msg.question_text && (
                    <div className="text-slate-400 italic mb-1">
                      Q: {msg.question_text}
                    </div>
                  )}

                  {msg.answer_text && (
                    <div className="font-medium text-white">
                      {msg.answer_text}
                    </div>
                  )}

                  {msg.attachment_url && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60">
                      <a
                        href={api.fileUrl(msg.attachment_url.split('/').pop())}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Attachment</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Send Follow-up Box */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  placeholder="Type a clinical follow-up question for patient..."
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendFollowUp(); }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleSendFollowUp()}
                  disabled={sendingFollowUp || !followUpText.trim()}
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Follow-ups */}
              {caseData.suggested_follow_ups?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {caseData.suggested_follow_ups.slice(0, 2).map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSendFollowUp(sug)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 truncate max-w-[280px] text-left cursor-pointer"
                      title={sug}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Disposition & Doctor's Notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Stethoscope className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Reviewer Clinical Impression & Notes</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Triage Disposition
              </label>
              <select
                value={doctorDisposition}
                onChange={(e) => setDoctorDisposition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {dispositions.map((disp, idx) => (
                  <option key={idx} value={disp}>{disp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Doctor / Clinical Notes
              </label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={4}
                placeholder="Document clinical impression, rationale for triage level, recommended investigations, or handoff directions..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleUpdateReview}
              disabled={savingAction}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              Update Clinical Disposition
            </button>
          </div>
        </div>
      </div>

      {/* Raw Text Document Viewer Modal */}
      {viewingDocText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-sm">OCR Extracted Text - {viewingDocText.original_filename}</h3>
              <button
                onClick={() => setViewingDocText(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
              {viewingDocText.extracted_text || "No text content."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

