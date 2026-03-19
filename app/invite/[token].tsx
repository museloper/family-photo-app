import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteInfo, InviteInfo, ApiError } from '@/services/api';

const ROLE_LABELS: Record<string, { label: string; emoji: string }> = {
  mom:       { label: '엄마',           emoji: '👩' },
  dad:       { label: '아빠',           emoji: '👨' },
  grandpa:   { label: '할아버지',        emoji: '👴' },
  grandma:   { label: '할머니',          emoji: '👵' },
  uncle_aunt:{ label: '외숙부모/이모·부', emoji: '🧑‍🤝‍🧑' },
  relative:  { label: '백부모/숙부모/고모·부', emoji: '👨‍👩‍👧' },
  baby:      { label: '아기',            emoji: '👶' },
  other:     { label: '그 외 가족',      emoji: '🏠' },
};

export default function InviteJoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { joinViaInviteSession } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInviteInfo(token)
      .then(setInfo)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : '초대 링크를 불러올 수 없습니다'));
  }, [token]);

  const handleJoin = async () => {
    if (!nickname.trim() || !token) return;
    setJoining(true);
    try {
      await joinViaInviteSession(token, nickname.trim());
      router.replace('/(tabs)' as any);
    } catch (e) {
      Alert.alert('참여 실패', e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setJoining(false);
    }
  };

  if (!info && !loadError) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="link-outline" size={48} color={colors.subtext} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>초대 링크 오류</Text>
        <Text style={[styles.errorDesc, { color: colors.subtext }]}>{loadError}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={() => router.replace('/' as any)}>
          <Text style={styles.primaryBtnText}>홈으로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const roleInfo = ROLE_LABELS[info!.invitedRole] ?? ROLE_LABELS.other;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 앨범 정보 헤더 */}
      <View style={[styles.albumBanner, { backgroundColor: info!.color + '22', borderBottomColor: colors.border }]}>
        <View style={[styles.albumDot, { backgroundColor: info!.color }]}>
          <Text style={styles.albumDotText}>{info!.babyName[0]}</Text>
        </View>
        <View>
          <Text style={[styles.albumBannerTitle, { color: colors.text }]}>{info!.albumName}</Text>
          <Text style={[styles.albumBannerSub, { color: colors.subtext }]}>{info!.babyName}의 앨범에 초대받으셨어요</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          {/* 역할 표시 */}
          <View style={[styles.roleChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.roleEmoji}>{roleInfo.emoji}</Text>
            <View>
              <Text style={[styles.roleChipLabel, { color: colors.subtext }]}>참여 역할</Text>
              <Text style={[styles.roleChipValue, { color: colors.text }]}>{roleInfo.label}</Text>
            </View>
          </View>

          <Text style={[styles.stepTitle, { color: colors.text }]}>앨범에서 사용할{'\n'}닉네임을 입력해주세요</Text>
          <Text style={[styles.stepDesc, { color: colors.subtext }]}>가족들에게 보여질 이름이에요</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="닉네임 입력"
            placeholderTextColor={colors.subtext}
            value={nickname}
            onChangeText={setNickname}
            maxLength={10}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />
          <Text style={[styles.charCount, { color: colors.subtext }]}>{nickname.length}/10</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: nickname.trim() ? colors.tint : colors.border, marginTop: 16 }]}
            onPress={handleJoin}
            disabled={!nickname.trim() || joining}
          >
            {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>앨범 참여하기</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  albumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  albumDot: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  albumDotText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  albumBannerTitle: { fontSize: 17, fontWeight: '700' },
  albumBannerSub: { fontSize: 13, marginTop: 2 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 28,
  },
  roleEmoji: { fontSize: 36 },
  roleChipLabel: { fontSize: 12, marginBottom: 2 },
  roleChipValue: { fontSize: 16, fontWeight: '700' },
  stepTitle: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 6 },
  stepDesc: { fontSize: 15, marginBottom: 20 },
  input: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, marginTop: 4,
  },
  charCount: { fontSize: 13, textAlign: 'right', marginTop: 4 },
  primaryBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
