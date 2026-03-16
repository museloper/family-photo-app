import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_HEIGHT = Platform.OS === 'ios' ? 84 : 72;
const TAB_PADDING_BOTTOM = Platform.OS === 'ios' ? 28 : 16;

const REGULAR_TABS = {
  index:    { icon: 'images-outline' as const,   label: '앨범' },
  news:     { icon: 'newspaper-outline' as const, label: '근황' },
  explore:  { icon: 'compass-outline' as const,   label: '둘러보기' },
  settings: { icon: 'settings-outline' as const,  label: '설정' },
} as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentName = state.routes[state.index]?.name;

  const goTo = (routeName: string, routeKey: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (currentName !== routeName && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const addRoute = state.routes.find((r) => r.name === 'add');

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* 4 regular tabs */}
      {(['index', 'news', 'explore', 'settings'] as const).map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;
        const cfg = REGULAR_TABS[name];
        const isActive = currentName === name;
        const color = isActive ? colors.tint : colors.tabIconDefault;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.slot}
            onPress={() => goTo(name, route.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={cfg.icon} size={24} color={color} />
            <Text style={[styles.slotLabel, { color }]}>{cfg.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* FAB — centered, no label, raised higher */}
      {addRoute && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => goTo('add', addRoute.key)}
          activeOpacity={0.85}
        >
          <View style={[styles.fabCircle, { backgroundColor: colors.tint, shadowColor: colors.tint }]}>
            <Ionicons name="add" size={30} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="add" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: TAB_PADDING_BOTTOM,
    gap: 4,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 27,
    top: -34,
    width: 54,
    alignItems: 'center',
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
