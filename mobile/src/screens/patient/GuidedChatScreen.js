import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { mobileApi } from '../../api/client';
import { SafetyBanner } from '../../components/SafetyBanner';

export function GuidedChatScreen({ route, navigation, user, onLogout }) {
  const [currentCase, setCurrentCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState(user?.preferred_language || 'en');
  
  // Input fields
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedMultiOptions, setSelectedMultiOptions] = useState([]);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [transcribingVoice, setTranscribingVoice] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [expandedOcrDocs, setExpandedOcrDocs] = useState({});

  const scrollViewRef = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Initialize or resume case
  useEffect(() => {
    initCase();
  }, []);

  const initCase = async () => {
    setLoading(true);
    try {
      // Check if resuming case or creating new
      if (route?.params?.caseId) {
        const c = await mobileApi.getCaseDetail(route.params.caseId);
        setCurrentCase(c);
        setMessages(c.messages || []);
        fetchNextQuestion(c.id);
      } else {
        // Start a fresh case under default OPD or scenario
        const scenario = route?.params?.scenario || 'OPD_QUEUE';
        const newCase = await mobileApi.startNewCase(scenario, true);
        setCurrentCase(newCase);
        setMessages(newCase.messages || []);
        fetchNextQuestion(newCase.id);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not initialize triage session');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async (caseId) => {
    try {
      const qRes = await mobileApi.getNextQuestion(caseId);
      if (qRes.completed) {
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(qRes.question);
      }
    } catch (err) {
      console.error('Next question error:', err);
    }
  };

  // Poll for reviewer follow-ups and case status updates
  useEffect(() => {
    if (!currentCase) return;
    const interval = setInterval(async () => {
      try {
        const refreshed = await mobileApi.getCaseDetail(currentCase.id);
        if (
          refreshed.messages?.length !== messages.length ||
          refreshed.status !== currentCase.status ||
          refreshed.updated_at !== currentCase.updated_at
        ) {
          setCurrentCase(refreshed);
          setMessages(refreshed.messages || []);
          fetchNextQuestion(refreshed.id);
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [currentCase, messages.length]);

  const handleSelectSingleOption = async (option) => {
    if (!currentCase || !currentQuestion || submitting) return;
    setSubmitting(true);
    try {
      const isHi = language === 'hi';
      const label = isHi && option.label_hi ? option.label_hi : option.label;
      const res = await mobileApi.submitAnswer({
        case_id: currentCase.id,
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        question_text_hi: currentQuestion.text_hi,
        answer_text: label,
        answer_options_selected: [option.id],
        input_type: 'single_choice',
      });
      setCurrentCase(res);
      setMessages(res.messages || []);
      fetchNextQuestion(res.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMultiOption = (optionId) => {
    if (selectedMultiOptions.includes(optionId)) {
      setSelectedMultiOptions(selectedMultiOptions.filter(id => id !== optionId));
    } else {
      setSelectedMultiOptions([...selectedMultiOptions, optionId]);
    }
  };

  const handleSubmitMultiChoice = async () => {
    if (!currentCase || !currentQuestion || submitting || selectedMultiOptions.length === 0) return;
    setSubmitting(true);
    try {
      const isHi = language === 'hi';
      const selectedLabels = currentQuestion.options
        .filter(opt => selectedMultiOptions.includes(opt.id))
        .map(opt => (isHi && opt.label_hi ? opt.label_hi : opt.label));

      const res = await mobileApi.submitAnswer({
        case_id: currentCase.id,
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        question_text_hi: currentQuestion.text_hi,
        answer_text: selectedLabels.join(', '),
        answer_options_selected: selectedMultiOptions,
        input_type: 'multi_choice',
      });
      setSelectedMultiOptions([]);
      setCurrentCase(res);
      setMessages(res.messages || []);
      fetchNextQuestion(res.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitText = async (customText) => {
    const textToSend = customText || textAnswer;
    if (!textToSend.trim() || !currentCase || submitting) return;
    setSubmitting(true);
    try {
      const qId = currentQuestion ? currentQuestion.id : `patient_note_${Date.now()}`;
      const qText = currentQuestion ? currentQuestion.text : 'Patient Note';
      const qTextHi = currentQuestion ? currentQuestion.text_hi : 'मरीज टिप्पणी';

      const res = await mobileApi.submitAnswer({
        case_id: currentCase.id,
        question_id: qId,
        question_text: qText,
        question_text_hi: qTextHi,
        answer_text: textToSend.trim(),
        input_type: 'text',
      });
      setTextAnswer('');
      setCurrentCase(res);
      setMessages(res.messages || []);
      fetchNextQuestion(res.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone Permission Needed', 'Allow microphone access to record your response.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceRecording(true);
    } catch (err) {
      Alert.alert('Recording Failed', err.message || 'Could not start microphone recording.');
    }
  };

  const handleVoiceInput = async () => {
    if (!currentCase) return;

    if (!voiceRecording) {
      Alert.alert(
        'Send Voice for Transcription?',
        'Your recording will be sent to your backend computer and transcribed locally. Review the transcript before sending it in chat.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: startVoiceRecording },
        ]
      );
      return;
    }

    try {
      await audioRecorder.stop();
      setVoiceRecording(false);
      const recordingUri = audioRecorder.uri;
      if (!recordingUri) {
        throw new Error('The recording file was not created. Please try again.');
      }

      setTranscribingVoice(true);
      const result = await mobileApi.transcribeVoice(currentCase.id, recordingUri, language);
      const transcript = result.transcription?.trim();
      if (!transcript) {
        throw new Error('No speech was recognized. Please try again in a quieter place.');
      }

      setTextAnswer((current) => [current.trim(), transcript].filter(Boolean).join(' '));
      Alert.alert('Voice Transcribed', 'Review and edit the recognized text before sending it.');
    } catch (err) {
      setVoiceRecording(false);
      console.error('Voice transcription failed:', err);
      Alert.alert('Voice Transcription Failed', err.message || 'Could not transcribe this recording.');
    } finally {
      setTranscribingVoice(false);
    }
  };
  // Pick and Upload Medical Document (PDF or Camera)
  const handlePickDocument = async () => {
    if (!currentCase) {
      Alert.alert('No Active Case', 'Open or start a case before attaching a report.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        // Keep Android's document-provider URI. Copying to Expo Go's shared
        // DocumentPicker cache can produce a file URI its FileSystem cannot read.
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadSelectedFile(file);
      }
    } catch (err) {
      console.error('Document pick error:', err);
      Alert.alert('Could Not Open Documents', err.message || 'Check file access and try again.');
    }
  };

  const handlePickImage = async () => {
    if (!currentCase) {
      Alert.alert('No Active Case', 'Open or start a case before attaching a report.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadSelectedFile(file);
      }
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Could Not Open Photos', err.message || 'Check photo access and try again.');
    }
  };

  const uploadSelectedFile = async (file) => {
    setUploadingReport(true);
    try {
      const uploadedDocument = await mobileApi.uploadReport(currentCase.id, file);
      try {
        const refreshed = await mobileApi.getCaseDetail(currentCase.id);
        setCurrentCase(refreshed);
        setMessages(refreshed.messages || []);
        fetchNextQuestion(refreshed.id);
      } catch (refreshError) {
        console.warn('Report uploaded, but case refresh failed:', refreshError);
        setCurrentCase((current) => ({
          ...current,
          documents: [...(current?.documents || []), uploadedDocument],
        }));
      }
      if (uploadedDocument.ocr_status === 'COMPLETED') {
        Alert.alert('Report Uploaded', 'Text was extracted from the report and lab analysis completed.');
      } else {
        Alert.alert(
          'Report Uploaded, No Text Found',
          'We could not read text from this file. Try a sharper, well-lit photo or a text-based PDF.'
        );
      }
    } catch (err) {
      console.error('Document upload failed:', err);
      Alert.alert('Upload Failed', err.message || 'Could not upload report');
    } finally {
      setUploadingReport(false);
    }
  };

  // Pre-configured Test Sample Report button for Instant Demo
  const handleUploadSampleTestReport = async () => {
    if (!currentCase) return;
    setUploadingReport(true);
    try {
      // Create simulated sample submission directly
      await mobileApi.submitAnswer({
        case_id: currentCase.id,
        question_id: 'report_upload_attachment',
        question_text: 'Uploaded Complete Blood Count (CBC) Report',
        answer_text: 'Sample Report Attached: CBC Dengue Panel [Platelets: 42,000 /mcL, Dengue NS1 Reactive]',
        input_type: 'upload',
      });
      const refreshed = await mobileApi.getCaseDetail(currentCase.id);
      setCurrentCase(refreshed);
      setMessages(refreshed.messages || []);
      fetchNextQuestion(refreshed.id);
      Alert.alert('Sample Report Processed', 'OCR extracted: Platelets 42,000 /mcL (Critical Low), NS1 Positive.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingReport(false);
    }
  };

  const isHindi = language === 'hi';

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading triage session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack ? navigation.goBack() : onLogout()}
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.caseNum}>
              {currentCase?.case_number || 'New Intake'}
            </Text>
            <Text style={styles.patientInfo}>
              {user?.full_name} ({user?.user_id})
            </Text>
          </View>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          >
            <Text style={styles.langText}>
              {language === 'en' ? 'हिंदी' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Safety Disclaimer Banner */}
        <SafetyBanner language={language} />

        {/* Reviewer Status Pill if assigned */}
        {currentCase?.assigned_reviewer_name && (
          <View style={styles.reviewerPill}>
            <Ionicons name="shield-checkmark" size={14} color="#06b6d4" />
            <Text style={styles.reviewerText}>
              Assigned Doctor: {currentCase.assigned_reviewer_name} ({currentCase.assigned_reviewer_id})
            </Text>
          </View>
        )}

        {currentCase?.status === 'REFERRED' && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Ionicons name="navigate-circle" size={20} color="#fbbf24" />
              <Text style={styles.referralTitle}>Referral information</Text>
            </View>
            <Text style={styles.referralDestination}>
              Destination: {currentCase.referral_destination || 'See the referral handoff note below.'}
            </Text>
            {currentCase.referral_note ? (
              <Text selectable style={styles.referralNote}>{currentCase.referral_note}</Text>
            ) : null}
          </View>
        )}

        {/* Chat Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Welcome Message */}
          <View style={styles.aiBubble}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={14} color="#06b6d4" />
              <Text style={styles.aiName}>Triage Assistant</Text>
            </View>
            <Text style={styles.bubbleText}>
              {isHindi
                ? `नमस्ते ${user?.full_name || 'मरीज'}। हम आपकी स्वास्थ्य स्थिति का विवरण व्यवस्थित करने में मदद करेंगे। कृपया नीचे दिए गए प्रश्नों के उत्तर दें:`
                : `Hello ${user?.full_name || 'Patient'}. I will help organize your health symptoms for the clinical reviewer. Please answer each question as it appears:`}
            </Text>
          </View>

          {/* Conversation Messages */}
          {messages.map((m, idx) => {
            const isPatient = m.sender_type === 'patient';
            const isReviewer = m.sender_type === 'reviewer';

            return (
              <View
                key={m.id || idx}
                style={[
                  styles.messageRow,
                  isPatient ? styles.rowPatient : styles.rowDoctor,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isPatient
                      ? styles.bubblePatient
                      : isReviewer
                      ? styles.bubbleDoctor
                      : styles.bubbleAI,
                  ]}
                >
                  <View style={styles.senderHeader}>
                    <Text
                      style={[
                        styles.senderName,
                        isReviewer && styles.doctorName,
                        isPatient && styles.patientName,
                      ]}
                    >
                      {isReviewer
                        ? `Dr. ${m.sender_name} (Reviewer)`
                        : isPatient
                        ? 'You'
                        : 'System'}
                    </Text>
                    <Text style={styles.msgTime}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* Question text if present */}
                  {m.question_text && (
                    <Text style={styles.msgQuestion}>
                      {isHindi && m.question_text_hi ? m.question_text_hi : m.question_text}
                    </Text>
                  )}

                  {/* Answer / Text */}
                  {m.answer_text ? (
                    <Text style={styles.msgAnswer}>{m.answer_text}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {/* OCR results are available to the patient as well as the reviewer. */}
          {(currentCase?.documents || []).map((doc) => (
            <View key={doc.id || doc.filename} style={styles.extractionCard}>
              <View style={styles.extractionHeader}>
                <Ionicons name="document-text" size={16} color="#06b6d4" />
                <View style={styles.extractionHeaderText}>
                  <Text style={styles.extractionTitle}>{doc.original_filename}</Text>
                  <Text style={[
                    styles.extractionStatus,
                    doc.ocr_status === 'COMPLETED' ? styles.extractionSuccess : styles.extractionFailure,
                  ]}>
                    {doc.ocr_status === 'COMPLETED' ? 'Text extracted' : 'Text extraction failed'}
                  </Text>
                </View>
              </View>

              {doc.structured_lab_data?.length > 0 ? (
                <View style={styles.extractionLabs}>
                  {doc.structured_lab_data.map((lab, index) => (
                    <View key={`${doc.id}-lab-${index}`} style={styles.extractionLabRow}>
                      <Text style={styles.extractionLabName}>{lab.test_name}</Text>
                      <Text style={styles.extractionLabValue}>{lab.value} {lab.unit}</Text>
                      <Text style={[
                        styles.extractionLabStatus,
                        lab.status === 'CRITICAL' && styles.extractionFailure,
                      ]}>{lab.status}</Text>
                    </View>
                  ))}
                </View>
              ) : doc.ocr_status !== 'COMPLETED' && doc.extracted_text ? (
                <Text style={styles.extractionBody}>{doc.extracted_text}</Text>
              ) : (
                <Text style={styles.extractionBody}>No lab values were recognized in this file.</Text>
              )}

              {doc.clinical_flags?.map((flag, index) => (
                <Text key={`${doc.id}-flag-${index}`} style={styles.extractionFlag}>- {flag}</Text>
              ))}

              {doc.extracted_text && doc.ocr_status === 'COMPLETED' && (
                <>
                  <TouchableOpacity
                    onPress={() => setExpandedOcrDocs((current) => ({
                      ...current,
                      [doc.id]: !current[doc.id],
                    }))}
                  >
                    <Text style={styles.extractionToggle}>
                      {expandedOcrDocs[doc.id] ? 'Hide extracted text' : 'View extracted text'}
                    </Text>
                  </TouchableOpacity>
                  {expandedOcrDocs[doc.id] && (
                    <Text selectable style={styles.extractionRawText}>{doc.extracted_text}</Text>
                  )}
                </>
              )}

              <Text style={styles.extractionNote}>
                Check extracted values against the original report; OCR can misread text.
              </Text>
            </View>
          ))}

          {/* Active Question Prompt (Appears One-by-One) */}
          {currentQuestion && (
            <View style={styles.activeQuestionCard}>
              <View style={styles.questionBadge}>
                <Ionicons name="help-circle" size={14} color="#06b6d4" />
                <Text style={styles.questionCategory}>
                  {currentQuestion.category}
                </Text>
              </View>

              <Text style={styles.activeQuestionText}>
                {isHindi && currentQuestion.text_hi ? currentQuestion.text_hi : currentQuestion.text}
              </Text>

              {/* Options Chips (Single Choice) */}
              {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                <View style={styles.optionsWrap}>
                  {currentQuestion.options.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.chipBtn}
                      onPress={() => handleSelectSingleOption(opt)}
                      disabled={submitting}
                    >
                      <Text style={styles.chipText}>
                        {isHindi && opt.label_hi ? opt.label_hi : opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Multi Choice Chips with Submit */}
              {currentQuestion.type === 'multi_choice' && currentQuestion.options && (
                <View style={styles.multiWrap}>
                  <View style={styles.optionsWrap}>
                    {currentQuestion.options.map((opt) => {
                      const isSel = selectedMultiOptions.includes(opt.id);
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.chipBtn, isSel && styles.chipBtnSelected]}
                          onPress={() => handleToggleMultiOption(opt.id)}
                        >
                          <Ionicons
                            name={isSel ? 'checkbox' : 'square-outline'}
                            size={14}
                            color={isSel ? '#ffffff' : '#94a3b8'}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>
                            {isHindi && opt.label_hi ? opt.label_hi : opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitMultiBtn, selectedMultiOptions.length === 0 && styles.btnDisabled]}
                    onPress={handleSubmitMultiChoice}
                    disabled={selectedMultiOptions.length === 0 || submitting}
                  >
                    <Text style={styles.submitMultiText}>
                      {isHindi ? 'पुष्टि करें (Submit)' : 'Confirm Selection'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Scale / Severity */}
              {currentQuestion.type === 'scale' && currentQuestion.options && (
                <View style={styles.optionsWrap}>
                  {currentQuestion.options.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.scaleChip}
                      onPress={() => handleSelectSingleOption(opt)}
                    >
                      <Text style={styles.scaleText}>
                        {isHindi && opt.label_hi ? opt.label_hi : opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Upload Report Step */}
              {currentQuestion.type === 'upload' && (
                <View style={styles.uploadCard}>
                  <Text style={styles.uploadPrompt}>
                    {isHindi
                      ? "रक्त रिपोर्ट या पर्ची का फोटो/पीडीएफ अपलोड करें:"
                      : "Attach lab report, scan slip, or prescription:"}
                  </Text>
                  <View style={styles.uploadActionRow}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
                      <Ionicons name="document-text-outline" size={16} color="#06b6d4" />
                      <Text style={styles.uploadBtnText}>Upload PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                      <Ionicons name="camera-outline" size={16} color="#06b6d4" />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Fast 1-Click Synthetic Sample Report button */}
                  <TouchableOpacity
                    style={styles.sampleTestBtn}
                    onPress={handleUploadSampleTestReport}
                  >
                    <Ionicons name="flask-outline" size={14} color="#38bdf8" />
                    <Text style={styles.sampleTestText}>
                      Attach Sample CBC / Dengue Lab Report (1-Click Test)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Completion banner if all protocol questions answered */}
          {!currentQuestion && (
            <View style={styles.completedCard}>
              <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              <Text style={styles.completedTitle}>
                {isHindi ? 'प्रारंभिक जांच पूरी हुई' : 'Initial Triage Form Completed'}
              </Text>
              <Text style={styles.completedDesc}>
                {isHindi
                  ? "आपकी जानकारी मेडिकल ऑफिसर को भेज दी गई है। आवश्यकता पड़ने पर वे आपसे अनुवर्ती प्रश्न पूछेंगे।"
                  : "Your responses have been summarized and forwarded to the clinical reviewer. The medical officer may ask follow-up questions above."}
              </Text>
            </View>
          )}

          {uploadingReport && (
            <View style={styles.uploadingBox}>
              <ActivityIndicator color="#06b6d4" size="small" />
              <Text style={styles.uploadingText}>Running OCR extraction on report...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar (Voice, Text typing, Attachments) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickDocument}
            title="Attach file"
          >
            <Ionicons name="attach" size={22} color="#94a3b8" />
          </TouchableOpacity>

          <TextInput
            style={styles.chatInput}
            value={textAnswer}
            onChangeText={setTextAnswer}
            placeholder={
              transcribingVoice
                ? 'Transcribing voice...'
                : voiceRecording
                ? 'Recording... tap the mic to stop'
                : isHindi ? "उत्तर लिखें या बोलें..." : "Type symptoms or response..."
            }
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity
            style={[styles.voiceBtn, voiceRecording && styles.voiceBtnActive]}
            onPress={handleVoiceInput}
            disabled={transcribingVoice || submitting}
            accessibilityRole="button"
            accessibilityLabel={transcribingVoice ? 'Transcribing voice' : voiceRecording ? 'Stop voice recording' : 'Start voice recording'}
          >
            <Ionicons
              name={transcribingVoice ? 'hourglass' : voiceRecording ? 'radio' : 'mic'}
              size={18}
              color={transcribingVoice ? '#fbbf24' : voiceRecording ? '#ef4444' : '#ffffff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, (!textAnswer.trim() || voiceRecording || transcribingVoice) && styles.btnDisabled]}
            onPress={() => handleSubmitText()}
            disabled={!textAnswer.trim() || submitting || voiceRecording || transcribingVoice}
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
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
  headerInfo: {
    alignItems: 'center',
  },
  caseNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  patientInfo: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 4,
    gap: 6,
  },
  reviewerText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  referralCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#92400e',
    gap: 8,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700',
  },
  referralDestination: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '600',
  },
  referralNote: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  aiBubble: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 6,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06b6d4',
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  messageRow: {
    marginVertical: 4,
  },
  rowPatient: {
    alignItems: 'flex-end',
  },
  rowDoctor: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  bubblePatient: {
    backgroundColor: '#0891b2',
    borderBottomRightRadius: 4,
  },
  bubbleDoctor: {
    backgroundColor: '#1e1b4b',
    borderColor: '#4338ca',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  senderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  doctorName: {
    color: '#818cf8',
  },
  patientName: {
    color: '#cffafe',
  },
  msgTime: {
    fontSize: 9,
    color: '#cbd5e1',
    opacity: 0.8,
  },
  msgQuestion: {
    fontSize: 11,
    color: '#e2e8f0',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  msgAnswer: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  activeQuestionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#06b6d4',
    padding: 16,
    marginVertical: 8,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  questionCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06b6d4',
    textTransform: 'uppercase',
  },
  activeQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 14,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipBtnSelected: {
    backgroundColor: '#0891b2',
    borderColor: '#06b6d4',
  },
  chipText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  multiWrap: {
    gap: 12,
  },
  submitMultiBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitMultiText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  scaleChip: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scaleText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  uploadCard: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  extractionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#155e75',
    padding: 12,
    marginVertical: 8,
    gap: 8,
  },
  extractionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractionHeaderText: {
    flex: 1,
  },
  extractionTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  extractionStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  extractionSuccess: {
    color: '#34d399',
  },
  extractionFailure: {
    color: '#fca5a5',
  },
  extractionLabs: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 2,
    paddingTop: 4,
  },
  extractionLabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 6,
  },
  extractionLabName: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 11,
  },
  extractionLabValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  extractionLabStatus: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  extractionBody: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  extractionFlag: {
    color: '#fbbf24',
    fontSize: 11,
  },
  extractionToggle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  extractionRawText: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 15,
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 8,
  },
  extractionNote: {
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 13,
  },
  uploadPrompt: {
    fontSize: 12,
    color: '#94a3b8',
  },
  uploadActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  uploadBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  sampleTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    gap: 6,
  },
  sampleTestText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  completedCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10b981',
  },
  completedDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 8,
  },
  uploadingText: {
    color: '#06b6d4',
    fontSize: 12,
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
  attachBtn: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0891b2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: '#450a0a',
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

