import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { Notification, useAlbums } from "@/contexts/AlbumContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

const MEMBERS = [
  { id: "1", name: "플라잉캣", initial: "플", color: "#FF6B8A", lastSeen: "방금 전", isOnline: true },
  { id: "2", name: "크라잉넛", initial: "크", color: "#6B8AFF", lastSeen: "어제", isOnline: false },
  { id: "3", name: "라이언", initial: "라", color: "#6BC97A", lastSeen: "3일 전", isOnline: false },
];

const STATIC_ACTIVITIES = [
  { id: "s1", member: "플라잉캣", initial: "플", avatarColor: "#FF6B8A", count: 1, date: "어제", thumbnailColor: "#FFB3C6" },
  { id: "s2", member: "크라잉넛", initial: "크", avatarColor: "#6B8AFF", count: 9, date: "5개월 전", thumbnailColor: "#B5D8F7" },
];

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "방금 전";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function RoleChangeCard({ n, colors }: { n: Notification; colors: (typeof Colors)["light"] }) {
  const roleLabel = n.newRole === "admin" ? "관리자" : "일반 멤버";
  return (
    <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.activityAvatar, { backgroundColor: n.actorAvatarColor }]}>
        <Text style={styles.activityAvatarInitial}>{n.actorInitial}</Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, { color: colors.text }]}>
          <Text style={styles.activityBold}>{n.actorName}</Text>
          {"님이 "}
          <Text style={styles.activityBold}>{n.targetMemberName}</Text>
          {"님의 역할을 "}
          <Text style={[styles.activityBold, { color: colors.tint }]}>{roleLabel}</Text>
          {"로 변경했습니다"}
        </Text>
        <Text style={[styles.activityDate, { color: colors.subtext }]}>{timeAgo(n.timestamp)}</Text>
      </View>
      <View style={[styles.roleBadgeIcon, { backgroundColor: n.newRole === "admin" ? colors.tint + "22" : colors.border + "44" }]}>
        <Ionicons name={n.newRole === "admin" ? "shield-checkmark" : "person"} size={20} color={n.newRole === "admin" ? colors.tint : colors.subtext} />
      </View>
    </View>
  );
}

export default function NewsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { notifications } = useAlbums();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>근황</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Members Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>멤버</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
            {MEMBERS.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatar, { backgroundColor: member.color }]}>
                    <Text style={styles.avatarInitial}>{member.initial}</Text>
                  </View>
                  {member.isOnline && <View style={styles.onlineDot} />}
                </View>
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
                <Text style={[styles.memberLastSeen, { color: colors.subtext }]}>{member.lastSeen}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        {/* Activity Feed */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>소식</Text>

          {/* Role-change notifications (newest first) */}
          {notifications.map((n) => (
            <RoleChangeCard key={n.id} n={n} colors={colors} />
          ))}

          {/* Static upload activities */}
          {STATIC_ACTIVITIES.map((activity) => (
            <View
              key={activity.id}
              style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.activityAvatar, { backgroundColor: activity.avatarColor }]}>
                <Text style={styles.activityAvatarInitial}>{activity.initial}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityText, { color: colors.text }]}>
                  <Text style={styles.activityBold}>{activity.member}</Text>
                  {" 님이 사진·동영상을 "}
                  <Text style={styles.activityBold}>{activity.count}개</Text>
                  {" 추가했습니다"}
                </Text>
                <Text style={[styles.activityDate, { color: colors.subtext }]}>{activity.date}</Text>
              </View>
              <View style={[styles.activityThumbnail, { backgroundColor: activity.thumbnailColor }]}>
                <Ionicons name="image" size={16} color="rgba(0,0,0,0.3)" />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  section: { paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 20, marginBottom: 14 },
  membersRow: { paddingHorizontal: 16, gap: 8 },
  memberCard: { alignItems: "center", width: 72, gap: 5 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 20, fontWeight: "700" },
  onlineDot: { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#34C759", borderWidth: 2, borderColor: "#fff" },
  memberName: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  memberLastSeen: { fontSize: 11, textAlign: "center" },
  sectionDivider: { height: 8, marginTop: 8 },
  activityCard: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  activityAvatarInitial: { color: "#fff", fontSize: 15, fontWeight: "700" },
  activityContent: { flex: 1, gap: 4 },
  activityText: { fontSize: 14, lineHeight: 20 },
  activityBold: { fontWeight: "600" },
  activityDate: { fontSize: 12 },
  activityThumbnail: { width: 48, height: 48, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  roleBadgeIcon: { width: 48, height: 48, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0 },
});
