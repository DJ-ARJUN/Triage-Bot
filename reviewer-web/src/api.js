const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function getAuthToken() {
  return localStorage.getItem('triage_reviewer_token') || '';
}

export function setAuthToken(token) {
  localStorage.setItem('triage_reviewer_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('triage_reviewer_token');
  localStorage.removeItem('triage_reviewer_user');
}

export function getCurrentReviewer() {
  const userStr = localStorage.getItem('triage_reviewer_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

export function setCurrentReviewer(user) {
  localStorage.setItem('triage_reviewer_user', JSON.stringify(user));
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new Event('auth_expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  reviewerLogin: (reviewerId, password) =>
    apiRequest('/api/auth/reviewer-login', {
      method: 'POST',
      body: JSON.stringify({ reviewer_id: reviewerId, password })
    }),
  getDemoAccounts: () => apiRequest('/api/auth/demo-accounts'),
  getMe: () => apiRequest('/api/auth/me'),

  // Cases
  getCases: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/cases${query ? `?${query}` : ''}`);
  },
  getCaseDetail: (caseId) => apiRequest(`/api/cases/${caseId}`),
  updateCaseReview: (caseId, updateData) =>
    apiRequest(`/api/cases/${caseId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    }),
  sendFollowUp: (caseId, questionText, questionTextHi) =>
    apiRequest(`/api/cases/${caseId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify({ question_text: questionText, question_text_hi: questionTextHi })
    }),
  getCaseAuditLogs: (caseId) => apiRequest(`/api/cases/${caseId}/audit-logs`),

  // Scenarios & Sample Reports
  getScenarios: () => apiRequest('/api/questions/scenarios'),
  getSampleReports: () => apiRequest('/api/upload/samples'),
  
  // Base URLs
  fileUrl: (filename) => `${API_BASE_URL}/api/upload/file/${filename}`,
  wsUrl: (caseId) => `${API_BASE_URL.replace(/^http/, 'ws')}/ws/case/${caseId}`,
  wsReviewerUrl: () => `${API_BASE_URL.replace(/^http/, 'ws')}/ws/reviewer/notifications`
};

