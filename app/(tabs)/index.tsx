import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPhotos, getAlbums, FILE_BASE, ApiError, ApiAlbum, toggleLike, getComments, addComment, updateVisibility, ApiComment } from '@/services/api';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = Math.floor((width - 2) / 3);
const MONTH_ITEM_WIDTH = 56;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildTimeline(photos: Array<{ year: number; month: number }>) {
  const seen = new Set<string>();
  const items: Array<{ year: number; month: number }> = [];
  for (const p of photos) {
    const key = `${p.year}-${p.month}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ year: p.year, month: p.month });
    }
  }
  // Sort descending (most recent first)
  items.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  return items;
}

type Photo = {
  id: string;
  url: string;
  year: number;
  month: number;
  isVideo: boolean;
  uploadedBy: string;
  takenAt: string | null;
  visibility: 'public' | 'family' | 'private';
  likeCount: number;
  likedByMe: boolean;
};

type Comment = {
  id: string;
  userId: number;
  user: string;
  text: string;
  replies: Comment[];
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: '전체 공개',
  family: '가족 공개',
  private: '비공개',
};

function getAvatarColor(name: string): string {
  const colors = ['#FF6B8A', '#6B8AFF', '#6BC97A', '#FFB347', '#A78BFA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitial(name: string): string {
  return name.charAt(0);
}

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
  const insets = useSafeAreaInsets();

  const { session, clearSession, switchAlbum } = useAuth();

  // Real albums from API
  const [apiAlbums, setApiAlbums] = useState<ApiAlbum[]>([]);
  const fetchAlbums = useCallback(() => {
    if (!session) return;
    getAlbums(session.token).then(setApiAlbums).catch(() => {});
  }, [session]);

  useFocusEffect(useCallback(() => { fetchAlbums(); }, [fetchAlbums]));

  // babyBirth는 "YYYY-MM-DD" 형식으로 저장됨
  const BABY_NAME = session?.babyName ?? '';
  const [BABY_BIRTH_YEAR, BABY_BIRTH_MONTH] = session?.babyBirth
    ? session.babyBirth.slice(0, 10).split('-').map(Number)
    : [0, 0];

  // Photos from API
  const [photos, setPhotos] = useState<Photo[]>([]);

  const fetchPhotos = useCallback(() => {
    if (!session) return;
    getPhotos(session.albumId, session.token)
      .then((data) => {
        const mapped: Photo[] = (data.photos ?? []).map((p) => {
          const d = new Date(p.taken_at ?? p.uploaded_at);
          return {
            id: String(p.id),
            url: FILE_BASE + (p.medium_url ?? p.original_url),
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            isVideo: p.mime_type?.startsWith('video') ?? false,
            uploadedBy: p.uploader_name ?? '가족',
            takenAt: p.taken_at ?? null,
            visibility: p.visibility ?? 'family',
            likeCount: p.like_count ?? 0,
            likedByMe: p.liked_by_me ?? false,
          };
        });
        setPhotos(mapped);
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearSession();
        }
      });
  }, [session]);

  // 탭 포커스될 때마다 사진 목록 갱신 (업로드 후 즉시 반영)
  useFocusEffect(fetchPhotos);

  // 앨범 전환 시 즉시 새 앨범 사진 로드
  useEffect(() => { fetchPhotos(); }, [session?.albumId]);

  // Timeline — derived from actual photos
  const timeline = buildTimeline(photos);
  const uniqueYears = [...new Set(timeline.map((t) => t.year))];

  const timelineRef = useRef<FlatList>(null);
  const yearScrollRef = useRef<ScrollView>(null);
  const yearTabXRef = useRef<Record<number, number>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleYear, setVisibleYear] = useState<number | null>(null);
  const visibleYearRef = useRef<number | null>(null);

  // Reset selection when timeline changes
  useEffect(() => {
    setSelectedIndex(0);
    const firstYear = timeline[0]?.year ?? null;
    visibleYearRef.current = firstYear;
    setVisibleYear(firstYear);
  }, [photos]);

  const selectedEntry = timeline[selectedIndex] ?? null;
  const selectedYear = selectedEntry?.year ?? 0;
  const selectedMonth = selectedEntry?.month ?? 0;

  const filteredPhotos = selectedEntry
    ? photos.filter((p) => p.year === selectedYear && p.month === selectedMonth)
    : [];
  const heroPhoto = filteredPhotos[0] ?? null;
  const restPhotos = filteredPhotos.slice(1);
  const photoRows: Photo[][] = [];
  for (let i = 0; i < restPhotos.length; i += 3) {
    photoRows.push(restPhotos.slice(i, i + 3));
  }

  const selectIndex = (idx: number) => setSelectedIndex(idx);

  const scrollToYear = (year: number) => {
    const idx = timeline.findIndex((item) => item.year === year);
    if (idx !== -1) {
      timelineRef.current?.scrollToIndex({ index: idx, animated: true });
      setSelectedIndex(idx);
      visibleYearRef.current = year;
      setVisibleYear(year);
    }
  };

  const handleMonthScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.floor(e.nativeEvent.contentOffset.x / MONTH_ITEM_WIDTH);
    const year = timeline[Math.min(idx, timeline.length - 1)]?.year ?? null;
    if (year && year !== visibleYearRef.current) {
      visibleYearRef.current = year;
      setVisibleYear(year);
    }
  }, [timeline]);

  useEffect(() => {
    if (visibleYear == null) return;
    const x = yearTabXRef.current[visibleYear];
    if (x !== undefined) {
      yearScrollRef.current?.scrollTo({ x: x - width / 2 + 40, animated: true });
    }
  }, [visibleYear]);

  // Modal / interaction state
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [visibilityPickerPhoto, setVisibilityPickerPhoto] = useState<Photo | null>(null);
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);

  // 모달 열릴 때 댓글 로드
  useEffect(() => {
    if (!selectedPhoto || !session) return;
    getComments(selectedPhoto.id, session.token)
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

  const handleToggleLike = async (photo: Photo) => {
    if (!session) return;
    // 낙관적 업데이트
    setPhotos((prev) => prev.map((p) =>
      p.id === photo.id
        ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
        : p
    ));
    try {
      await toggleLike(photo.id, session.token);
    } catch {
      // 실패 시 롤백
      setPhotos((prev) => prev.map((p) =>
        p.id === photo.id
          ? { ...p, likedByMe: photo.likedByMe, likeCount: photo.likeCount }
          : p
      ));
    }
  };

  const handleChangeVisibility = async (photo: Photo, next: 'public' | 'family' | 'private') => {
    if (!session) return;
    setVisibilityPickerPhoto(null);
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, visibility: next } : p));
    try {
      await updateVisibility(photo.id, session.token, next);
    } catch (e) {
      setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, visibility: photo.visibility } : p));
      Alert.alert('공개 범위 변경 실패', e instanceof Error ? e.message : '오류가 발생했습니다');
    }
  };

  const submitComment = async () => {
    if (!selectedPhoto || !commentInput.trim() || !session) return;
    const text = commentInput.trim();
    setCommentInput('');

    try {
      const parentId = replyingTo ? Number(replyingTo.commentId) : undefined;
      const saved = await addComment(selectedPhoto.id, session.token, text, parentId);
      const newEntry: Comment = {
        id: String(saved.id),
        userId: saved.user_id,
        user: saved.user_name,
        text: saved.body,
        replies: [],
      };
      setAllComments((prev) => {
        const cur = prev[selectedPhoto.id] ?? [];
        if (replyingTo) {
          return {
            ...prev,
            [selectedPhoto.id]: cur.map((c) =>
              c.id === replyingTo.commentId ? { ...c, replies: [...c.replies, newEntry] } : c
            ),
          };
        }
        return { ...prev, [selectedPhoto.id]: [...cur, newEntry] };
      });
      setReplyingTo(null);
    } catch {
      setCommentInput(text); // 실패 시 복원
    }
  };

  const closeModal = () => {
    setSelectedPhoto(null);
    setReplyingTo(null);
    setCommentInput('');
  };

  const photoComments = selectedPhoto ? (allComments[selectedPhoto.id] ?? []) : [];
  const currentPhoto = selectedPhoto ? (photos.find((p) => p.id === selectedPhoto.id) ?? selectedPhoto) : null;
  const totalCommentCount = photoComments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  // Animated arrow for empty state
  const arrowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 10, duration: 600, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [arrowAnim]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {session?.babyName ? `${session.babyName}의 앨범` : '가족 앨범'}
        </Text>
      </View>

      {/* Album selector — shown when multiple albums exist */}
      {apiAlbums.length > 1 && (
        <View style={[styles.albumSelectorContainer, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumSelectorContent}
          >
            {apiAlbums.map((album) => {
              const isActive = album.id === session?.albumId;
              return (
                <TouchableOpacity
                  key={album.id}
                  onPress={() => !isActive && switchAlbum(album.id, album.baby_name, album.birth_date)}
                  style={[
                    styles.albumChip,
                    isActive
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.albumChipDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : album.color }]} />
                  <Text style={[styles.albumChipText, { color: isActive ? '#fff' : colors.text }]}>
                    {album.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Year tabs — only shown when photos exist */}
      {timeline.length > 0 && (
        <View style={[styles.yearContainer, { borderBottomColor: colors.border }]}>
          <ScrollView
            ref={yearScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearScrollContent}
          >
            {uniqueYears.map((year) => {
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
      )}

      {/* Month timeline — only shown when photos exist */}
      {timeline.length > 0 && (
        <View style={[styles.monthContainer, { borderBottomColor: colors.border }]}>
          <FlatList
            ref={timelineRef}
            data={timeline}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            contentContainerStyle={timeline.length === 1 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
            getItemLayout={(_, index) => ({
              length: MONTH_ITEM_WIDTH,
              offset: MONTH_ITEM_WIDTH * index,
              index,
            })}
            scrollEventThrottle={100}
            onScroll={handleMonthScroll}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedIndex;
              const isYearBoundary = index > 0 && item.year !== timeline[index - 1].year;
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
      )}

      {/* Photo Area */}
      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyGuide, { color: colors.subtext }]}>
            추가 버튼을 터치하면 사진과{'\n'}동영상을 추가할 수 있습니다
          </Text>
          <Animated.View style={{ transform: [{ translateY: arrowAnim }], marginTop: 8 }}>
            <Ionicons name="arrow-down" size={32} color={colors.tint} />
          </Animated.View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Hero */}
          {heroPhoto && (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.heroPhoto}
              onPress={() => setSelectedPhoto(heroPhoto)}
            >
              <Image source={{ uri: heroPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
              {heroPhoto.likeCount > 0 && (
                <View style={styles.heroLikeBadge}>
                  <Ionicons
                    name={heroPhoto.likedByMe ? 'heart' : 'heart-outline'}
                    size={13}
                    color="#fff"
                  />
                  <Text style={styles.heroLikeCount}>{heroPhoto.likeCount}</Text>
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
                    style={styles.photoItem}
                    onPress={() => setSelectedPhoto(photo)}
                  >
                    <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    {photo.isVideo && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={10} color="#fff" />
                      </View>
                    )}
                    {photo.likeCount > 0 && (
                      <View style={styles.gridLikeBadge}>
                        <Ionicons
                          name={photo.likedByMe ? 'heart' : 'heart-outline'}
                          size={10}
                          color="#fff"
                        />
                        <Text style={styles.gridLikeCount}>{photo.likeCount}</Text>
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
        {selectedPhoto && currentPhoto && (
          <>
          <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.modalAvatar, { backgroundColor: getAvatarColor(selectedPhoto.uploadedBy) }]}>
                <Text style={styles.modalAvatarInitial}>{getInitial(selectedPhoto.uploadedBy)}</Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedPhoto.uploadedBy}</Text>
                <Text style={[styles.modalTimeAgo, { color: colors.subtext }]}>
                  {selectedPhoto.takenAt
                    ? new Date(selectedPhoto.takenAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '날짜 정보 없음'}
                </Text>
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
                <View style={styles.modalPhoto}>
                  <Image source={{ uri: selectedPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {selectedPhoto.isVideo && (
                    <View style={styles.modalVideoBadge}>
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.modalVideoText}>동영상</Text>
                    </View>
                  )}
                </View>

                {/* Actions + visibility */}
                <View style={[styles.actions, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleLike(currentPhoto)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={currentPhoto.likedByMe ? 'heart' : 'heart-outline'}
                      size={26}
                      color={currentPhoto.likedByMe ? '#FF6B8A' : colors.text}
                    />
                    <Text style={[styles.actionCount, { color: colors.text }]}>
                      {currentPhoto.likeCount}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                    <Text style={[styles.actionCount, { color: colors.text }]}>{totalCommentCount}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.visibilityBadge, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                    onPress={() => setVisibilityPickerPhoto(currentPhoto)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={currentPhoto.visibility === 'public' ? 'globe-outline' : currentPhoto.visibility === 'family' ? 'people-outline' : 'lock-closed-outline'}
                      size={13}
                      color={colors.subtext}
                    />
                    <Text style={[styles.visibilityText, { color: colors.subtext }]}>
                      {VISIBILITY_LABELS[currentPhoto.visibility]}
                    </Text>
                  </TouchableOpacity>
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
                        <View style={styles.commentRow}>
                          <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(c.user) }]}>
                            <Text style={styles.commentAvatarInitial}>{getInitial(c.user)}</Text>
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
                        </View>

                        {c.replies.map((r) => (
                          <View key={r.id} style={styles.replyRow}>
                            <View style={styles.replyIndent} />
                            <View style={[styles.replyAvatar, { backgroundColor: getAvatarColor(r.user) }]}>
                              <Text style={styles.replyAvatarInitial}>{getInitial(r.user)}</Text>
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
          </View>

          {/* Visibility Picker - Photo Detail Modal 안에 중첩해야 iOS에서 정상 동작 */}
          <Modal
            visible={!!visibilityPickerPhoto}
            transparent
            animationType="fade"
            onRequestClose={() => setVisibilityPickerPhoto(null)}
          >
            <TouchableOpacity
              style={styles.visPickerOverlay}
              activeOpacity={1}
              onPress={() => setVisibilityPickerPhoto(null)}
            >
              <View style={[styles.visPickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.visPickerTitle, { color: colors.subtext }]}>공개 범위 선택</Text>
                {([
                  { key: 'public',  icon: 'globe-outline',       label: '전체 공개',  desc: '앱을 사용하는 누구나 볼 수 있어요' },
                  { key: 'family',  icon: 'people-outline',      label: '가족 공개',  desc: '앨범에 초대된 가족만 볼 수 있어요' },
                  { key: 'private', icon: 'lock-closed-outline', label: '비공개',     desc: '나만 볼 수 있어요' },
                ] as const).map(({ key, icon, label, desc }) => {
                  const isSelected = visibilityPickerPhoto?.visibility === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.visPickerRow, isSelected && { backgroundColor: colors.tint + '18' }]}
                      onPress={() => visibilityPickerPhoto && handleChangeVisibility(visibilityPickerPhoto, key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={icon} size={20} color={isSelected ? colors.tint : colors.subtext} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.visPickerLabel, { color: isSelected ? colors.tint : colors.text }]}>{label}</Text>
                        <Text style={[styles.visPickerDesc, { color: colors.subtext }]}>{desc}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.tint} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>
          </>
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
  heroPhoto: { width, height: width, backgroundColor: '#E0E0E0', overflow: 'hidden' },
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
    backgroundColor: '#E0E0E0', overflow: 'hidden',
  },
  videoBadge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 4 },
  gridLikeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  gridLikeCount: { color: '#fff', fontSize: 10, fontWeight: '600' },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyGuide: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

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
  modalPhoto: { width, height: width, backgroundColor: '#E0E0E0', overflow: 'hidden' },
  modalVideoBadge: {
    position: 'absolute',
    alignSelf: 'center' as const,
    top: width / 2 - 18,
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
  visibilityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginLeft: 'auto',
  },
  visibilityText: { fontSize: 12, fontWeight: '500' },

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

  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  replyIndent: { width: 20 },
  replyAvatar: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2,
  },
  replyAvatarInitial: { color: '#fff', fontSize: 10, fontWeight: '700' },

  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBannerText: { fontSize: 13 },

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

  // Visibility picker
  visPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  visPickerSheet: { width: '100%', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', paddingTop: 4 },
  visPickerTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 20, paddingVertical: 14 },
  visPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  visPickerLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  visPickerDesc: { fontSize: 12 },
});
