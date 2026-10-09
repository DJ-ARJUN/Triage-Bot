import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../api/client';
import { ServerConfigModal } from '../components/ServerConfigModal';

export function LoginScreen({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' or 'reviewer'
  
  // Credentials
  const [patientId, setPatientId] = useState('PAT-1001');
  const [patientPassword, setPatientPassword] = useState('patient123');
  
  const [reviewerId, setReviewerId] = useState('REV-DR-RAO');
  const [reviewerPassword, setReviewerPassword] = useState('doctor123');

  const [demoAccounts, setDemoAccounts] = useState({ patients: [], reviewers: [] });
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    mobileApi.getDemoAccounts()
      .then(setDemoAccounts)
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (activeTab === 'patient') {
        const res = await mobileApi.patientLogin(patientId.trim(), patientPassword);
        onLoginSuccess(res, 'patient');
      } else {
        const res = await mobileApi.reviewerLogin(reviewerId.trim(), reviewerPassword);
        onLoginSuccess(res, 'reviewer');
      }
    } catch (err) {
      Alert.alert(
        'Login Failed',
        err.message || 'Unable to connect to triage backend. Please verify your ID and ensure server is reachable.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc, type) => {
    if (type === 'patient') {
      setPatientId(acc.id);
      setPatientPassword(acc.password || 'patient123');
    } else {
      setReviewerId(acc.id);
      setReviewerPassword(acc.password || 'doctor123');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Top Bar with Server Config */}
          <View style={styles.topBar}>
            <View style={styles.instituteBadge}>
              <Text style={styles.instituteText}>National Health Center</Text>
            </View>
            <TouchableOpacity style={styles.configBtn} onPress={() => setShowConfig(true)}>
              <Ionicons name="settings-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Logo & Title */}
          <View style={styles.headerBox}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={activeTab === 'patient' ? 'heart-circle' : 'medkit'}
                size={38}
                color="#06b6d4"
              />
            </View>
            <Text style={styles.appTitle}>Triage-Bot</Text>
            <Text style={styles.subtitle}>
              {activeTab === 'patient'
                ? 'Patient Guided Health Triage'
                : 'Medical Reviewer & Clinician Portal'}
            </Text>
          </View>

          {/* Separate Login Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'patient' && styles.tabActive]}
              onPress={() => setActiveTab('patient')}
            >
              <Ionicons
                name="person"
                size={16}
                color={activeTab === 'patient' ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'patient' && styles.tabTextActive]}>
                Patient ID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'reviewer' && styles.tabActive]}
              onPress={() => setActiveTab('reviewer')}
            >
              <Ionicons
                name="fitness"
                size={16}
                color={activeTab === 'reviewer' ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'reviewer' && styles.tabTextActive]}>
                Reviewer ID
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          <View style={styles.formCard}>
            {activeTab === 'patient' ? (
              <>
                <Text style={styles.label}>Patient Institute ID</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="card-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={patientId}
                    onChangeText={setPatientId}
                    placeholder="e.g. PAT-1001"
                    placeholderTextColor="#475569"
                    autoCapitalize="characters"
                  />
                </View>

                <Text style={styles.label}>Patient Password / PIN</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={patientPassword}
                    onChangeText={setPatientPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Medical Officer / Reviewer ID</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={reviewerId}
                    onChangeText={setReviewerId}
                    placeholder="e.g. REV-DR-RAO"
                    placeholderTextColor="#475569"
                    autoCapitalize="characters"
                  />
                </View>

                <Text style={styles.label}>Reviewer Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={reviewerPassword}
                    onChangeText={setReviewerPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {activeTab === 'patient' ? 'Start Patient Triage' : 'Open Reviewer Queue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Demo Selector */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>
              Quick Select 1-Click Demo Profiles ({activeTab}):
            </Text>
            <View style={styles.demoGrid}>
              {activeTab === 'patient' ? (
                (demoAccounts.patients.length > 0 ? demoAccounts.patients : [
                  { id: 'PAT-1001', name: 'Aarav (Campus Fever / Dengue)' },
                  { id: 'PAT-1002', name: 'Sunita (Diabetes / Chronic)' },
                  { id: 'PAT-1003', name: 'Ramesh (Industrial Hazard)' }
                ]).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.demoChip, patientId === p.id && styles.demoChipActive]}
                    onPress={() => selectDemoAccount(p, 'patient')}
                  >
                    <Text style={[styles.demoChipText, patientId === p.id && styles.demoChipTextActive]}>
                      {p.id} • {p.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                (demoAccounts.reviewers.length > 0 ? demoAccounts.reviewers : [
                  { id: 'REV-DR-RAO', name: 'Dr. Ananya Rao (Emergency MD)' },
                  { id: 'REV-DR-MEHTA', name: 'Dr. Rajesh Mehta (MBBS)' },
                  { id: 'REV-NURSE-PRIYA', name: 'Sister Priya Nair (Triage Nurse)' }
                ]).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.demoChip, reviewerId === r.id && styles.demoChipActive]}
                    onPress={() => selectDemoAccount(r, 'reviewer')}
                  >
                    <Text style={[styles.demoChipText, reviewerId === r.id && styles.demoChipTextActive]}>
                      {r.id} • {r.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <View style={styles.footerNotice}>
            <Text style={styles.footerText}>
              Privacy-first healthcare prototype. Data encrypted with HIPAA/ABDM-inspired controls.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <ServerConfigModal visible={showConfig} onClose={() => setShowConfig(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  instituteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  instituteText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
  },
  configBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0891b2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  demoSection: {
    backgroundColor: '#090d16',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  demoGrid: {
    gap: 8,
  },
  demoChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  demoChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
  },
  demoChipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  demoChipTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  footerNotice: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  footerText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
});

