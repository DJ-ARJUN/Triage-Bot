import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { GuidedChatScreen } from './src/screens/patient/GuidedChatScreen';
import { CaseHistoryScreen } from './src/screens/patient/CaseHistoryScreen';
import { ReviewerQueueScreen } from './src/screens/reviewer/ReviewerQueueScreen';
import { ReviewerDetailScreen } from './src/screens/reviewer/ReviewerDetailScreen';
import { setAuthToken, setCurrentUser } from './src/api/client';

export default function App() {
  const [currentUser, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'patient' or 'reviewer'
  
  // Patient flow states: 'history' or 'chat'
  const [patientScreen, setPatientScreen] = useState('history');
  const [activePatientCaseId, setActivePatientCaseId] = useState(null);

  // Reviewer flow states: 'queue' or 'detail'
  const [reviewerScreen, setReviewerScreen] = useState('queue');
  const [activeReviewerCase, setActiveReviewerCase] = useState(null);

  const handleLoginSuccess = (userData, role) => {
    setUser(userData);
    setUserRole(role);
    if (role === 'patient') {
      setPatientScreen('history');
    } else {
      setReviewerScreen('queue');
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setUser(null);
    setUserRole(null);
    setActivePatientCaseId(null);
    setActiveReviewerCase(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />

      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : userRole === 'patient' ? (
        patientScreen === 'history' ? (
          <CaseHistoryScreen
            user={currentUser}
            onSelectCase={(caseItem) => {
              setActivePatientCaseId(caseItem.id);
              setPatientScreen('chat');
            }}
            onStartNewCase={() => {
              setActivePatientCaseId(null);
              setPatientScreen('chat');
            }}
            onLogout={handleLogout}
          />
        ) : (
          <GuidedChatScreen
            route={{ params: { caseId: activePatientCaseId } }}
            navigation={{ goBack: () => setPatientScreen('history') }}
            user={currentUser}
            onLogout={handleLogout}
          />
        )
      ) : (
        // Reviewer Role
        reviewerScreen === 'queue' ? (
          <ReviewerQueueScreen
            user={currentUser}
            onSelectCase={(caseItem) => {
              setActiveReviewerCase(caseItem);
              setReviewerScreen('detail');
            }}
            onLogout={handleLogout}
          />
        ) : (
          <ReviewerDetailScreen
            caseItem={activeReviewerCase}
            currentReviewer={currentUser}
            onBack={() => setReviewerScreen('queue')}
          />
        )
      )}
    </SafeAreaProvider>
  );
}
