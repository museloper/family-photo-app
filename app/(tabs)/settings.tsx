import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { Album, MemberRole, useAlbums } from "@/contexts/AlbumContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ApiAlbum, ApiError, ApiMember,
  createAlbum, deleteAlbumApi, getAlbums, getMembers,
  removeMember, updateAlbumApi, updateMemberRoleApi,
} from "@/services/api";

const MEMBER_AVATAR_COLORS = ['#FF6B8A', '#6B8AFF', '#6BC97A', '#FFB347', '#A78BFA', '#00CEC9'];
function memberAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return MEMBER_AVATAR_COLORS[Math.abs(h) % MEMBER_AVATAR_COLORS.length];
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const ALBUM_COLORS = ["#FF6B8A", "#6B8AFF", "#6BC97A", "#FF9F43", "#A29BFE", "#FD79A8"];
const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const CUR_MONTH = NOW.getMonth() + 1;

// ─── Date Picker (year → month → day) ───────────────────────────────────────
type DatePickerProps = {
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  onSelect: (year: number, month: number, day: number) => void;
  colors: (typeof Colors)["light"];
};

function DatePicker({ selectedYear, selectedMonth, selectedDay, onSelect, colors }: DatePickerProps) {
  const [pickerYear, setPickerYear] = useState(selectedYear ?? CUR_YEAR);
  const [pickerMonth, setPickerMonth] = useState<number | null>(selectedMonth ?? null);
  const canGoNextYear = pickerYear < CUR_YEAR;
  const todayDate = new Date().getDate();

  if (pickerMonth !== null) {
    const totalDays = daysInMonth(pickerYear, pickerMonth);
    const isFutureYM = pickerYear > CUR_YEAR || (pickerYear === CUR_YEAR && pickerMonth > CUR_MONTH);
    return (
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.yearRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setPickerMonth(null)} style={pickerStyles.chevronBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[pickerStyles.yearLabel, { color: colors.text }]}>{pickerYear}년 {pickerMonth}월</Text>
          <View style={pickerStyles.chevronBtn} />
        </View>
        <View style={pickerStyles.dayGrid}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const isFuture = isFutureYM || (pickerYear === CUR_YEAR && pickerMonth === CUR_MONTH && d > todayDate);
            const isSelected = pickerYear === selectedYear && pickerMonth === selectedMonth && d === selectedDay;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  pickerStyles.dayCell,
                  isSelected && { backgroundColor: colors.tint, borderRadius: 8 },
                  isFuture && { opacity: 0.3 },
                ]}
                onPress={() => !isFuture && onSelect(pickerYear, pickerMonth, d)}
                disabled={isFuture}
                activeOpacity={0.7}
              >
                <Text style={[pickerStyles.dayText, { color: isSelected ? "#fff" : colors.text }]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
      <View style={[pickerStyles.yearRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} style={pickerStyles.chevronBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[pickerStyles.yearLabel, { color: colors.text }]}>{pickerYear}년</Text>
        <TouchableOpacity
          onPress={() => setPickerYear((y) => y + 1)}
          style={pickerStyles.chevronBtn}
          disabled={!canGoNextYear}
        >
          <Ionicons name="chevron-forward" size={20} color={canGoNextYear ? colors.text : colors.border} />
        </TouchableOpacity>
      </View>
      <View style={pickerStyles.monthGrid}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isFuture = pickerYear === CUR_YEAR && m > CUR_MONTH;
          const isSelected = pickerYear === selectedYear && m === selectedMonth;
          return (
            <TouchableOpacity
              key={m}
              style={[
                pickerStyles.monthCell,
                isSelected && { backgroundColor: colors.tint, borderRadius: 10 },
                isFuture && { opacity: 0.3 },
              ]}
              onPress={() => !isFuture && setPickerMonth(m)}
              disabled={isFuture}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.monthText, { color: isSelected ? "#fff" : colors.text }]}>
                {m}월
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { paddingBottom: 8 },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chevronBtn: { padding: 6, minWidth: 32, alignItems: "center" },
  yearLabel: { fontSize: 16, fontWeight: "700" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  monthCell: { width: "25%", alignItems: "center", paddingVertical: 11 },
  monthText: { fontSize: 15, fontWeight: "500" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  dayCell: { width: "14.28%", alignItems: "center", paddingVertical: 9 },
  dayText: { fontSize: 14, fontWeight: "500" },
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Album Form Modal ─────────────────────────────────────────────────────────
type AlbumFormModalProps = {
  visible: boolean;
  editing: Album | null;
  onClose: () => void;
  onSave: (data: { babyName: string; albumName: string; birthYear: number; birthMonth: number; birthDay: number }) => void;
  colors: (typeof Colors)["light"];
  isDark: boolean;
};

function AlbumFormModal({ visible, editing, onClose, onSave, colors, isDark }: AlbumFormModalProps) {
  const [babyName, setBabyName] = useState(editing?.babyName ?? "");
  const [albumName, setAlbumName] = useState(editing?.albumName ?? "");
  const [birthYear, setBirthYear] = useState<number | null>(editing?.birthYear ?? null);
  const [birthMonth, setBirthMonth] = useState<number | null>(editing?.birthMonth ?? null);
  const [birthDay, setBirthDay] = useState<number | null>(editing?.birthDay ?? null);
  const [showPicker, setShowPicker] = useState(false);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setBabyName(editing?.babyName ?? "");
      setAlbumName(editing?.albumName ?? "");
      setBirthYear(editing?.birthYear ?? null);
      setBirthMonth(editing?.birthMonth ?? null);
      setBirthDay(editing?.birthDay ?? null);
      setShowPicker(false);
    }
  }, [visible]);

  const isValid = babyName.trim().length > 0 && !!birthYear && !!birthMonth && !!birthDay;
  const birthLabel = birthYear && birthMonth && birthDay
    ? `${birthYear}년 ${birthMonth}월 ${birthDay}일`
    : "생년월일 선택";

  const inputStyle = [
    styles.input,
    { color: colors.text, backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor: colors.border },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.modalCancel, { color: colors.subtext }]}>취소</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editing ? "앨범 편집" : "새 앨범 추가"}
            </Text>
            <TouchableOpacity
              onPress={() => isValid && onSave({ babyName: babyName.trim(), albumName: albumName.trim() || `${babyName.trim()}의 앨범`, birthYear: birthYear!, birthMonth: birthMonth!, birthDay: birthDay! })}
              disabled={!isValid}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.modalSave, { color: isValid ? colors.tint : colors.border }]}>
                {editing ? "저장" : "추가"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: colors.subtext }]}>아기 이름 *</Text>
                  <TextInput style={inputStyle} value={babyName} onChangeText={setBabyName} placeholder="이름을 입력해주세요" placeholderTextColor={colors.subtext} returnKeyType="next" />
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: colors.subtext }]}>앨범 이름</Text>
                  <TextInput style={inputStyle} value={albumName} onChangeText={setAlbumName} placeholder={babyName.trim() ? `${babyName.trim()}의 앨범` : "비우면 자동 생성됩니다"} placeholderTextColor={colors.subtext} returnKeyType="done" />
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.dateTriggerRow} onPress={() => setShowPicker((v) => !v)} activeOpacity={0.7}>
                  <Text style={[styles.inputLabel, { color: colors.subtext }]}>생년월일 *</Text>
                  <View style={styles.dateTriggerRight}>
                    <Text style={[styles.dateTriggerValue, { color: birthYear && birthMonth && birthDay ? colors.text : colors.subtext }]}>{birthLabel}</Text>
                    <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.subtext} />
                  </View>
                </TouchableOpacity>
                {showPicker && (
                  <View style={[styles.pickerWrapper, { borderTopColor: colors.border }]}>
                    <DatePicker
                      selectedYear={birthYear}
                      selectedMonth={birthMonth}
                      selectedDay={birthDay}
                      onSelect={(y, m, d) => { setBirthYear(y); setBirthMonth(m); setBirthDay(d); setShowPicker(false); }}
                      colors={colors}
                    />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Invite Modal ─────────────────────────────────────────────────────────────
type InviteModalProps = {
  visible: boolean;
  albumName: string;
  onClose: () => void;
  onInvite: (name: string, role: MemberRole) => void;
  colors: (typeof Colors)["light"];
  isDark: boolean;
};

function InviteModal({ visible, albumName, onClose, onInvite, colors, isDark }: InviteModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("member");

  React.useEffect(() => {
    if (visible) { setName(""); setRole("member"); }
  }, [visible]);

  const isValid = name.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.modalCancel, { color: colors.subtext }]}>취소</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>멤버 초대</Text>
            <TouchableOpacity
              onPress={() => isValid && onInvite(name.trim(), role)}
              disabled={!isValid}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.modalSave, { color: isValid ? colors.tint : colors.border }]}>초대</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text style={[styles.inviteAlbumLabel, { color: colors.subtext }]}>
                {albumName}에 초대합니다
              </Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: colors.subtext }]}>이름</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor: colors.border }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="초대할 멤버 이름"
                    placeholderTextColor={colors.subtext}
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
              </View>

              {/* Role picker */}
              <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 20 }]}>역할</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {(["admin", "member"] as MemberRole[]).map((r, idx) => (
                  <React.Fragment key={r}>
                    <TouchableOpacity
                      style={styles.roleRow}
                      onPress={() => setRole(r)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.roleInfo}>
                        <Text style={[styles.roleName, { color: colors.text }]}>
                          {r === "admin" ? "관리자" : "일반 멤버"}
                        </Text>
                        <Text style={[styles.roleDesc, { color: colors.subtext }]}>
                          {r === "admin"
                            ? "멤버 초대·삭제, 앨범 편집 가능"
                            : "사진 업로드 및 댓글 작성 가능"}
                        </Text>
                      </View>
                      <View style={[styles.radioOuter, { borderColor: role === r ? colors.tint : colors.border }]}>
                        {role === r && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
                      </View>
                    </TouchableOpacity>
                    {idx === 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 16 }]} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const { session, clearSession, switchAlbum } = useAuth();
  const { addNotification } = useAlbums();

  // ─── 앨범 목록 (API) ─────────────────────────────────────────────────────────
  const [apiAlbums, setApiAlbums] = useState<ApiAlbum[]>([]);
  const [editingApiAlbum, setEditingApiAlbum] = useState<ApiAlbum | null>(null);
  const [albumFormVisible, setAlbumFormVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const fetchAlbums = useCallback(async () => {
    if (!session) return;
    try {
      const albums = await getAlbums(session.token);
      setApiAlbums(albums);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearSession();
    }
  }, [session]);

  // ─── 멤버 목록 (API) ─────────────────────────────────────────────────────────
  const [apiMembers, setApiMembers] = useState<ApiMember[]>([]);

  const fetchMembers = useCallback(() => {
    if (!session) return;
    getMembers(session.albumId, session.token)
      .then(setApiMembers)
      .catch(() => {});
  }, [session]);

  useFocusEffect(useCallback(() => {
    fetchAlbums();
    fetchMembers();
  }, [fetchAlbums, fetchMembers]));

  // Role change confirmation
  type PendingRoleChange = { memberId: number; memberName: string; newRole: MemberRole };
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  // ApiAlbum → AlbumFormModal용 Album 타입 변환 (birth_date는 ISO string으로 옴)
  function apiAlbumToForm(a: ApiAlbum): Album {
    // birth_date는 'YYYY-MM-DD' 형식으로 옴 (timezone 이슈 방지를 위해 직접 파싱)
    const [year, month, day] = a.birth_date.slice(0, 10).split('-').map(Number);
    return {
      id: String(a.id), albumName: a.name, babyName: a.baby_name, color: a.color, members: [],
      birthYear: year, birthMonth: month, birthDay: day,
    };
  }

  const openAddAlbum = () => { setEditingApiAlbum(null); setAlbumFormVisible(true); };
  const openEditAlbum = (a: ApiAlbum) => { setEditingApiAlbum(a); setAlbumFormVisible(true); };

  const handleAlbumSave = async (data: { babyName: string; albumName: string; birthYear: number; birthMonth: number; birthDay: number }) => {
    if (!session) return;
    const birthDate = `${data.birthYear}-${String(data.birthMonth).padStart(2, '0')}-${String(data.birthDay).padStart(2, '0')}`;
    try {
      if (editingApiAlbum) {
        await updateAlbumApi(editingApiAlbum.id, session.token, { name: data.albumName || `${data.babyName}의 앨범`, babyName: data.babyName, birthDate });
      } else {
        await createAlbum(session.token, { name: data.albumName || `${data.babyName}의 앨범`, babyName: data.babyName, birthDate, color: ALBUM_COLORS[apiAlbums.length % ALBUM_COLORS.length] });
      }
      await fetchAlbums();
      setAlbumFormVisible(false);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했습니다");
    }
  };

  const handleDeleteAlbum = (albumId: number) => {
    if (!session) return;
    Alert.alert("앨범 삭제", "이 앨범을 삭제하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () =>
        deleteAlbumApi(albumId, session.token)
          .then(fetchAlbums)
          .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했습니다")),
      },
    ]);
  };

  const handleRemoveMember = (memberId: number, name: string) => {
    if (!session) return;
    Alert.alert("멤버 삭제", `${name}님을 앨범에서 제거할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "제거", style: "destructive",
        onPress: () => {
          removeMember(session.albumId, memberId, session.token)
            .then(fetchMembers)
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "제거에 실패했습니다"));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Albums ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>앨범</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {apiAlbums.length === 0 ? (
              <View style={styles.albumRow}>
                <Text style={[styles.albumName, { color: colors.subtext }]}>앨범을 불러오는 중...</Text>
              </View>
            ) : apiAlbums.map((album, idx) => {
              const [y, m, d] = album.birth_date.slice(0, 10).split('-').map(Number);
              const isCurrent = album.id === session?.albumId;
              return (
                <React.Fragment key={album.id}>
                  <View style={styles.albumRow}>
                    <View style={[styles.albumAvatar, { backgroundColor: album.color }]}>
                      <Text style={styles.albumAvatarInitial}>{album.baby_name[0]}</Text>
                    </View>
                    <View style={styles.albumInfo}>
                      <View style={styles.albumNameRow}>
                        <Text style={[styles.albumName, { color: colors.text }]}>{album.name}</Text>
                        {isCurrent && (
                          <View style={[styles.activeBadge, { backgroundColor: colors.tint }]}>
                            <Text style={styles.activeBadgeText}>현재</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.albumMeta, { color: colors.subtext }]}>
                        {album.baby_name} · {y}년 {m}월 {d}일생
                      </Text>
                    </View>
                    {!isCurrent && (
                      <TouchableOpacity
                        style={[styles.switchBtn, { borderColor: colors.tint }]}
                        onPress={() => switchAlbum(album.id, album.baby_name, album.birth_date)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.switchBtnText, { color: colors.tint }]}>선택</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditAlbum(album)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil-outline" size={17} color={colors.subtext} />
                    </TouchableOpacity>
                    {apiAlbums.length > 1 && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteAlbum(album.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={17} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {idx < apiAlbums.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 72 }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.outlineButton, { borderColor: colors.tint }]} onPress={openAddAlbum} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
            <Text style={[styles.outlineButtonText, { color: colors.tint }]}>아기 추가</Text>
          </TouchableOpacity>
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <View style={styles.memberSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.subtext, marginBottom: 0 }]}>함께하는 멤버</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {apiMembers.length === 0 ? (
              <View style={styles.memberRow}>
                <Text style={[styles.memberName, { color: colors.subtext }]}>멤버를 불러오는 중...</Text>
              </View>
            ) : apiMembers.map((member, idx) => {
              const isMe = member.id === session?.userId;
              const color = memberAvatarColor(member.name);
              return (
                <React.Fragment key={member.id}>
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: color }]}>
                      <Text style={styles.memberAvatarInitial}>{member.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                        {isMe && (
                          <View style={[styles.meBadge, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}>
                            <Text style={[styles.meBadgeText, { color: colors.subtext }]}>나</Text>
                          </View>
                        )}
                      </View>
                      {!member.is_creator ? (
                        <TouchableOpacity
                          onPress={() => {
                            if (isMe) return;
                            const newRole: MemberRole = member.role === "admin" ? "member" : "admin";
                            setPendingRoleChange({ memberId: member.id, memberName: member.name, newRole });
                          }}
                          disabled={isMe}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <View style={styles.roleChipRow}>
                            <Text style={[styles.roleBadge, { color: member.role === "admin" ? colors.tint : colors.subtext }]}>
                              {member.role === "admin" ? "관리자" : "일반 멤버"}
                            </Text>
                            {!isMe && <Ionicons name="chevron-down" size={11} color={colors.subtext} />}
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.roleBadge, { color: colors.tint }]}>관리자 (생성자)</Text>
                      )}
                    </View>
                    {!isMe && !member.is_creator && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleRemoveMember(member.id, member.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="person-remove-outline" size={17} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {idx < apiMembers.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 68 }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.outlineButton, { borderColor: colors.tint }]} onPress={() => setInviteVisible(true)} activeOpacity={0.75}>
            <Ionicons name="person-add-outline" size={18} color={colors.tint} />
            <Text style={[styles.outlineButtonText, { color: colors.tint }]}>멤버 초대하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Album form modal */}
      <AlbumFormModal
        visible={albumFormVisible}
        editing={editingApiAlbum ? apiAlbumToForm(editingApiAlbum) : null}
        onClose={() => setAlbumFormVisible(false)}
        onSave={handleAlbumSave}
        colors={colors}
        isDark={isDark}
      />

      {/* Role change confirmation modal */}
      <Modal
        visible={pendingRoleChange !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingRoleChange(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>역할 변경</Text>
            <Text style={[styles.confirmMessage, { color: colors.subtext }]}>
              {pendingRoleChange?.memberName}님의 역할을{"\n"}
              <Text style={{ color: colors.tint, fontWeight: "700" }}>
                {pendingRoleChange?.newRole === "admin" ? "관리자" : "일반 멤버"}
              </Text>
              {" "}로 변경할까요?
            </Text>
            <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => setPendingRoleChange(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: colors.subtext }]}>취소</Text>
              </TouchableOpacity>
              <View style={[styles.confirmBtnDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.7}
                onPress={() => {
                  if (!pendingRoleChange || !session) return;
                  updateMemberRoleApi(session.albumId, pendingRoleChange.memberId, pendingRoleChange.newRole, session.token)
                    .then(() => {
                      const me = apiMembers.find((m) => m.id === session.userId);
                      addNotification({
                        albumId: String(session.albumId),
                        type: "role_change",
                        actorName: me?.name ?? session.nickname,
                        actorInitial: (me?.name ?? session.nickname).charAt(0),
                        actorAvatarColor: memberAvatarColor(me?.name ?? session.nickname),
                        targetMemberName: pendingRoleChange.memberName,
                        newRole: pendingRoleChange.newRole,
                        timestamp: Date.now(),
                      });
                      fetchMembers();
                    })
                    .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "역할 변경에 실패했습니다"));
                  setPendingRoleChange(null);
                }}
              >
                <Text style={[styles.confirmBtnText, { color: colors.tint, fontWeight: "700" }]}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite modal */}
      <InviteModal
        visible={inviteVisible}
        albumName={apiAlbums.find((a) => a.id === session?.albumId)?.name ?? '앨범'}
        onClose={() => setInviteVisible(false)}
        onInvite={() => setInviteVisible(false)}
        colors={colors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: "700" },

  section: { paddingTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: "600", letterSpacing: 0.8,
    textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4,
  },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  // Album rows
  albumRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  albumRowActive: {},
  albumAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  albumAvatarInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  albumInfo: { flex: 1, gap: 3 },
  albumNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  albumName: { fontSize: 15, fontWeight: "600" },
  activeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  activeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  albumMeta: { fontSize: 13 },
  iconBtn: { padding: 4 },
  switchBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginRight: 4 },
  switchBtnText: { fontSize: 12, fontWeight: '600' },

  // Outline buttons
  outlineButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 12 },
  outlineButtonText: { fontSize: 15, fontWeight: "600" },

  // Members section
  memberSectionHeader: { marginBottom: 10 },
  memberAlbumTabs: { paddingHorizontal: 4, gap: 0, marginTop: 8 },
  memberAlbumTab: { paddingHorizontal: 4, paddingVertical: 6, marginRight: 16 },
  memberAlbumTabText: { fontSize: 13, fontWeight: "600" },
  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  memberAvatarInitial: { color: "#fff", fontSize: 17, fontWeight: "700" },
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  memberName: { fontSize: 15, fontWeight: "500" },
  meBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  meBadgeText: { fontSize: 12, fontWeight: "500" },
  roleChipRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  roleBadge: { fontSize: 12, fontWeight: "500" },

  // Modal shared
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },

  // Form inputs
  inputRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  inputLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  input: { fontSize: 16, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  dateTriggerRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  dateTriggerRight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateTriggerValue: { fontSize: 16, fontWeight: "500" },
  pickerWrapper: { borderTopWidth: StyleSheet.hairlineWidth },

  // Invite modal
  inviteAlbumLabel: { fontSize: 13, marginBottom: 10, paddingHorizontal: 4 },
  roleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  roleInfo: { flex: 1, gap: 3 },
  roleName: { fontSize: 15, fontWeight: "600" },
  roleDesc: { fontSize: 13 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioInner: { width: 11, height: 11, borderRadius: 5.5 },

  // Role change confirmation
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  confirmBox: { width: "100%", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  confirmTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 20, paddingHorizontal: 20 },
  confirmMessage: { fontSize: 15, textAlign: "center", paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20, lineHeight: 22 },
  confirmDivider: { height: StyleSheet.hairlineWidth },
  confirmButtons: { flexDirection: "row" },
  confirmBtn: { flex: 1, paddingVertical: 16, alignItems: "center" },
  confirmBtnText: { fontSize: 16 },
  confirmBtnDivider: { width: StyleSheet.hairlineWidth },
});
