import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ApiActivity, ApiMember, ApiError, FILE_BASE, getActivity, getMembers } from "@/services/api";

const AVATAR_COLORS = ['#FF6B8A', '#6B8AFF', '#6BC97A', '#FFB347', '#A78BFA', '#00CEC9'];

const DISPLAY_ROLE_LABELS: Record<string, string> = {
  mom: '엄마', dad: '아빠', grandpa: '할아버지', grandma: '할머니',
  uncle_aunt: '외숙부모/이모·부', relative: '백부모/숙부모/고모·부',
  baby: '아기', other: '가족', admin: '관리자', member: '멤버',
};
function displayRoleLabel(m: { role: string; display_role: string; is_creator: boolean }): string {
  const label = DISPLAY_ROLE_LABELS[m.display_role] ?? DISPLAY_ROLE_LABELS[m.role] ?? '가족';
  return m.is_creator ? `${label} (생성자)` : label;
}

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "방금 전";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export default function NewsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { session, clearSession } = useAuth();

  const [members, setMembers] = useState<ApiMember[]>([]);
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([
      getMembers(session.albumId, session.token),
      getActivity(session.albumId, session.token),
    ])
      .then(([m, a]) => {
        setMembers(m);
        setActivity(a);
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearSession();
      })
      .finally(() => setLoading(false));
  }, [session]);

  useFocusEffect(fetchData);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>근황</Text>
      </View>

      {loading && members.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 멤버 섹션 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>멤버</Text>
            {members.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.subtext }]}>멤버가 없습니다</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
                {members.map((m) => {
                  const color = avatarColor(m.name);
                  return (
                    <View key={m.id} style={styles.memberCard}>
                      <View style={styles.avatarWrapper}>
                        <View style={[styles.avatar, { backgroundColor: color }]}>
                          {m.avatar_url
                            ? <Image source={{ uri: FILE_BASE + m.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                            : <Text style={styles.avatarInitial}>{m.name.charAt(0)}</Text>
                          }
                        </View>
                        {m.role === 'admin' && (
                          <View style={[styles.adminDot, { backgroundColor: colors.tint }]}>
                            <Ionicons name="shield-checkmark" size={8} color="#fff" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={[styles.memberRole, { color: colors.subtext }]}>
                        {displayRoleLabel(m)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

          {/* 소식 섹션 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>소식</Text>

            {activity.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.subtext }]}>아직 업로드된 사진이 없습니다</Text>
            ) : (
              activity.map((a) => {
                const color = avatarColor(a.uploader_name);
                return (
                  <View
                    key={a.uploader_id}
                    style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.activityAvatar, { backgroundColor: color }]}>
                      {a.avatar_url
                        ? <Image source={{ uri: FILE_BASE + a.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        : <Text style={styles.activityAvatarInitial}>{a.uploader_name.charAt(0)}</Text>
                      }
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityText, { color: colors.text }]}>
                        <Text style={styles.activityBold}>{a.uploader_name}</Text>
                        {"님이 사진·동영상을 "}
                        <Text style={styles.activityBold}>{a.count}개</Text>
                        {" 추가했습니다"}
                      </Text>
                      <Text style={[styles.activityDate, { color: colors.subtext }]}>
                        {timeAgo(a.last_uploaded_at)}
                      </Text>
                    </View>
                    <View style={[styles.activityIconWrap, { backgroundColor: color + '22' }]}>
                      <Ionicons name="images-outline" size={20} color={color} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 14, paddingHorizontal: 20, paddingVertical: 8 },
  section: { paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 20, marginBottom: 14 },
  membersRow: { paddingHorizontal: 16, gap: 8 },
  memberCard: { alignItems: "center", width: 72, gap: 5 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 20, fontWeight: "700" },
  adminDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  memberName: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  memberRole: { fontSize: 11, textAlign: "center" },
  sectionDivider: { height: 8, marginTop: 8 },
  activityCard: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  activityAvatarInitial: { color: "#fff", fontSize: 15, fontWeight: "700" },
  activityContent: { flex: 1, gap: 4 },
  activityText: { fontSize: 14, lineHeight: 20 },
  activityBold: { fontWeight: "600" },
  activityDate: { fontSize: 12 },
  activityIconWrap: { width: 48, height: 48, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0 },
});
