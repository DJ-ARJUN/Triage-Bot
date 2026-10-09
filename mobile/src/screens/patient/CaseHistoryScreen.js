import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../api/client';
import { SafetyBanner } from '../../components/SafetyBanner';

export function CaseHistoryScreen({ user, onSelectCase, onStartNewCase, onLogout }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCases = async () => {
    try {
      const data = await mobileApi.getCases();
      setCases(data);
    } catch (err) {
      console.log('Error fetching patient cases:', err);
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'EMERGENCY': return { bg: '#450a0a', text: '#fca5a5', border: '#b91c1c' };
      case 'URGENT': return { bg: '#451a03', text: '#fdba74', border: '#c2410c' };
      case 'SEMI_URGENT': return { bg: '#422006', text: '#fde047', border: '#a16207' };
      default: return { bg: '#022c22', text: '#86efac', border: '#15803d' };
    }
  };

  const renderCaseItem = ({ item }) => {
    const urgency = getUrgencyColor(item.urgency_level);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectCase(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.caseNum}>{item.case_number}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
            <Text style={[styles.urgencyText, { color: urgency.text }]}>
              {item.urgency_level}
            </Text>
          </View>
        </View>

        <Text style={styles.scenarioText}>
          Protocol: {item.scenario.replace(/_/g, ' ')}
        </Text>

        <Text style={styles.complaintText} numberOfLines={2}>
          Complaint: {item.chief_complaint || 'General intake in progress'}
        </Text>

        {item.status === 'REFERRED' && item.referral_destination ? (
          <View style={styles.reviewerRow}>
            <Ionicons name="navigate-circle-outline" size={16} color="#fbbf24" />
            <Text style={styles.reviewerText}>Referral destination: {item.referral_destination}</Text>
          </View>
        ) : null}

        {/* Assigned Reviewer Info */}
        <View style={styles.reviewerRow}>
          <Ionicons name="person-circle-outline" size={16} color="#06b6d4" />
          <Text style={styles.reviewerText}>
            Reviewer: {item.assigned_reviewer_name ? `${item.assigned_reviewer_name} (${item.assigned_reviewer_id})` : 'Awaiting Reviewer Assignment'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome, {user?.full_name}</Text>
          <Text style={styles.idText}>Patient ID: {user?.user_id}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <SafetyBanner />

      {/* Start New Case Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.newCaseBtn} onPress={onStartNewCase}>
          <Ionicons name="add-circle" size={20} color="#ffffff" />
          <Text style={styles.newCaseText}>Start New Health Triage Case</Text>
        </TouchableOpacity>
      </View>

      {/* Cases List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Your Medical Triage Cases ({cases.length}):</Text>
        <FlatList
          data={cases}
          renderItem={renderCaseItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCases(); }}
              tintColor="#06b6d4"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={36} color="#475569" />
              <Text style={styles.emptyText}>No previous cases found.</Text>
              <Text style={styles.emptySubText}>Tap the button above to begin your intake.</Text>
            </View>
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
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  idText: {
    fontSize: 12,
    color: '#06b6d4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  newCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#0891b2',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  newCaseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  caseNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  scenarioText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  complaintText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginTop: 4,
  },
  reviewerText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
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
  dateText: {
    fontSize: 11,
    color: '#64748b',
  },
  statusBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 12,
    color: '#475569',
  },
});

