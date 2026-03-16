import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAlbums } from '@/contexts/AlbumContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = Math.floor((width - 2) / 3);
const MONTH_ITEM_WIDTH = 56;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TIMELINE = (() => {
  const items: Array<{ year: number; month: number }> = [];
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  for (let y = curYear; y >= curYear - 4; y--) {
    const maxM = y === curYear ? curMonth : 12;
    for (let m = maxM; m >= 1; m--) {
      items.push({ year: y, month: m });
    }
  }
  return items;
})();

const UNIQUE_YEARS = [...new Set(TIMELINE.map((t) => t.year))];

type MockPhoto = {
  id: string;
  year: number;
  month: number;
  color: string;
  isVideo: boolean;
  user: string;
  initial: string;
  avatarColor: string;
  timeAgo: string;
};

const MOCK_PHOTOS: MockPhoto[] = [
  { id: '1',  year: 2026, month: 3,  color: '#FFB3C6', isVideo: false, user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '오늘' },
  { id: '2',  year: 2026, month: 3,  color: '#FFC9A0', isVideo: false, user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '오늘' },
  { id: '3',  year: 2026, month: 3,  color: '#B5EAD7', isVideo: true,  user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '오늘' },
  { id: '4',  year: 2026, month: 3,  color: '#C7B9FF', isVideo: false, user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '어제' },
  { id: '5',  year: 2026, month: 3,  color: '#FFDAC1', isVideo: false, user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '어제' },
  { id: '6',  year: 2026, month: 3,  color: '#E2F0CB', isVideo: false, user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '3일 전' },
  { id: '7',  year: 2026, month: 3,  color: '#B5D8F7', isVideo: false, user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '3일 전' },
  { id: '8',  year: 2026, month: 3,  color: '#FFDAC1', isVideo: true,  user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '1주 전' },
  { id: '9',  year: 2026, month: 3,  color: '#FFB3C6', isVideo: false, user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '1주 전' },
  { id: '10', year: 2026, month: 2,  color: '#B5EAD7', isVideo: false, user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '4주 전' },
  { id: '11', year: 2026, month: 2,  color: '#C7B9FF', isVideo: false, user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', timeAgo: '4주 전' },
  { id: '12', year: 2025, month: 12, color: '#FFB3C6', isVideo: false, user: '라이언',   initial: '라', avatarColor: '#6BC97A', timeAgo: '3개월 전' },
  { id: '13', year: 2025, month: 11, color: '#FFC9A0', isVideo: false, user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', timeAgo: '4개월 전' },
];

type Reply = {
  id: string;
  user: string;
  initial: string;
  avatarColor: string;
  text: string;
  likes: number;
  likedByMe: boolean;
};

type Comment = {
  id: string;
  user: string;
  initial: string;
  avatarColor: string;
  text: string;
  likes: number;
  likedByMe: boolean;
  replies: Reply[];
};

const INITIAL_PHOTO_LIKES: Record<string, number> = {
  '1': 5, '2': 3, '3': 8, '4': 2, '5': 0,
  '6': 4, '7': 1, '8': 7, '9': 2, '10': 3,
  '11': 1, '12': 6, '13': 2,
};

const SEED_COMMENTS: Record<string, Comment[]> = {
  '1': [
    {
      id: 'c1', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF',
      text: '너무 예뻐요! 🥰', likes: 2, likedByMe: false,
      replies: [
        { id: 'r1', user: '라이언', initial: '라', avatarColor: '#6BC97A', text: '진짜요 ❤️', likes: 1, likedByMe: false },
      ],
    },
    {
      id: 'c2', user: '라이언', initial: '라', avatarColor: '#6BC97A',
      text: '귀엽네요 ☺️', likes: 1, likedByMe: false, replies: [],
    },
  ],
  '3': [
    {
      id: 'c1', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A',
      text: '동영상이네요 👍', likes: 0, likedByMe: false, replies: [],
    },
  ],
  '8': [
    {
      id: 'c1', user: '라이언', initial: '라', avatarColor: '#6BC97A',
      text: '와 잘 찍었다!', likes: 3, likedByMe: false,
      replies: [
        { id: 'r1', user: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', text: '맞아요 ㅎㅎ', likes: 0, likedByMe: false },
        { id: 'r2', user: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', text: '부럽다 😊', likes: 1, likedByMe: false },
      ],
    },
  ],
};

function getTimeSinceBirth(photoYear: number, photoMonth: number, birthYear: number, birthMonth: number): string {
  const birthTotalMonths = birthYear * 12 + birthMonth;
  const photoTotalMonths = photoYear * 12 + photoMonth;
  const diff = photoTotalMonths - birthTotalMonths;
  if (diff <= 0) return '태어난 달';
  if (diff < 12) return `출생일로부터 ${diff}개월`;
  const years = Math.floor(diff / 12);
  const months = diff % 12;
  return months === 0
    ? `출생일로부터 ${years}년`
    : `출생일로부터 ${years}년 ${months}개월`;
}

export default function AlbumScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { albums, selectedAlbumId, selectedAlbum, setSelectedAlbumId } = useAlbums();
  const BABY_NAME = selectedAlbum.babyName;
  const BABY_BIRTH_YEAR = selectedAlbum.birthYear;
  const BABY_BIRTH_MONTH = selectedAlbum.birthMonth;

  // Timeline
  const timelineRef = useRef<FlatList>(null);
  const yearScrollRef = useRef<ScrollView>(null);
  const yearTabXRef = useRef<Record<number, number>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleYear, setVisibleYear] = useState(TIMELINE[0].year);
  const visibleYearRef = useRef(TIMELINE[0].year);

  const { year: selectedYear, month: selectedMonth } = TIMELINE[selectedIndex];

  const filteredPhotos = MOCK_PHOTOS.filter(
    (p) => p.year === selectedYear && p.month === selectedMonth
  );
  const heroPhoto = filteredPhotos[0] ?? null;
  const restPhotos = filteredPhotos.slice(1);
  const photoRows: MockPhoto[][] = [];
  for (let i = 0; i < restPhotos.length; i += 3) {
    photoRows.push(restPhotos.slice(i, i + 3));
  }

  const selectIndex = (idx: number) => setSelectedIndex(idx);

  const scrollToYear = (year: number) => {
    const idx = TIMELINE.findIndex((item) => item.year === year);
    if (idx !== -1) {
      timelineRef.current?.scrollToIndex({ index: idx, animated: true });
      setSelectedIndex(idx);
      visibleYearRef.current = year;
      setVisibleYear(year);
    }
  };

  const handleMonthScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.floor(e.nativeEvent.contentOffset.x / MONTH_ITEM_WIDTH);
    const year = TIMELINE[Math.min(idx, TIMELINE.length - 1)]?.year;
    if (year && year !== visibleYearRef.current) {
      visibleYearRef.current = year;
      setVisibleYear(year);
    }
  }, []);

  // Sync year tab scroll position when visibleYear changes
  useEffect(() => {
    const x = yearTabXRef.current[visibleYear];
    if (x !== undefined) {
      yearScrollRef.current?.scrollTo({ x: x - width / 2 + 40, animated: true });
    }
  }, [visibleYear]);

  // Modal / interaction state
  const [selectedPhoto, setSelectedPhoto] = useState<MockPhoto | null>(null);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [photoLikeCounts, setPhotoLikeCounts] = useState<Record<string, number>>(INITIAL_PHOTO_LIKES);
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>(SEED_COMMENTS);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);

  const togglePhotoLike = (photoId: string) => {
    setLikedPhotos((prev) => {
      const next = new Set(prev);
      const isLiked = next.has(photoId);
      isLiked ? next.delete(photoId) : next.add(photoId);
      setPhotoLikeCounts((c) => ({ ...c, [photoId]: (c[photoId] ?? 0) + (isLiked ? -1 : 1) }));
      return next;
    });
  };

  const toggleCommentLike = (photoId: string, commentId: string) => {
    setAllComments((prev) => ({
      ...prev,
      [photoId]: (prev[photoId] ?? []).map((c) =>
        c.id === commentId
          ? { ...c, likes: c.likedByMe ? c.likes - 1 : c.likes + 1, likedByMe: !c.likedByMe }
          : c
      ),
    }));
  };

  const toggleReplyLike = (photoId: string, commentId: string, replyId: string) => {
    setAllComments((prev) => ({
      ...prev,
      [photoId]: (prev[photoId] ?? []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId
                  ? { ...r, likes: r.likedByMe ? r.likes - 1 : r.likes + 1, likedByMe: !r.likedByMe }
                  : r
              ),
            }
          : c
      ),
    }));
  };

  const submitComment = () => {
    if (!selectedPhoto || !commentInput.trim()) return;
    const text = commentInput.trim();

    if (replyingTo) {
      const newReply: Reply = {
        id: `r-${Date.now()}`,
        user: '나', initial: '나', avatarColor: '#FF6B8A',
        text, likes: 0, likedByMe: false,
      };
      setAllComments((prev) => ({
        ...prev,
        [selectedPhoto.id]: (prev[selectedPhoto.id] ?? []).map((c) =>
          c.id === replyingTo.commentId ? { ...c, replies: [...c.replies, newReply] } : c
        ),
      }));
      setReplyingTo(null);
    } else {
      const newComment: Comment = {
        id: `c-${Date.now()}`,
        user: '나', initial: '나', avatarColor: '#FF6B8A',
        text, likes: 0, likedByMe: false, replies: [],
      };
      setAllComments((prev) => ({
        ...prev,
        [selectedPhoto.id]: [...(prev[selectedPhoto.id] ?? []), newComment],
      }));
    }
    setCommentInput('');
  };

  const closeModal = () => {
    setSelectedPhoto(null);
    setReplyingTo(null);
    setCommentInput('');
  };

  const photoComments = selectedPhoto ? (allComments[selectedPhoto.id] ?? []) : [];
  const photoIsLiked = selectedPhoto ? likedPhotos.has(selectedPhoto.id) : false;
  const totalCommentCount = photoComments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>우리 가족 앨범</Text>
      </View>

      {/* Album selector — shown when multiple albums exist */}
      {albums.length > 1 && (
        <View style={[styles.albumSelectorContainer, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumSelectorContent}
          >
            {albums.map((album) => {
              const isActive = album.id === selectedAlbumId;
              return (
                <TouchableOpacity
                  key={album.id}
                  onPress={() => setSelectedAlbumId(album.id)}
                  style={[
                    styles.albumChip,
                    isActive
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.albumChipDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : album.color }]} />
                  <Text
                    style={[
                      styles.albumChipText,
                      { color: isActive ? '#fff' : colors.text },
                    ]}
                  >
                    {album.albumName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Year tabs */}
      <View style={[styles.yearContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={yearScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearScrollContent}
        >
          {UNIQUE_YEARS.map((year) => {
            const isActive = visibleYear === year;
            return (
              <TouchableOpacity
                key={year}
                onPress={() => scrollToYear(year)}
                style={styles.yearTab}
                activeOpacity={0.7}
                onLayout={(e) => { yearTabXRef.current[year] = e.nativeEvent.layout.x; }}
              >
                <Text
                  style={[
                    styles.yearText,
                    isActive
                      ? { color: colors.text, fontWeight: '700' }
                      : { color: colors.subtext, fontWeight: '400' },
                  ]}
                >
                  {year}
                </Text>
                <View
                  style={[
                    styles.yearTabBar,
                    { backgroundColor: isActive ? colors.tint : 'transparent' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Month timeline */}
      <View style={[styles.monthContainer, { borderBottomColor: colors.border }]}>
        <FlatList
          ref={timelineRef}
          data={TIMELINE}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          getItemLayout={(_, index) => ({
            length: MONTH_ITEM_WIDTH,
            offset: MONTH_ITEM_WIDTH * index,
            index,
          })}
          scrollEventThrottle={100}
          onScroll={handleMonthScroll}
          renderItem={({ item, index }) => {
            const isSelected = index === selectedIndex;
            const isYearBoundary = index > 0 && item.year !== TIMELINE[index - 1].year;
            return (
              <TouchableOpacity
                onPress={() => selectIndex(index)}
                style={[styles.monthItem, { width: MONTH_ITEM_WIDTH }]}
                activeOpacity={0.7}
              >
                {isYearBoundary ? (
                  <Text style={[styles.yearBoundaryLabel, { color: colors.subtext }]}>
                    {item.year}
                  </Text>
                ) : (
                  <View style={styles.yearBoundarySpace} />
                )}
                <Text
                  style={[
                    styles.monthText,
                    isSelected
                      ? { color: colors.tint, fontWeight: '700' }
                      : { color: colors.subtext },
                  ]}
                >
                  {item.month}월
                </Text>
                <View
                  style={[
                    styles.monthDot,
                    { backgroundColor: isSelected ? colors.tint : 'transparent' },
                  ]}
                />
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Photo Area */}
      {filteredPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={52} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.text }]}>이 달의 사진이 없어요</Text>
          <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
            추가 탭에서 사진을 올려보세요
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Hero */}
          {heroPhoto && (
            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.heroPhoto, { backgroundColor: heroPhoto.color }]}
              onPress={() => setSelectedPhoto(heroPhoto)}
            >
              {heroPhoto.isVideo && (
                <View style={styles.heroVideoBadge}>
                  <Ionicons name="videocam" size={13} color="#fff" />
                  <Text style={styles.heroVideoText}>동영상</Text>
                </View>
              )}
              <View style={styles.heroMonthContainer}>
                <Text style={styles.heroMonthText}>{MONTH_NAMES[selectedMonth - 1]}</Text>
                <Text style={styles.heroYearText}>{selectedYear}</Text>
              </View>
              <View style={styles.heroBabyContainer}>
                <Text style={styles.heroBabyText}>
                  {BABY_NAME}, {getTimeSinceBirth(selectedYear, selectedMonth, BABY_BIRTH_YEAR, BABY_BIRTH_MONTH)}
                </Text>
              </View>
              {/* Like count overlay */}
              {(photoLikeCounts[heroPhoto.id] ?? 0) > 0 && (
                <View style={styles.heroLikeBadge}>
                  <Ionicons
                    name={likedPhotos.has(heroPhoto.id) ? 'heart' : 'heart-outline'}
                    size={13}
                    color="#fff"
                  />
                  <Text style={styles.heroLikeCount}>{photoLikeCounts[heroPhoto.id]}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* 3-column grid */}
          <View style={{ gap: 1, marginTop: 1 }}>
            {photoRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.photoRow}>
                {row.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    activeOpacity={0.9}
                    style={[styles.photoItem, { backgroundColor: photo.color }]}
                    onPress={() => setSelectedPhoto(photo)}
                  >
                    {photo.isVideo && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={10} color="#fff" />
                      </View>
                    )}
                    {(photoLikeCounts[photo.id] ?? 0) > 0 && (
                      <View style={styles.gridLikeBadge}>
                        <Ionicons
                          name={likedPhotos.has(photo.id) ? 'heart' : 'heart-outline'}
                          size={10}
                          color="#fff"
                        />
                        <Text style={styles.gridLikeCount}>{photoLikeCounts[photo.id]}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {row.length < 3 &&
                  Array(3 - row.length)
                    .fill(null)
                    .map((_, i) => (
                      <View
                        key={`empty-${i}`}
                        style={[styles.photoItem, { backgroundColor: colors.background }]}
                      />
                    ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Photo Detail Modal */}
      <Modal visible={!!selectedPhoto} animationType="slide" onRequestClose={closeModal}>
        {selectedPhoto && (
          <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.modalAvatar, { backgroundColor: selectedPhoto.avatarColor }]}>
                <Text style={styles.modalAvatarInitial}>{selectedPhoto.initial}</Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedPhoto.user}</Text>
                <Text style={[styles.modalTimeAgo, { color: colors.subtext }]}>{selectedPhoto.timeAgo}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
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
                <View style={[styles.modalPhoto, { backgroundColor: selectedPhoto.color }]}>
                  {selectedPhoto.isVideo && (
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
                    onPress={() => togglePhotoLike(selectedPhoto.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={photoIsLiked ? 'heart' : 'heart-outline'}
                      size={26}
                      color={photoIsLiked ? '#FF6B8A' : colors.text}
                    />
                    <Text style={[styles.actionCount, { color: colors.text }]}>
                      {photoLikeCounts[selectedPhoto.id] ?? 0}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                    <Text style={[styles.actionCount, { color: colors.text }]}>{totalCommentCount}</Text>
                  </View>
                </View>

                {/* Comments */}
                <View style={styles.commentsSection}>
                  {photoComments.length === 0 ? (
                    <Text style={[styles.noComments, { color: colors.subtext }]}>
                      첫 댓글을 남겨보세요
                    </Text>
                  ) : (
                    photoComments.map((c) => (
                      <View key={c.id}>
                        {/* Top-level comment */}
                        <View style={styles.commentRow}>
                          <View style={[styles.commentAvatar, { backgroundColor: c.avatarColor }]}>
                            <Text style={styles.commentAvatarInitial}>{c.initial}</Text>
                          </View>
                          <View style={styles.commentBody}>
                            <Text style={[styles.commentUser, { color: colors.text }]}>{c.user}</Text>
                            <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                            <TouchableOpacity
                              onPress={() => setReplyingTo({ commentId: c.id, userName: c.user })}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={[styles.replyTrigger, { color: colors.subtext }]}>답글</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.commentLikeBtn}
                            onPress={() => toggleCommentLike(selectedPhoto.id, c.id)}
                          >
                            <Ionicons
                              name={c.likedByMe ? 'heart' : 'heart-outline'}
                              size={14}
                              color={c.likedByMe ? '#FF6B8A' : colors.subtext}
                            />
                            {c.likes > 0 && (
                              <Text style={[styles.commentLikeCount, { color: colors.subtext }]}>
                                {c.likes}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>

                        {/* Replies */}
                        {c.replies.map((r) => (
                          <View key={r.id} style={styles.replyRow}>
                            <View style={styles.replyIndent} />
                            <View style={[styles.replyAvatar, { backgroundColor: r.avatarColor }]}>
                              <Text style={styles.replyAvatarInitial}>{r.initial}</Text>
                            </View>
                            <View style={styles.commentBody}>
                              <Text style={[styles.commentUser, { color: colors.text }]}>{r.user}</Text>
                              <Text style={[styles.commentText, { color: colors.text }]}>{r.text}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.commentLikeBtn}
                              onPress={() => toggleReplyLike(selectedPhoto.id, c.id, r.id)}
                            >
                              <Ionicons
                                name={r.likedByMe ? 'heart' : 'heart-outline'}
                                size={13}
                                color={r.likedByMe ? '#FF6B8A' : colors.subtext}
                              />
                              {r.likes > 0 && (
                                <Text style={[styles.commentLikeCount, { color: colors.subtext }]}>
                                  {r.likes}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Reply target banner */}
              {replyingTo && (
                <View
                  style={[
                    styles.replyBanner,
                    { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.replyBannerText, { color: colors.subtext }]}>
                    @{replyingTo.userName} 에게 답글 작성 중
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Comment input */}
              <View
                style={[
                  styles.inputBar,
                  { backgroundColor: colors.background, borderTopColor: colors.border },
                ]}
              >
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
                  placeholder={replyingTo ? `@${replyingTo.userName}에게 답글...` : '댓글 추가...'}
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
  headerTitle: { fontSize: 22, fontWeight: '700' },
  albumSelectorContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  albumSelectorContent: { paddingHorizontal: 16, gap: 8 },
  albumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  albumChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  albumChipText: { fontSize: 13, fontWeight: '600' },
  yearContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  yearScrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 0 },
  yearTab: { alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 0, gap: 6 },
  yearText: { fontSize: 13 },
  yearTabBar: { height: 2, width: '100%', borderRadius: 1, marginBottom: -StyleSheet.hairlineWidth },
  monthContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  monthItem: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: 3 },
  yearBoundaryLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, lineHeight: 13 },
  yearBoundarySpace: { height: 13 },
  monthText: { fontSize: 14 },
  monthDot: { width: 4, height: 4, borderRadius: 2 },

  // Hero
  heroPhoto: { width, height: width },
  heroVideoBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  heroVideoText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroMonthContainer: {
    position: 'absolute', left: 20, top: 0, bottom: 0,
    justifyContent: 'center', gap: 2,
  },
  heroMonthText: {
    color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  heroYearText: {
    color: 'rgba(255,255,255,0.82)', fontSize: 16, fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  heroBabyContainer: { position: 'absolute', left: 20, bottom: 18 },
  heroBabyText: {
    color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroLikeBadge: {
    position: 'absolute', bottom: 18, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  heroLikeCount: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Grid
  photoRow: { flexDirection: 'row', gap: 1 },
  photoItem: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    justifyContent: 'flex-end', alignItems: 'flex-start', padding: 5,
  },
  videoBadge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 4 },
  gridLikeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  gridLikeCount: { color: '#fff', fontSize: 10, fontWeight: '600' },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  emptySubtext: { fontSize: 14 },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  modalAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalAvatarInitial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalUserInfo: { flex: 1 },
  modalUserName: { fontSize: 15, fontWeight: '600' },
  modalTimeAgo: { fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 4 },
  modalPhoto: { width, height: width },
  modalVideoBadge: {
    position: 'absolute',
    alignSelf: 'center' as const,
    top: width / 2 - 18,
    transform: [{ translateX: 0 }],
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  modalVideoText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actions: {
    flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14,
    gap: 20, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 15, fontWeight: '500' },

  // Comments
  commentsSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, gap: 18 },
  noComments: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2,
  },
  commentAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentBody: { flex: 1, gap: 3 },
  commentUser: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 14, lineHeight: 20 },
  replyTrigger: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  commentLikeBtn: { alignItems: 'center', gap: 2, paddingLeft: 4, flexShrink: 0 },
  commentLikeCount: { fontSize: 11 },

  // Replies (indented)
  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  replyIndent: { width: 20 },
  replyAvatar: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2,
  },
  replyAvatarInitial: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Reply banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBannerText: { fontSize: 13 },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  commentInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 22, fontSize: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
