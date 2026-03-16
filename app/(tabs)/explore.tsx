import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
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
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - CARD_GAP * 3) / 2;
const CARD_PHOTO_HEIGHT = CARD_WIDTH * 0.85;

type Post = {
  id: string;
  color: string;
  user: string;
  initial: string;
  avatarColor: string;
  timeAgo: string;
  isVideo: boolean;
};

type Comment = {
  id: string;
  user: string;
  initial: string;
  avatarColor: string;
  text: string;
};

const PUBLIC_POSTS: Post[] = [
  { id: '1',  color: '#FFB3C6', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '2시간 전',  isVideo: false },
  { id: '2',  color: '#B5D8F7', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '어제',      isVideo: false },
  { id: '3',  color: '#B5EAD7', user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '3일 전',    isVideo: true  },
  { id: '4',  color: '#C7B9FF', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '4일 전',    isVideo: false },
  { id: '5',  color: '#FFDAC1', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '1주 전',    isVideo: false },
  { id: '6',  color: '#E2F0CB', user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '1주 전',    isVideo: false },
  { id: '7',  color: '#FFC9A0', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '2주 전',    isVideo: true  },
  { id: '8',  color: '#FFEAA7', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '3주 전',    isVideo: false },
  { id: '9',  color: '#DDA0DD', user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '1개월 전',  isVideo: false },
  { id: '10', color: '#FFB3BA', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '1개월 전',  isVideo: false },
];

const INITIAL_LIKES: Record<string, number> = {
  '1': 5, '2': 3, '3': 8, '4': 2, '5': 1,
  '6': 4, '7': 7, '8': 0, '9': 3, '10': 6,
};

const SEED_COMMENTS: Record<string, Comment[]> = {
  '1': [
    { id: 'c1', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', text: '너무 예뻐요! 🥰' },
    { id: 'c2', user: '라이언',   initial: '라', avatarColor: '#6BC97A', text: '귀엽네요 ☺️' },
  ],
  '3': [
    { id: 'c1', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', text: '동영상이네요 👍' },
  ],
  '7': [
    { id: 'c1', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', text: '와! 잘 찍었다' },
    { id: 'c2', user: '라이언',   initial: '라', avatarColor: '#6BC97A', text: '부럽다 ㅎㅎ' },
    { id: 'c3', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', text: '좋아요 눌렀어요 ❤️' },
  ],
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(INITIAL_LIKES);
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>(SEED_COMMENTS);
  const [commentInput, setCommentInput] = useState('');

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      const liked = next.has(postId);
      liked ? next.delete(postId) : next.add(postId);
      setLikeCounts((c) => ({ ...c, [postId]: (c[postId] ?? 0) + (liked ? -1 : 1) }));
      return next;
    });
  };

  const submitComment = () => {
    if (!selectedPost || !commentInput.trim()) return;
    const newComment: Comment = {
      id: `u-${Date.now()}`,
      user: '나',
      initial: '나',
      avatarColor: '#FF6B8A',
      text: commentInput.trim(),
    };
    setAllComments((prev) => ({
      ...prev,
      [selectedPost.id]: [...(prev[selectedPost.id] ?? []), newComment],
    }));
    setCommentInput('');
  };

  const postComments = selectedPost ? (allComments[selectedPost.id] ?? []) : [];
  const isLiked = selectedPost ? likedPosts.has(selectedPost.id) : false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>둘러보기</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>공개된 사진을 모아볼 수 있어요</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={PUBLIC_POSTS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: CARD_GAP }}
        ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.88}
            onPress={() => setSelectedPost(item)}
          >
            <View style={[styles.photo, { backgroundColor: item.color }]}>
              {item.isVideo && (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={11} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.cardInfo}>
              <View style={[styles.smallAvatar, { backgroundColor: item.avatarColor }]}>
                <Text style={styles.smallAvatarInitial}>{item.initial}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.user}</Text>
                <Text style={[styles.timeAgo, { color: colors.subtext }]}>{item.timeAgo}</Text>
              </View>
              <View style={styles.likePreview}>
                <Ionicons
                  name={likedPosts.has(item.id) ? 'heart' : 'heart-outline'}
                  size={13}
                  color={likedPosts.has(item.id) ? '#FF6B8A' : colors.subtext}
                />
                <Text style={[styles.likePreviewCount, { color: colors.subtext }]}>
                  {likeCounts[item.id] ?? 0}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Photo detail modal */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
      >
        {selectedPost && (
          <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.modalAvatar, { backgroundColor: selectedPost.avatarColor }]}>
                <Text style={styles.modalAvatarInitial}>{selectedPost.initial}</Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedPost.user}</Text>
                <Text style={[styles.modalTimeAgo, { color: colors.subtext }]}>{selectedPost.timeAgo}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPost(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo */}
                <View style={[styles.modalPhoto, { backgroundColor: selectedPost.color }]}>
                  {selectedPost.isVideo && (
                    <View style={styles.modalVideoBadge}>
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.modalVideoText}>동영상</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={[styles.actions, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => toggleLike(selectedPost.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={26}
                      color={isLiked ? '#FF6B8A' : colors.text}
                    />
                    <Text style={[styles.actionCount, { color: colors.text }]}>
                      {likeCounts[selectedPost.id] ?? 0}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                    <Text style={[styles.actionCount, { color: colors.text }]}>
                      {postComments.length}
                    </Text>
                  </View>
                </View>

                {/* Comments */}
                <View style={styles.commentsSection}>
                  {postComments.length === 0 ? (
                    <Text style={[styles.noComments, { color: colors.subtext }]}>
                      첫 댓글을 남겨보세요
                    </Text>
                  ) : (
                    postComments.map((c) => (
                      <View key={c.id} style={styles.commentRow}>
                        <View style={[styles.commentAvatar, { backgroundColor: c.avatarColor }]}>
                          <Text style={styles.commentAvatarInitial}>{c.initial}</Text>
                        </View>
                        <View style={styles.commentBody}>
                          <Text style={[styles.commentUser, { color: colors.text }]}>{c.user}</Text>
                          <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Comment input */}
              <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: isDark ? colors.card : '#F5F5F5',
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="댓글 추가..."
                  placeholderTextColor={colors.subtext}
                  returnKeyType="send"
                  onSubmitEditing={submitComment}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    { backgroundColor: commentInput.trim() ? colors.tint : colors.border },
                  ]}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  headerSub: { fontSize: 13 },
  grid: { padding: CARD_GAP, paddingBottom: 24 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: CARD_WIDTH,
    height: CARD_PHOTO_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 7,
  },
  videoBadge: { backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 4, padding: 4 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  smallAvatar: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  smallAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardText: { flex: 1, gap: 1 },
  userName: { fontSize: 12, fontWeight: '600' },
  timeAgo: { fontSize: 11 },
  likePreview: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likePreviewCount: { fontSize: 11 },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarInitial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalUserInfo: { flex: 1 },
  modalUserName: { fontSize: 15, fontWeight: '600' },
  modalTimeAgo: { fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 4 },
  modalPhoto: { width, height: width },
  modalVideoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -36 }, { translateY: -18 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalVideoText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 15, fontWeight: '500' },
  commentsSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, gap: 16 },
  noComments: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    marginTop: 2,
  },
  commentAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentBody: { flex: 1, gap: 2 },
  commentUser: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 14, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
});
