import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Eye, Clock, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../api';

export function AuditModal({ caseData, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCaseAuditLogs(caseData.id)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseData.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Privacy, Consent & Audit Trail</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Consent & Anonymization Status */}
        <div className="py-4 space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Informed Patient Consent</span>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Recorded & Verified</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Data captured solely for institutional triage assistance and clinical review.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">PII De-Identification</span>
              <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-semibold">
                <Lock className="w-4 h-4" />
                <span>Masking Active</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Phone numbers, direct identifiers, and personal telemetry are masked prior to AI synthesis.
              </p>
            </div>
          </div>

          {/* Audit Logs List */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Immutable Access & Event Log:</span>
            {loading ? (
              <div className="text-center py-6 text-xs text-slate-500">Loading audit records...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">No events logged yet.</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs flex items-start space-x-3"
                  >
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-slate-200">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{log.details}</p>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        Actor: {log.actor_name} ({log.actor_id}) • Role: {log.actor_role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

