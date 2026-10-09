import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Default host: 10.161.35.182 connects physical device on same Wi-Fi directly to PC
// 10.0.2.2 for Android Emulator, localhost for iOS simulator or web
const DEFAULT_HOST = Platform.select({
  android: 'http://10.161.35.182:8000',
  ios: 'http://10.161.35.182:8000',
  default: 'http://10.161.35.182:8000',
});

let serverBaseUrl = DEFAULT_HOST;
let authToken = '';
let currentUser = null;

export const setServerUrl = (url) => {
  serverBaseUrl = url.replace(/\/$/, '');
};

export const getServerUrl = () => serverBaseUrl;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setCurrentUser = (user) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${serverBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      authToken = '';
      currentUser = null;
      throw new Error('Authentication expired. Please log in again.');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

async function uploadMultipartFile(endpoint, uri, { fileName, mimeType, parameters = {} }) {
  // Picker assets can live in Expo Go's shared DocumentPicker cache, which the
  // native uploader cannot read directly. Copy every selection into this app's
  // own cache before uploading, including file:// URIs.
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const copiedUri = `${FileSystem.cacheDirectory}upload-${Date.now()}-${safeFileName}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: copiedUri });
  } catch (error) {
    throw new Error(`Unable to access the selected file. Choose it again and retry. ${error.message}`);
  }
  const uploadUri = copiedUri;

  try {
    const result = await FileSystem.uploadAsync(`${serverBaseUrl}${endpoint}`, uploadUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      parameters,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    let body = {};
    try {
      body = JSON.parse(result.body || '{}');
    } catch {
      body = {};
    }
    if (result.status === 401) {
      authToken = '';
      currentUser = null;
      throw new Error('Authentication expired. Please log in again.');
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(body.detail || `Upload failed (HTTP ${result.status})`);
    }
    return body;
  } finally {
    await FileSystem.deleteAsync(copiedUri, { idempotent: true }).catch(() => {});
  }
}

export const mobileApi = {
  // Auth
  patientLogin: async (patientId, password) => {
    const res = await request('/api/auth/patient-login', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, password }),
    });
    setAuthToken(res.access_token);
    setCurrentUser(res);
    return res;
  },

  reviewerLogin: async (reviewerId, password) => {
    const res = await request('/api/auth/reviewer-login', {
      method: 'POST',
      body: JSON.stringify({ reviewer_id: reviewerId, password }),
    });
    setAuthToken(res.access_token);
    setCurrentUser(res);
    return res;
  },

  getDemoAccounts: () => request('/api/auth/demo-accounts'),

  // Cases
  getCases: () => request('/api/cases'),
  getCaseDetail: (caseId) => request(`/api/cases/${caseId}`),
  
  startNewCase: (scenario = 'OPD_QUEUE', consent = true) =>
    request('/api/cases', {
      method: 'POST',
      body: JSON.stringify({ scenario, consent_given: consent }),
    }),

  getNextQuestion: (caseId) =>
    request(`/api/questions/next-question?case_id=${caseId}`),

  submitAnswer: (answerData) =>
    request('/api/cases/answer', {
      method: 'POST',
      body: JSON.stringify(answerData),
    }),

  sendFollowUp: (caseId, questionText, questionTextHi) =>
    request(`/api/cases/${caseId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify({
        question_text: questionText,
        question_text_hi: questionTextHi,
      }),
    }),

  updateReview: (caseId, updateData) =>
    request(`/api/cases/${caseId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),

  // Upload Medical Report (Multipart)
  uploadReport: async (caseId, file) => {
    if (!file?.uri) {
      throw new Error('The selected file has no readable local URI. Choose a PDF or image from Files and try again.');
    }
    const fileName = file.name || file.fileName || file.uri?.split('/').pop()?.split('?')[0] || 'medical_report.pdf';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = file.mimeType || file.type || mimeTypes[extension] || 'application/octet-stream';
    try {
      return await uploadMultipartFile('/api/upload/report', file.uri, {
        fileName,
        mimeType,
        parameters: { case_id: String(caseId) },
      });
    } catch (error) {
      if (
        error.message?.startsWith('Upload failed') ||
        error.message?.startsWith('Authentication expired') ||
        error.message?.startsWith('Unable to access the selected file')
      ) {
        throw error;
      }
      throw new Error(`Cannot reach backend at ${serverBaseUrl}. Check that it is running and your phone can access it. ${error.message}`);
    }
  },

  transcribeVoice: async (caseId, uri, language) => {
    const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'm4a';
    const mimeType = extension === 'webm' ? 'audio/webm' : 'audio/mp4';
    return uploadMultipartFile('/api/upload/voice', uri, {
      fileName: `voice-note.${extension}`,
      mimeType,
      parameters: {
        case_id: String(caseId),
        language,
      },
    });
  },

  // Samples
  getSampleReports: () => request('/api/upload/samples'),
  
  // Scenarios
  getScenarios: () => request('/api/questions/scenarios'),

  // Helper
  getFileUrl: (filename) => `${serverBaseUrl}/api/upload/file/${filename}`,
};

