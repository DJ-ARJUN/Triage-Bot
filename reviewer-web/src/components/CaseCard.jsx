import React from 'react';
import { AlertCircle, Clock, FileText, MessageSquare, User, ChevronRight } from 'lucide-react';

export function CaseCard({ caseItem, isSelected, onSelect }) {
  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'EMERGENCY':
        return {
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800',
          dot: 'bg-rose-500 animate-ping',
          label: 'EMERGENCY'
        };
      case 'URGENT':
        return {
          bg: 'bg-amber-950/80 text-amber-300 border-amber-800',
          dot: 'bg-amber-500',
          label: 'URGENT'
        };
      case 'SEMI_URGENT':
        return {
          bg: 'bg-yellow-950/80 text-yellow-300 border-yellow-800',
          dot: 'bg-yellow-500',
          label: 'SEMI-URGENT'
        };
      default:
        return {
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          dot: 'bg-emerald-500',
          label: 'ROUTINE'
        };
    }
  };

  const getScenarioLabel = (scenario) => {
    switch (scenario) {
      case 'CAMPUS_FEVER': return 'Campus Fever';
      case 'OCCUPATIONAL_HEALTH': return 'Occupational Health';
      case 'MATERNAL_HEALTH': return 'Maternal Health';
      case 'CHRONIC_CARE': return 'Chronic Care';
      default: return 'General OPD';
    }
  };

  const badge = getUrgencyBadge(caseItem.urgency_level);

  return (
    <div
      onClick={() => onSelect(caseItem)}
      className={`p-4 rounded-xl border transition cursor-pointer relative ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
      }`}
    >
      {/* Top row: Urgency & Time */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          <span>{badge.label}</span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{new Date(caseItem.updated_at || caseItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Patient Name & Details */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white text-sm group-hover:text-cyan-400 transition">
            {caseItem.patient_name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {caseItem.patient_user_id} • {caseItem.patient_age ? `${caseItem.patient_age}y` : 'Age N/A'} • {caseItem.patient_gender || 'Gender N/A'}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-500 mt-1 transition ${isSelected ? 'text-cyan-400 translate-x-1' : ''}`} />
      </div>

      {/* Chief Complaint */}
      <div className="mt-2 text-xs text-slate-300 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
        <span className="font-medium text-slate-400">Complaint: </span>
        {caseItem.chief_complaint || 'Intake in progress...'}
      </div>

      {/* Footer Info: Scenario, Reports, Messages, Status */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
          {getScenarioLabel(caseItem.scenario)}
        </span>

        <div className="flex items-center space-x-3">
          {caseItem.documents_count > 0 && (
            <span className="flex items-center space-x-1 text-cyan-400" title="Uploaded Reports">
              <FileText className="w-3 h-3" />
              <span>{caseItem.documents_count}</span>
            </span>
          )}
          <span className="flex items-center space-x-1 text-slate-400" title="Conversation Messages">
            <MessageSquare className="w-3 h-3" />
            <span>{caseItem.messages_count}</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
            caseItem.status === 'FOLLOW_UP_REQUESTED'
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : caseItem.status === 'REFERRED'
              ? 'bg-purple-950 text-purple-400 border border-purple-800'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {caseItem.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

