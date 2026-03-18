import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import DatePicker from '@/components/DatePicker';

const STEPS = ['관계 선택', '닉네임', '아기 정보'];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createGuestSession } = useAuth();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [nickname, setNickname] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const goNext = () => {
    if (step === 0 && !role) { Alert.alert('관계를 선택해주세요'); return; }
    if (step === 1 && !nickname.trim()) { Alert.alert('닉네임을 입력해주세요'); return; }
    setStep(step + 1);
  };

  const handleComplete = async () => {
    if (!babyName.trim()) { Alert.alert('아기 이름을 입력해주세요'); return; }
    if (!birthYear || !birthMonth || !birthDay) {
      Alert.alert('생년월일을 선택해주세요');
      return;
    }
    const babyBirth = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
    await createGuestSession({ role: role!, nickname: nickname.trim(), babyName: babyName.trim(), babyBirth });
    router.replace('/(tabs)');
  };

  const birthLabel =
    birthYear && birthMonth && birthDay
      ? `${birthYear}년 ${birthMonth}월 ${birthDay}일`
      : '생년월일 선택';

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              아기와의 관계가{'\n'}어떻게 되시나요?
            </Text>
            <View style={styles.roleRow}>
              {([['mom', '👩', '엄마'], ['dad', '👨', '아빠']] as const).map(([val, emoji, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: role === val ? colors.primary : colors.border,
                      borderWidth: role === val ? 2 : 1,
                    },
                  ]}
                  onPress={() => setRole(val)}
                >
                  {role === val && (
                    <View style={[styles.roleCheck, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.roleEmoji}>{emoji}</Text>
                  <Text style={[styles.roleLabel, { color: colors.text }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              앨범에서 사용할{'\n'}닉네임을 입력해주세요
            </Text>
            <Text style={[styles.stepDesc, { color: colors.subtext }]}>
              가족들에게 보여질 이름이에요
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="닉네임 입력"
              placeholderTextColor={colors.subtext}
              value={nickname}
              onChangeText={setNickname}
              maxLength={10}
              autoFocus
            />
            <Text style={[styles.hint, { color: colors.subtext }]}>{nickname.length}/10</Text>
          </View>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              아기의 정보를{'\n'}입력해주세요
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>아기 이름</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="아기 이름"
              placeholderTextColor={colors.subtext}
              value={babyName}
              onChangeText={setBabyName}
            />

            <Text style={[styles.label, { color: colors.text }]}>생년월일</Text>
            <TouchableOpacity
              style={[
                styles.dateTrigger,
                {
                  backgroundColor: colors.card,
                  borderColor: showPicker ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowPicker((v) => !v)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateTriggerText,
                  { color: birthYear ? colors.text : colors.subtext },
                ]}
              >
                {birthLabel}
              </Text>
              <Ionicons
                name={showPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {showPicker && (
              <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <DatePicker
                  selectedYear={birthYear}
                  selectedMonth={birthMonth}
                  selectedDay={birthDay}
                  onSelect={(y, m, d) => {
                    setBirthYear(y);
                    setBirthMonth(m);
                    setBirthDay(d);
                    setShowPicker(false);
                  }}
                  colors={colors}
                />
              </View>
            )}
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
          {renderStep()}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={step === 2 ? handleComplete : goNext}
          >
            <Text style={styles.nextBtnText}>{step === 2 ? '완료' : '다음'}</Text>
            {step < 2 && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  stepIndicator: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 8 },
  stepDesc: { fontSize: 15, marginBottom: 24 },
  roleRow: { flexDirection: 'row', gap: 16, marginTop: 32 },
  roleCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  roleEmoji: { fontSize: 52 },
  roleLabel: { fontSize: 18, fontWeight: '700' },
  roleCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 6,
  },
  hint: { fontSize: 13, textAlign: 'right' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 20 },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateTriggerText: { fontSize: 16 },
  pickerWrap: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 8 },
  nextBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
