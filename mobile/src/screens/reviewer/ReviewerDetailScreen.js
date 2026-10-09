import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../api/client';
import { SafetyBanner } from '../../components/SafetyBanner';

export function ReviewerDetailScreen({ route, navigation, caseItem, onBack, currentReviewer }) {
  const [caseData, setCaseData] = useState(caseItem);
  const [followUpText, setFollowUpText] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState(caseItem.reviewer_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const reloadCase = async () => {
    try {
      const refreshed = await mobileApi.getCaseDetail(caseData.id);
      setCaseData(refreshed);
    } catch (e) {}
  };

  useEffect(() => {
    const refreshTimer = setInterval(async () => {
      try {
        const refreshed = await mobileApi.getCaseDetail(caseItem.id);
        setCaseData(refreshed);
      } catch (err) {
        console.warn('Automatic case refresh failed:', err.message);
      }
    }, 4000);
    return () => clearInterval(refreshTimer);
  }, [caseItem.id]);

  const handleSendFollowUp = async (textToSend) => {
    const text = textToSend || followUpText;
    if (!text.trim()) return;
    setSendingFollowUp(true);
    try {
      await mobileApi.sendFollowUp(caseData.id, text.trim());
      setFollowUpText('');
      await reloadCase();
      Alert.alert('Sent', 'Follow-up question delivered to patient.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await mobileApi.updateReview(caseData.id, {
        reviewer_notes: reviewerNotes,
        assigned_reviewer_id: currentReviewer?.user_id,
      });
      await reloadCase();
      Alert.alert('Saved', 'Clinical notes and reviewer assignment saved.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{caseData.patient_name}</Text>
            <Text style={styles.headerSub}>{caseData.case_number} • {caseData.patient_user_id}</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={reloadCase}>
            <Ionicons name="refresh" size={18} color="#06b6d4" />
          </TouchableOpacity>
        </View>

        <SafetyBanner />

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding}>
          
          {/* Triage Level Card */}
          <View style={styles.triageCard}>
            <View style={styles.triageRow}>
              <Text style={styles.triageLabel}>Current Urgency Level:</Text>
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>{caseData.urgency_level}</Text>
              </View>
            </View>
            {caseData.ai_summary?.urgency_rationale && (
              <Text style={styles.rationaleText}>
                Rationale: {caseData.ai_summary.urgency_rationale}
              </Text>
            )}
            <Text style={styles.destinationText}>
              Queue: {caseData.ai_summary?.referral_destination || 'General OPD'}
            </Text>
          </View>

          {/* AI Clinical Timeline */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pulse" size={16} color="#06b6d4" />
              <Text style={styles.sectionTitle}>AI Clinical Summary (Advisory)</Text>
            </View>
            <Text style={styles.bodyText}>
              {caseData.ai_summary?.clinical_timeline || 'Clinical summary in progress...'}
            </Text>
          </View>

          {/* Extracted Lab Data / OCR */}
          {caseData.documents && caseData.documents.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={16} color="#06b6d4" />
                <Text style={styles.sectionTitle}>Extracted Lab Reports & OCR</Text>
              </View>

              {caseData.documents.map((doc, idx) => (
                <View key={idx} style={styles.docBox}>
                  <Text style={styles.docName}>{doc.original_filename}</Text>
                  
                  {/* Flags */}
                  {doc.clinical_flags && doc.clinical_flags.map((flag, fIdx) => (
                    <Text key={fIdx} style={styles.flagText}>⚠️ {flag}</Text>
                  ))}

                  {/* Labs */}
                  {doc.structured_lab_data && doc.structured_lab_data.map((lab, lIdx) => (
                    <View key={lIdx} style={styles.labRow}>
                      <Text style={styles.labName}>{lab.test_name}</Text>
                      <Text style={styles.labVal}>{lab.value} {lab.unit}</Text>
                      <Text style={[styles.labStatus, lab.status === 'CRITICAL' && styles.statusCritical]}>
                        {lab.status}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Missing Clinical Info Checklist */}
          {caseData.missing_information && caseData.missing_information.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="help-circle" size={16} color="#06b6d4" />
                <Text style={styles.sectionTitle}>Missing Clinical Information</Text>
              </View>
              {caseData.missing_information.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.missingItem}
                  onPress={() => handleSendFollowUp(`Doctor question: Could you please provide info on: ${item}?`)}
                >
                  <Text style={styles.missingText}>{item}</Text>
                  <Ionicons name="send" size={14} color="#06b6d4" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Reviewer Clinical Notes */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={16} color="#06b6d4" />
              <Text style={styles.sectionTitle}>Reviewer Clinical Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={reviewerNotes}
              onChangeText={setReviewerNotes}
              placeholder="Enter doctor's clinical impression, instructions, or prescription references..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.saveNotesBtn} onPress={handleSaveNotes} disabled={savingNotes}>
              <Text style={styles.saveNotesText}>Save Clinical Notes</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Send Follow-Up Question Bar */}
        <View style={styles.bottomBar}>
          <TextInput
            style={styles.followUpInput}
            value={followUpText}
            onChangeText={setFollowUpText}
            placeholder="Ask patient follow-up question..."
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !followUpText.trim() && styles.btnDisabled]}
            onPress={() => handleSendFollowUp()}
            disabled={!followUpText.trim() || sendingFollowUp}
          >
            <Ionicons name="send" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  refreshBtn: {
    padding: 6,
  },
  contentScroll: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  triageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 6,
  },
  triageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triageLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  urgencyBadge: {
    backgroundColor: '#450a0a',
    borderColor: '#b91c1c',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rationaleText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  destinationText: {
    fontSize: 11,
    color: '#06b6d4',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#06b6d4',
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  docBox: {
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  docName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  flagText: {
    fontSize: 11,
    color: '#fca5a5',
    fontWeight: '600',
  },
  labRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  labName: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  labVal: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  labStatus: {
    fontSize: 10,
    color: '#86efac',
    fontWeight: 'bold',
  },
  statusCritical: {
    color: '#f87171',
  },
  missingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 10,
  },
  missingText: {
    fontSize: 11,
    color: '#cbd5e1',
    flex: 1,
    marginRight: 8,
  },
  notesInput: {
    backgroundColor: '#020617',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    color: '#ffffff',
    fontSize: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveNotesBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveNotesText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  followUpInput: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});

