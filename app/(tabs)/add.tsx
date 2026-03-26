import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { uploadPhoto, ApiError } from '@/services/api';

const { width } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 3) / 4);

type GalleryItem = {
  id: string;
  uri: string;
  isVideo: boolean;
  duration: string | null;
  takenAt: Date;
};

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const yestKey  = formatDateKey(new Date(now.getTime() - 86400000));
  const key      = formatDateKey(date);
  if (key === todayKey) return '오늘';
  if (key === yestKey)  return '어제';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

type ListHeader = { type: 'header'; label: string; count: number };
type ListRow    = { type: 'row'; photos: GalleryItem[]; key: string };
type ListItem   = ListHeader | ListRow;

function buildListData(items: GalleryItem[]): ListItem[] {
  const groups = new Map<string, { label: string; items: GalleryItem[] }>();
  for (const item of items) {
    const key   = formatDateKey(item.takenAt);
    const label = formatDateLabel(item.takenAt);
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(item);
  }

  const result: ListItem[] = [];
  for (const [key, { label, items: groupItems }] of groups) {
    result.push({ type: 'header', label, count: groupItems.length });
    for (let i = 0; i < groupItems.length; i += 4) {
      result.push({ type: 'row', photos: groupItems.slice(i, i + 4), key: `${key}-${i}` });
    }
  }
  return result;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Web upload screen ────────────────────────────────────────────────────────

function WebAddScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { session, clearSession } = useAuth();

  const [picked, setPicked] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: true,
    });
    if (!result.canceled) {
      setPicked((prev) => {
        const existingUris = new Set(prev.map((a) => a.uri));
        const newItems = result.assets.filter((a) => !existingUris.has(a.uri));
        return [...prev, ...newItems];
      });
    }
  };

  const removeItem = (uri: string) => {
    setPicked((prev) => prev.filter((a) => a.uri !== uri));
  };

  const handleUpload = async () => {
    if (!session || picked.length === 0) return;
    setUploading(true);
    let successCount = 0;
    let lastError = '';

    for (const asset of picked) {
      try {
        const isVideo = asset.type === 'video';
        const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
        const ext = isVideo ? 'mp4' : 'jpg';
        const fileName = `${Date.now()}_web.${ext}`;
        const takenAt = asset.exif?.DateTimeOriginal
          ? new Date(asset.exif.DateTimeOriginal as string).getTime()
          : null;
        await uploadPhoto(session.albumId, session.token, asset.uri, mimeType, fileName, takenAt);
        successCount++;
      } catch (e) {
        console.error('업로드 실패', e);
        lastError = e instanceof Error ? e.message : '알 수 없는 오류';
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setUploading(false);
          await clearSession();
          Alert.alert('세션 만료', '다시 로그인이 필요합니다. 앱을 다시 시작해주세요.');
          return;
        }
      }
    }

    setUploading(false);
    setPicked([]);

    if (lastError === '') {
      router.replace('/(tabs)' as any);
    } else {
      Alert.alert('업로드 실패', `오류: ${lastError}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>사진·동영상 추가</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>업로드할 항목을 선택하세요</Text>
      </View>

      <View style={styles.webPickerArea}>
        <TouchableOpacity
          style={[styles.webPickBtn, { borderColor: colors.tint }]}
          onPress={handlePick}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={32} color={colors.tint} />
          <Text style={[styles.webPickBtnText, { color: colors.tint }]}>파일 선택</Text>
        </TouchableOpacity>
      </View>

      {picked.length > 0 && (
        <View style={styles.webPreviewWrap}>
          <View style={styles.webPreviewGrid}>
            {picked.map((asset) => (
              <View key={asset.uri} style={styles.webThumb}>
                <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {asset.type === 'video' && (
                  <View style={styles.webVideoBadge}>
                    <Ionicons name="videocam" size={10} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.webRemoveBtn}
                  onPress={() => removeItem(asset.uri)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {picked.length > 0 && (
        <View style={[styles.uploadBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.tint, opacity: uploading ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
            <Text style={styles.uploadButtonText}>
              {uploading ? '업로드 중...' : `${picked.length}개 업로드`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Native gallery screen ────────────────────────────────────────────────────

export default function AddScreen() {
  if (Platform.OS === 'web' || Platform.OS === 'android') return <WebAddScreen />;
  return <NativeAddScreen />;
}

function NativeAddScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, clearSession } = useAuth();

  const [permission, requestPermission] = MediaLibrary.usePermissions({
    granularPermissions: ['photo', 'video'],
  });
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const selectedOrder = useMemo(() => Array.from(selected), [selected]);

  const loadAssets = useCallback(async (cursor?: string) => {
    if (loadingGallery || (!hasMore && cursor !== undefined)) return;
    setLoadingGallery(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        first: 60,
        after: cursor,
      });

      const items: GalleryItem[] = result.assets.map((a) => ({
        id: a.id,
        uri: a.uri,
        isVideo: a.mediaType === 'video',
        duration: a.mediaType === 'video' ? formatDuration(a.duration) : null,
        takenAt: new Date(a.creationTime),
      }));

      setGallery((prev) => cursor ? [...prev, ...items] : items);
      setEndCursor(result.endCursor);
      setHasMore(result.hasNextPage);
    } catch (e) {
      console.error('갤러리 로드 실패', e);
    } finally {
      setLoadingGallery(false);
    }
  }, [loadingGallery, hasMore]);

  useEffect(() => {
    if (permission?.granted) {
      loadAssets();
    } else if (permission && !permission.granted && !permission.canAskAgain) {
      // 권한 영구 거부
    } else if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleUpload = async () => {
    if (!session || selected.size === 0) return;

    setUploading(true);
    let successCount = 0;
    let lastError = '';

    for (const id of selectedOrder) {
      const item = gallery.find((g) => g.id === id);
      if (!item) continue;
      try {
        const mimeType = item.isVideo ? 'video/mp4' : 'image/jpeg';
        const ext = item.isVideo ? 'mp4' : 'jpg';
        const fileName = `${Date.now()}_${item.id}.${ext}`;
        // ph-upload:// URI는 iCloud 미다운로드 사진 — localUri로 강제 다운로드
        let uri = item.uri;
        if (uri.startsWith('ph-upload://') || !uri.startsWith('file://')) {
          const info = await MediaLibrary.getAssetInfoAsync(item.id);
          uri = info.localUri ?? uri;
        }
        await uploadPhoto(session.albumId, session.token, uri, mimeType, fileName, item.takenAt.getTime());
        successCount++;
      } catch (e) {
        console.error('업로드 실패', e);
        lastError = e instanceof Error ? e.message : '알 수 없는 오류';
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setUploading(false);
          await clearSession();
          Alert.alert('세션 만료', '다시 로그인이 필요합니다.');
          return;
        }
      }
    }

    setUploading(false);
    setSelected(new Set());

    if (lastError === '') {
      router.replace('/(tabs)' as any);
    } else {
      Alert.alert('업로드 실패', `오류: ${lastError}`);
    }
  };

  const listData = useMemo(() => buildListData(gallery), [gallery]);
  const selectedCount = selected.size;

  // 권한 요청 화면
  if (!permission?.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionWrap}>
          <Ionicons name="images-outline" size={56} color={colors.subtext} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            갤러리 접근 권한이 필요해요
          </Text>
          <Text style={[styles.permissionDesc, { color: colors.subtext }]}>
            사진과 동영상을 앨범에 추가하려면{'\n'}갤러리 접근을 허용해주세요
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.tint }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>권한 허용하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>사진·동영상 추가</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>업로드할 항목을 선택하세요</Text>
      </View>

      {loadingGallery && gallery.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) =>
            item.type === 'header' ? `h-${item.label}` : item.key
          }
          contentContainerStyle={{ paddingBottom: selectedCount > 0 ? 110 : 20 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasMore && loadAssets(endCursor)}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={[styles.dateHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.dateCount, { color: colors.subtext }]}>{item.count}장</Text>
                </View>
              );
            }

            return (
              <View style={styles.photoRow}>
                {item.photos.map((photo) => {
                  const isSelected = selected.has(photo.id);
                  const order = isSelected ? selectedOrder.indexOf(photo.id) + 1 : null;
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => toggleSelect(photo.id)}
                      style={[styles.thumb, { backgroundColor: colors.border }]}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                      {isSelected && <View style={styles.selectedOverlay} />}
                      {photo.isVideo && (
                        <View style={styles.videoBadge}>
                          <Ionicons name="videocam" size={10} color="#fff" />
                          <Text style={styles.videoDuration}>{photo.duration}</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.selectionBadge, { backgroundColor: colors.tint }]}>
                          <Text style={styles.selectionNumber}>{order}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {Array(4 - item.photos.length).fill(null).map((_, i) => (
                  <View key={`empty-${i}`} style={[styles.thumb, { backgroundColor: colors.background }]} />
                ))}
              </View>
            );
          }}
        />
      )}

      {selectedCount > 0 && (
        <View style={[styles.uploadBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.tint, opacity: uploading ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
            <Text style={styles.uploadButtonText}>
              {uploading ? '업로드 중...' : `${selectedCount}개 업로드`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerSub: { fontSize: 14 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permissionWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  permissionTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permissionDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permissionBtn: { marginTop: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  permissionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 1,
  },
  dateLabel: { fontSize: 14, fontWeight: '600' },
  dateCount: { fontSize: 13 },
  photoRow: { flexDirection: 'row', gap: 1, marginBottom: 1 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 5,
    overflow: 'hidden',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  videoDuration: { color: '#fff', fontSize: 10, fontWeight: '500' },
  selectionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  selectionNumber: { color: '#fff', fontSize: 11, fontWeight: '700' },
  uploadBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Web styles
  webPickerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPickBtn: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  webPickBtnText: { fontSize: 16, fontWeight: '600' },
  webPreviewWrap: {
    flex: 2,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  webPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  webThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  webVideoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    padding: 3,
  },
  webRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
