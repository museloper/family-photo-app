import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ApiComment,
  ApiError,
  ApiPhoto,
  FILE_BASE,
  addComment,
  getComments,
  getPublicPhotos,
  toggleLike,
} from '@/services/api';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - CARD_GAP * 3) / 2;
const CARD_PHOTO_HEIGHT = CARD_WIDTH * 0.85;

const AVATAR_COLORS = ['#FF6B8A', '#6B8AFF', '#6BC97A', '#FFB347', '#A78BFA', '#00CEC9'];

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
  return `${Math.floor(days / 30)}개월 전`;
}

type Comment = {
  id: string;
  userId: number;
  user: string;
  text: string;
  replies: Comment[];
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { session, clearSession } = useAuth();

  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ApiPhoto | null>(null);
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState('');

  const fetchPhotos = useCallback(() => {
    if (!session) return;
    setLoading(true);
    getPublicPhotos(session.albumId, session.token)
      .then((data) => setPhotos(data.photos ?? []))
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearSession();
      })
      .finally(() => setLoading(false));
  }, [session]);

  useFocusEffect(fetchPhotos);

  // 모달 열릴 때 댓글 로드
  useEffect(() => {
    if (!selectedPhoto || !session) return;
    getComments(String(selectedPhoto.id), session.token)
      .then((data: ApiComment[]) => {
        const mapped: Comment[] = data.map((c) => ({
          id: String(c.id),
          userId: c.user_id,
          user: c.user_name,
          text: c.body,
          replies: (c.replies ?? []).map((r) => ({
            id: String(r.id),
            userId: r.user_id,
            user: r.user_name,
            text: r.body,
            replies: [],
          })),
        }));
        setAllComments((prev) => ({ ...prev, [selectedPhoto.id]: mapped }));
      })
      .catch(() => {});
  }, [selectedPhoto?.id]);

  const handleToggleLike = async (photo: ApiPhoto) => {
    if (!session) return;
    setPhotos((prev) => prev.map((p) =>
      p.id === photo.id
        ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
        : p
    ));
    try {
      await toggleLike(String(photo.id), session.token);
    } catch {
      setPhotos((prev) => prev.map((p) =>
        p.id === photo.id
          ? { ...p, liked_by_me: photo.liked_by_me, like_count: photo.like_count }
          : p
      ));
    }
  };

  const submitComment = async () => {
    if (!selectedPhoto || !commentInput.trim() || !session) return;
    const text = commentInput.trim();
    setCommentInput('');
    try {
      const saved = await addComment(String(selectedPhoto.id), session.token, text);
      const newEntry: Comment = {
        id: String(saved.id),
        userId: saved.user_id,
        user: saved.user_name,
        text: saved.body,
        replies: [],
      };
      setAllComments((prev) => ({
        ...prev,
        [selectedPhoto.id]: [...(prev[selectedPhoto.id] ?? []), newEntry],
      }));
    } catch {
      setCommentInput(text);
    }
  };

  const currentPhoto = selectedPhoto ? (photos.find((p) => p.id === selectedPhoto.id) ?? selectedPhoto) : null;
  const photoComments = selectedPhoto ? (allComments[selectedPhoto.id] ?? []) : [];
  const totalCommentCount = photoComments.reduce((s, c) => s + 1 + c.replies.length, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>둘러보기</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>공개된 사진을 모아볼 수 있어요</Text>
      </View>

      {loading && photos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="images-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>공개된 사진이 없어요</Text>
          <Text style={[styles.emptyDesc, { color: colors.subtext }]}>
            사진의 공개 범위를 '전체 공개'로 설정하면 여기에 표시됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: CARD_GAP }}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const url = FILE_BASE + (item.medium_url ?? item.original_url);
            const color = avatarColor(item.uploader_name ?? '?');
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.88}
                onPress={() => setSelectedPhoto(item)}
              >
                <View style={styles.photo}>
                  <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {item.mime_type?.startsWith('video') && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={11} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <View style={[styles.smallAvatar, { backgroundColor: color }]}>
                    <Text style={styles.smallAvatarInitial}>{(item.uploader_name ?? '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {item.uploader_name}
                    </Text>
                    <Text style={[styles.timeAgo, { color: colors.subtext }]}>
                      {timeAgo(item.taken_at ?? item.uploaded_at)}
                    </Text>
                  </View>
                  <View style={styles.likePreview}>
                    <Ionicons
                      name={item.liked_by_me ? 'heart' : 'heart-outline'}
                      size={13}
                      color={item.liked_by_me ? '#FF6B8A' : colors.subtext}
                    />
                    <Text style={[styles.likePreviewCount, { color: colors.subtext }]}>
                      {item.like_count ?? 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 사진 상세 모달 */}
      <Modal
        visible={!!selectedPhoto}
        animationType="slide"
        onRequestClose={() => { setSelectedPhoto(null); setCommentInput(''); }}
      >
        {selectedPhoto && currentPhoto && (
          <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.modalAvatar, { backgroundColor: avatarColor(selectedPhoto.uploader_name ?? '?') }]}>
                <Text style={styles.modalAvatarInitial}>{(selectedPhoto.uploader_name ?? '?').charAt(0)}</Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedPhoto.uploader_name}</Text>
                <Text style={[styles.modalTimeAgo, { color: colors.subtext }]}>
                  {selectedPhoto.taken_at
                    ? new Date(selectedPhoto.taken_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                    : timeAgo(selectedPhoto.uploaded_at)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedPhoto(null); setCommentInput(''); }} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalPhoto}>
                  <Image
                    source={{ uri: FILE_BASE + (selectedPhoto.medium_url ?? selectedPhoto.original_url) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  {selectedPhoto.mime_type?.startsWith('video') && (
                    <View style={styles.modalVideoBadge}>
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.modalVideoText}>동영상</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.actions, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleLike(currentPhoto)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={currentPhoto.liked_by_me ? 'heart' : 'heart-outline'}
                      size={26}
                      color={currentPhoto.liked_by_me ? '#FF6B8A' : colors.text}
                    />
                    <Text style={[styles.actionCount, { color: colors.text }]}>{currentPhoto.like_count ?? 0}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                    <Text style={[styles.actionCount, { color: colors.text }]}>{totalCommentCount}</Text>
                  </View>
                </View>

                <View style={styles.commentsSection}>
                  {photoComments.length === 0 ? (
                    <Text style={[styles.noComments, { color: colors.subtext }]}>첫 댓글을 남겨보세요</Text>
                  ) : (
                    photoComments.map((c) => (
                      <View key={c.id}>
                        <View style={styles.commentRow}>
                          <View style={[styles.commentAvatar, { backgroundColor: avatarColor(c.user) }]}>
                            <Text style={styles.commentAvatarInitial}>{c.user.charAt(0)}</Text>
                          </View>
                          <View style={styles.commentBody}>
                            <Text style={[styles.commentUser, { color: colors.text }]}>{c.user}</Text>
                            <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                          </View>
                        </View>
                        {c.replies.map((r) => (
                          <View key={r.id} style={styles.replyRow}>
                            <View style={styles.replyIndent} />
                            <View style={[styles.replyAvatar, { backgroundColor: avatarColor(r.user) }]}>
                              <Text style={styles.replyAvatarInitial}>{r.user.charAt(0)}</Text>
                            </View>
                            <View style={styles.commentBody}>
                              <Text style={[styles.commentUser, { color: colors.text }]}>{r.user}</Text>
                              <Text style={[styles.commentText, { color: colors.text }]}>{r.text}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.commentInput,
                    { backgroundColor: isDark ? colors.card : '#F5F5F5', color: colors.text, borderColor: colors.border },
                  ]}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="댓글 추가..."
                  placeholderTextColor={colors.subtext}
                  returnKeyType="send"
                  onSubmitEditing={submitComment}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: commentInput.trim() ? colors.tint : colors.border }]}
                  onPress={submitComment}
                  activeOpacity={0.8}
                  disabled={!commentInput.trim()}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  headerSub: { fontSize: 13 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  grid: { padding: CARD_GAP, paddingBottom: 24 },
  card: { width: CARD_WIDTH, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  photo: { width: CARD_WIDTH, height: CARD_PHOTO_HEIGHT, backgroundColor: '#E0E0E0', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 7 },
  videoBadge: { backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 4, padding: 4 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  smallAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardText: { flex: 1, gap: 1 },
  userName: { fontSize: 12, fontWeight: '600' },
  timeAgo: { fontSize: 11 },
  likePreview: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likePreviewCount: { fontSize: 11 },

  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  modalAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalAvatarInitial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalUserInfo: { flex: 1 },
  modalUserName: { fontSize: 15, fontWeight: '600' },
  modalTimeAgo: { fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 4 },
  modalPhoto: { width, height: width, backgroundColor: '#E0E0E0', overflow: 'hidden' },
  modalVideoBadge: {
    position: 'absolute', alignSelf: 'center' as const, top: width / 2 - 18,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  modalVideoText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 15, fontWeight: '500' },
  commentsSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, gap: 16 },
  noComments: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  commentAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentBody: { flex: 1, gap: 2 },
  commentUser: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 14, lineHeight: 20 },
  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  replyIndent: { width: 20 },
  replyAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  replyAvatarInitial: { color: '#fff', fontSize: 10, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  commentInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: 14, borderWidth: StyleSheet.hairlineWidth },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
