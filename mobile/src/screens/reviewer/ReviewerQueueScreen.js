import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../api/client';
import { SafetyBanner } from '../../components/SafetyBanner';

export function ReviewerQueueScreen({ user, onSelectCase, onLogout }) {
  const [cases, setCases] = useState([]);
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCases = async () => {
    try {
      const data = await mobileApi.getCases();
      setCases(data);
    } catch (err) {
      console.log('Error fetching cases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const refreshTimer = setInterval(fetchCases, 5000);
    return () => clearInterval(refreshTimer);
  }, []);

  const filteredCases = cases.filter(c => {
    if (selectedUrgency !== 'ALL' && c.urgency_level !== selectedUrgency) return false;
    return true;
  });

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'EMERGENCY': return { bg: '#450a0a', text: '#fca5a5', border: '#b91c1c' };
      case 'URGENT': return { bg: '#451a03', text: '#fdba74', border: '#c2410c' };
      case 'SEMI_URGENT': return { bg: '#422006', text: '#fde047', border: '#a16207' };
      default: return { bg: '#022c22', text: '#86efac', border: '#15803d' };
    }
  };

  const renderCase = ({ item }) => {
    const urgency = getUrgencyColor(item.urgency_level);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectCase(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
            <Text style={[styles.urgencyText, { color: urgency.text }]}>
              {item.urgency_level}
            </Text>
          </View>
          <Text style={styles.caseNum}>{item.case_number}</Text>
        </View>

        <Text style={styles.patientName}>
          {item.patient_name} ({item.patient_age ? `${item.patient_age}y` : 'Age N/A'}) • {item.patient_user_id}
        </Text>

        <Text style={styles.complaintText} numberOfLines={2}>
          Complaint: {item.chief_complaint || 'Intake in progress...'}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.scenarioTag}>{item.scenario.replace(/_/g, ' ')}</Text>
          <View style={styles.rightFooter}>
            {item.documents_count > 0 && (
              <View style={styles.docCount}>
                <Ionicons name="document-text" size={12} color="#06b6d4" />
                <Text style={styles.docText}>{item.documents_count} report</Text>
              </View>
            )}
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.reviewerTitle}>Clinician Triage Queue</Text>
          <Text style={styles.reviewerSub}>
            {user?.full_name} • {user?.user_id}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <SafetyBanner />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'EMERGENCY', 'URGENT', 'ROUTINE'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, selectedUrgency === tab && styles.filterChipActive]}
            onPress={() => setSelectedUrgency(tab)}
          >
            <Text style={[styles.filterText, selectedUrgency === tab && styles.filterTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Queue List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredCases}
          renderItem={renderCase}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCases(); }}
              tintColor="#06b6d4"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  reviewerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reviewerSub: {
    fontSize: 11,
    color: '#06b6d4',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#0891b2',
    borderColor: '#06b6d4',
  },
  filterText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  caseNum: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  patientName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  complaintText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  scenarioTag: {
    fontSize: 11,
    color: '#06b6d4',
    fontWeight: '600',
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docText: {
    fontSize: 10,
    color: '#06b6d4',
  },
  statusText: {
    fontSize: 10,
    color: '#cbd5e1',
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

