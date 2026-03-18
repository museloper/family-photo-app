import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/theme';

export default function InvitedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleQRScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('카메라 권한 필요', '설정에서 카메라 권한을 허용해주세요.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setShowCamera(false);
    // TODO: 링크 파싱 후 앨범 참여 처리
    Alert.alert('QR 코드 인식 완료', `앨범 링크: ${data}`);
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <SafeAreaView style={styles.cameraOverlay}>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              {/* 모서리 */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>QR 코드를 네모 안에 맞춰주세요</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>초대받으신 분</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>어떻게{'\n'}초대받으셨나요?</Text>
        <Text style={[styles.mainDesc, { color: colors.subtext }]}>
          아래 방법 중 하나로 앨범에 참여할 수 있어요
        </Text>

        {/* 링크로 참여 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIconWrap, { backgroundColor: '#FFF0F3' }]}>
            <Text style={styles.cardIconEmoji}>💬</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>링크로 참여하기</Text>
            <Text style={[styles.cardDesc, { color: colors.subtext }]}>
              카카오톡이나 문자로 받은 초대 링크를 탭하면 자동으로 앨범에 참여돼요
            </Text>
          </View>
        </View>

        {/* QR로 참여 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIconWrap, { backgroundColor: '#F0F3FF' }]}>
            <Text style={styles.cardIconEmoji}>📷</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>QR 코드로 참여하기</Text>
            <Text style={[styles.cardDesc, { color: colors.subtext }]}>
              앨범 관리자에게 QR 코드를 보여달라고 하세요. 카메라로 스캔하면 바로 참여돼요
            </Text>
            <TouchableOpacity
              style={[styles.qrBtn, { backgroundColor: colors.primary }]}
              onPress={handleQRScan}
            >
              <Ionicons name="qr-code-outline" size={18} color="#fff" />
              <Text style={styles.qrBtnText}>QR 코드 인식</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  mainTitle: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 8 },
  mainDesc: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardIconEmoji: { fontSize: 26 },
  cardBody: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  qrBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // 카메라
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1 },
  cameraClose: {
    margin: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 },
  scanFrame: { width: 220, height: 220, position: 'relative' },
  scanHint: { color: '#fff', fontSize: 15 },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
});
