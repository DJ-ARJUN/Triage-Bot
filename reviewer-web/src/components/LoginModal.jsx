import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Stethoscope, Lock, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { api, setAuthToken, setCurrentReviewer } from '../api';

export function LoginModal({ onLoginSuccess }) {
  const [reviewerId, setReviewerId] = useState('REV-DR-RAO');
  const [password, setPassword] = useState('doctor123');
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDemoAccounts()
      .then(data => {
        if (data && data.reviewers) {
          setDemoAccounts(data.reviewers);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.reviewerLogin(reviewerId, password);
      setAuthToken(res.access_token);
      setCurrentReviewer({
        user_id: res.user_id,
        role: res.role,
        full_name: res.full_name,
        preferred_language: res.preferred_language
      });
      onLoginSuccess(res);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify Reviewer ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoReviewer = (account) => {
    setReviewerId(account.id);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-cyan-950/40">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Reviewer Portal Access</h2>
          <p className="text-xs text-slate-400 mt-1">
            Institutional Clinical Decision Support & Triage Management
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reviewer / Medical Officer ID
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                placeholder="REV-DR-RAO"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Clinical Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Switch Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>Quick Select Demo Accounts:</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">1-Click</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {(demoAccounts.length > 0 ? demoAccounts : [
              { id: 'REV-DR-RAO', name: 'Dr. Ananya Rao (MD)', password: 'doctor123' },
              { id: 'REV-DR-MEHTA', name: 'Dr. Rajesh Mehta (MBBS)', password: 'doctor123' },
              { id: 'REV-NURSE-PRIYA', name: 'Sister Priya Nair (Triage Nurse)', password: 'doctor123' }
            ]).map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => selectDemoReviewer(acc)}
                className={`text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                  reviewerId === acc.id
                    ? 'bg-cyan-950/50 border-cyan-700 text-cyan-200'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold">{acc.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{acc.id}</div>
                </div>
                <span className="text-[10px] text-slate-400">Select</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Confidential medical interface. All reviewer actions are cryptographically logged.
          </p>
        </div>
      </div>
    </div>
  );
}

