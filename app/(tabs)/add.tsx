import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 3) / 4);

type GalleryItem = {
  id: string;
  color: string;
  isVideo: boolean;
  duration: string | null;
  takenAt: Date;
};

// Mock current date
const NOW = new Date(2026, 2, 16); // 2026-03-16
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000);


const MOCK_GALLERY: GalleryItem[] = [
  { id: '1',  color: '#FFB3C6', isVideo: false, duration: null,   takenAt: daysAgo(0) },
  { id: '2',  color: '#FFC9A0', isVideo: false, duration: null,   takenAt: daysAgo(0) },
  { id: '3',  color: '#B5EAD7', isVideo: true,  duration: '0:24', takenAt: daysAgo(0) },
  { id: '4',  color: '#C7B9FF', isVideo: false, duration: null,   takenAt: daysAgo(0) },
  { id: '5',  color: '#FFDAC1', isVideo: false, duration: null,   takenAt: daysAgo(0) },
  { id: '6',  color: '#E2F0CB', isVideo: false, duration: null,   takenAt: daysAgo(1) },
  { id: '7',  color: '#B5D8F7', isVideo: false, duration: null,   takenAt: daysAgo(1) },
  { id: '8',  color: '#FFDAC1', isVideo: true,  duration: '0:58', takenAt: daysAgo(1) },
  { id: '9',  color: '#FFB3C6', isVideo: false, duration: null,   takenAt: daysAgo(3) },
  { id: '10', color: '#FFC9A0', isVideo: false, duration: null,   takenAt: daysAgo(3) },
  { id: '11', color: '#B5EAD7', isVideo: false, duration: null,   takenAt: daysAgo(3) },
  { id: '12', color: '#DDA0DD', isVideo: false, duration: null,   takenAt: daysAgo(7) },
  { id: '13', color: '#FFEAA7', isVideo: false, duration: null,   takenAt: daysAgo(7) },
  { id: '14', color: '#FFB3BA', isVideo: true,  duration: '1:12', takenAt: daysAgo(7) },
  { id: '15', color: '#C7B9FF', isVideo: false, duration: null,   takenAt: daysAgo(7) },
  { id: '16', color: '#B5D8F7', isVideo: false, duration: null,   takenAt: daysAgo(14) },
  { id: '17', color: '#FFB3C6', isVideo: false, duration: null,   takenAt: daysAgo(14) },
  { id: '18', color: '#E2F0CB', isVideo: false, duration: null,   takenAt: daysAgo(14) },
  { id: '19', color: '#FFC9A0', isVideo: true,  duration: '0:44', takenAt: daysAgo(30) },
  { id: '20', color: '#FFDAC1', isVideo: false, duration: null,   takenAt: daysAgo(30) },
];

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateLabel(date: Date): string {
  const todayKey = formatDateKey(NOW);
  const yestKey  = formatDateKey(daysAgo(1));
  const key      = formatDateKey(date);
  if (key === todayKey) return '오늘';
  if (key === yestKey)  return '어제';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

type ListHeader = { type: 'header'; label: string; count: number };
type ListRow    = { type: 'row'; photos: GalleryItem[]; key: string };
type ListItem   = ListHeader | ListRow;

function buildListData(items: GalleryItem[]): ListItem[] {
  // Group by date
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

export default function AddScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedOrder = useMemo(() => Array.from(selected), [selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const listData = useMemo(() => buildListData(MOCK_GALLERY), []);
  const selectedCount = selected.size;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>사진·동영상 추가</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>업로드할 항목을 선택하세요</Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) =>
          item.type === 'header' ? `h-${item.label}` : item.key
        }
        contentContainerStyle={{ paddingBottom: selectedCount > 0 ? 110 : 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={[styles.dateHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.dateLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.dateCount, { color: colors.subtext }]}>{item.count}장</Text>
              </View>
            );
          }

          // Photo row (up to 4 thumbs)
          return (
            <View style={styles.photoRow}>
              {item.photos.map((photo) => {
                const isSelected = selected.has(photo.id);
                const order = isSelected ? selectedOrder.indexOf(photo.id) + 1 : null;
                return (
                  <TouchableOpacity
                    key={photo.id}
                    onPress={() => toggleSelect(photo.id)}
                    style={[styles.thumb, { backgroundColor: photo.color }]}
                    activeOpacity={0.85}
                  >
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
              {/* Fill empty slots in last row */}
              {Array(4 - item.photos.length)
                .fill(null)
                .map((_, i) => (
                  <View
                    key={`empty-${i}`}
                    style={[styles.thumb, { backgroundColor: colors.background }]}
                  />
                ))}
            </View>
          );
        }}
      />

      {/* Upload button */}
      {selectedCount > 0 && (
        <View style={[styles.uploadBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.tint }]}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>{selectedCount}개 업로드</Text>
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
  photoRow: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 1,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 5,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
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
});
