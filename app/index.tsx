import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'camera-outline' as const,
    iconColor: '#FF6B8A',
    title: '소중한 순간을\n함께 담아요',
    description: '아기의 첫 걸음, 첫 미소\n가족 모두와 함께 기록해요',
    bg: '#FFF0F3',
    darkBg: '#2A1A1E',
    iconBg: '#FFD6DF',
  },
  {
    id: '2',
    icon: 'chatbubble-ellipses-outline' as const,
    iconColor: '#6B8AFF',
    title: '따뜻한 댓글로\n소통해요',
    description: '사진마다 댓글과 좋아요로\n행복한 이야기를 나눠요',
    bg: '#F0F3FF',
    darkBg: '#1A1A2A',
    iconBg: '#D6DFFF',
  },
  {
    id: '3',
    icon: 'people-outline' as const,
    iconColor: '#6BC97A',
    title: '가족을 간편하게\n초대해요',
    description: 'QR코드나 링크로\n할머니 할아버지도 쉽게 초대해요',
    bg: '#F0FFF4',
    darkBg: '#1A2A1E',
    iconBg: '#D6FFE0',
  },
];

export default function LandingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { session, isLoading } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isLoading && session) {
      router.replace('/(tabs)');
    }
  }, [isLoading, session]);

  if (isLoading) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 로고 */}
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
          <Ionicons name="images-outline" size={28} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>family photo</Text>
        <Text style={[styles.appDesc, { color: colors.subtext }]}>소중한 순간을 가족과 함께</Text>
      </View>

      {/* 슬라이드 */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {SLIDES.map((item) => (
          <View key={item.id} style={[styles.slide, { width }]}>
            <View
              style={[
                styles.slideCard,
                { backgroundColor: colorScheme === 'dark' ? item.darkBg : item.bg },
              ]}
            >
              <View style={[styles.slideIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={52} color={item.iconColor} />
              </View>
              <Text style={[styles.slideTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.slideDesc, { color: colors.subtext }]}>{item.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 인디케이터 */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? colors.primary : colors.border,
                width: i === activeIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* 버튼 */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: colors.primary }]}
          onPress={() => router.push('/invited')}
        >
          <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>초대받으신 분</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.btnPrimaryText}>새로운 앨범 작성</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 16 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  appDesc: { fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 24 },
  slideCard: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  slideIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  slideDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: { height: 8, borderRadius: 4 },
  buttons: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  btnPrimary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '600' },
});
