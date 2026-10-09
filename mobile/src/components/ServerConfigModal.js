import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getServerUrl, setServerUrl } from '../api/client';

export function ServerConfigModal({ visible, onClose }) {
  const [url, setUrl] = useState(getServerUrl());

  const handleSave = () => {
    if (url.trim()) {
      setServerUrl(url.trim());
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Ionicons name="server-outline" size={20} color="#06b6d4" />
            <Text style={styles.title}>Backend Host Configuration</Text>
          </View>
          <Text style={styles.desc}>
            If running on a physical phone via Expo Go, ensure this points to your PC's Wi-Fi IP address (e.g., http://10.161.35.182:8000):
          </Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://10.161.35.182:8000"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save IP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  desc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0891b2',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

