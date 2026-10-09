import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function SafetyBanner({ language = 'en' }) {
  const isHindi = language === 'hi';
  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={16} color="#f59e0b" style={styles.icon} />
      <Text style={styles.text}>
        {isHindi
          ? "यह प्रणाली केवल प्रारंभिक प्राथमिक जांच के लिए है। यह चिकित्सा निदान या डॉक्टर का विकल्प नहीं है।"
          : "Assistive Triage Support Only. Strictly non-diagnostic and does not replace qualified doctor evaluation."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: '#fbbf24',
    lineHeight: 15,
    fontWeight: '500',
  },
});

