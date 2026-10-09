import React from 'react';
import { Activity, ShieldCheck, UserCheck, LogOut, Radio, AlertTriangle } from 'lucide-react';

export function Header({ currentReviewer, onLogout, wsConnected }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Triage-Bot</span>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold tracking-wider">
                  Reviewer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Institutional Clinical Triage Support</p>
            </div>
          </div>

          {/* Central Non-Diagnostic Safety Warning */}
          <div className="hidden lg:flex items-center space-x-2 bg-amber-950/60 border border-amber-800/80 px-3 py-1 rounded-full text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Advisory Clinical Support • Explicitly Non-Diagnostic • Physician Review Required</span>
          </div>

          {/* Live Sync & Reviewer Profile */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border ${
              wsConnected
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>{wsConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {currentReviewer && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-sm font-medium text-white flex items-center justify-end space-x-1">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>{currentReviewer.full_name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{currentReviewer.user_id}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

