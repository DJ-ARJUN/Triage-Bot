import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, AlertTriangle, Filter, Search, RefreshCw, Users, ShieldAlert,
  Flame, Clock, CheckCircle2, ChevronRight, Stethoscope
} from 'lucide-react';
import { Header } from './components/Header';
import { CaseCard } from './components/CaseCard';
import { CaseDetail } from './components/CaseDetail';
import { LoginModal } from './components/LoginModal';
import { ReferralModal } from './components/ReferralModal';
import { AuditModal } from './components/AuditModal';
import { api, getCurrentReviewer, clearAuthToken, getAuthToken } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentReviewer());
  const [showLogin, setShowLogin] = useState(!getAuthToken());
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Filters
  const [selectedScenario, setSelectedScenario] = useState('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const wsRef = useRef(null);
  const selectedCaseRef = useRef(null);

  useEffect(() => {
    selectedCaseRef.current = selectedCase;
  }, [selectedCase]);

  // Fetch Cases
  const fetchCases = async () => {
    if (!getAuthToken()) return;
    setLoading(true);
    try {
      const data = await api.getCases();
      setCases(data);
      // If a case is selected, refresh its details
      const activeCase = selectedCaseRef.current;
      if (activeCase) {
        const updated = await api.getCaseDetail(activeCase.id);
        setSelectedCase(updated);
      } else if (data.length > 0) {
        const first = await api.getCaseDetail(data[0].id);
        setSelectedCase(first);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (getAuthToken()) {
      fetchCases();
    }
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!getAuthToken()) return;

    let isMounted = true;
    let reconnectTimeout = null;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(api.wsReviewerUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event && isMounted) {
              fetchCases();
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          if (isMounted) {
            setWsConnected(false);
            reconnectTimeout = setTimeout(connectWs, 4000);
          }
        };

        ws.onerror = () => {
          if (isMounted) setWsConnected(false);
        };
      } catch (e) {
        if (isMounted) {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 4000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [currentUser]);

  const handleSelectCase = async (caseItem) => {
    try {
      const detail = await api.getCaseDetail(caseItem.id);
      setSelectedCase(detail);
    } catch (err) {
      console.error('Error fetching case detail:', err);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setShowLogin(true);
    setCases([]);
    setSelectedCase(null);
  };

  // Filter logic
  const filteredCases = cases.filter((c) => {
    if (selectedScenario !== 'ALL' && c.scenario !== selectedScenario) return false;
    if (selectedUrgency !== 'ALL' && c.urgency_level !== selectedUrgency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.patient_name?.toLowerCase().includes(q);
      const matchNum = c.case_number?.toLowerCase().includes(q);
      const matchId = c.patient_user_id?.toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchId) return false;
    }
    return true;
  });

  // Triage Statistics
  const totalCount = cases.length;
  const emergencyCount = cases.filter(c => c.urgency_level === 'EMERGENCY').length;
  const urgentCount = cases.filter(c => c.urgency_level === 'URGENT').length;
  const pendingCount = cases.filter(c => c.status === 'FOLLOW_UP_REQUESTED' || c.status === 'UNDER_REVIEW' || c.status === 'NEW').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        currentReviewer={currentUser}
        onLogout={handleLogout}
        wsConnected={wsConnected}
      />

      {showLogin && (
        <LoginModal
          onLoginSuccess={(userData) => {
            setCurrentUser(userData);
            setShowLogin(false);
            fetchCases();
          }}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{totalCount}</div>
              <div className="text-xs text-slate-400 font-medium">Total Triage Cases</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-rose-400">{emergencyCount}</div>
              <div className="text-xs text-slate-400 font-medium">Emergency Priority</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">{urgentCount}</div>
              <div className="text-xs text-slate-400 font-medium">Urgent Priority</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{pendingCount}</div>
              <div className="text-xs text-slate-400 font-medium">Active In Review</div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, ID, or case number..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchCases}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Scenario Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Scenario:
            </span>
            {[
              { id: 'ALL', label: 'All Scenarios' },
              { id: 'CAMPUS_FEVER', label: 'Campus Fever' },
              { id: 'OCCUPATIONAL_HEALTH', label: 'Occupational Health' },
              { id: 'MATERNAL_HEALTH', label: 'Maternal Health' },
              { id: 'CHRONIC_CARE', label: 'Chronic Care' },
              { id: 'OPD_QUEUE', label: 'General OPD' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedScenario(tab.id)}
                className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer text-xs ${
                  selectedScenario === tab.id
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Urgency Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Urgency:
            </span>
            {[
              { id: 'ALL', label: 'All Urgencies' },
              { id: 'EMERGENCY', label: 'Emergency', color: 'text-rose-400' },
              { id: 'URGENT', label: 'Urgent', color: 'text-amber-400' },
              { id: 'SEMI_URGENT', label: 'Semi-Urgent', color: 'text-yellow-400' },
              { id: 'ROUTINE', label: 'Routine', color: 'text-emerald-400' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedUrgency(tab.id)}
                className={`px-3 py-1 rounded-xl border whitespace-nowrap transition cursor-pointer text-[11px] ${
                  selectedUrgency === tab.id
                    ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className={tab.color}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Queue List (4 Columns) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Triage Queue ({filteredCases.length})
              </span>
              <span className="text-[11px] text-slate-500">Sorted by Urgency</span>
            </div>

            <div className="space-y-2.5 max-h-[800px] overflow-y-auto pr-1">
              {filteredCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No cases found matching criteria.
                </div>
              ) : (
                filteredCases.map((item) => (
                  <CaseCard
                    key={item.id}
                    caseItem={item}
                    isSelected={selectedCase?.id === item.id}
                    onSelect={handleSelectCase}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Selected Case Details (8 Columns) */}
          <div className="lg:col-span-8">
            {selectedCase ? (
              <CaseDetail
                caseData={selectedCase}
                onRefreshCase={fetchCases}
                onOpenReferral={() => setShowReferralModal(true)}
                onOpenAudit={() => setShowAuditModal(true)}
                currentReviewer={currentUser}
              />
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 space-y-3">
                <Stethoscope className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="font-bold text-white text-base">Select a Case to Review</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Choose a patient intake from the triage queue on the left to inspect AI summaries, extracted OCR lab values, and send follow-ups.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Referral Modal */}
      {showReferralModal && selectedCase && (
        <ReferralModal
          caseData={selectedCase}
          currentReviewer={currentUser}
          onClose={() => setShowReferralModal(false)}
          onRefreshCase={fetchCases}
        />
      )}

      {/* Privacy & Audit Modal */}
      {showAuditModal && selectedCase && (
        <AuditModal
          caseData={selectedCase}
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
}
