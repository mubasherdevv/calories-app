import React from 'react'
import { View, Pressable, StyleSheet, Platform } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import {
  TAB_ACTIVE,
  TAB_INACTIVE,
  TAB_HEIGHT,
  ACCENT,
} from '@/lib/theme'
import { Text } from '@/components/ui/Text'

const ICON_SIZE = 22
const EASE_OUT = Easing.out(Easing.cubic)

export const TAB_BAR_HEIGHT = TAB_HEIGHT
export const TAB_BAR_CLEARANCE = TAB_HEIGHT + 36 // Optimal clearance for docked bar

// ─── Single tab item ──────────────────────────────────────────────────────────

function TabItem({
  label,
  isActive,
  onPress,
  icon,
}: {
  label: string
  isActive: boolean
  onPress: () => void
  icon?: React.ReactNode
}) {
  const pressOpacity = useSharedValue(1)

  const pressStyle = useAnimatedStyle(() => ({ opacity: pressOpacity.value }))

  return (
    <Pressable
      style={s.tab}
      onPress={onPress}
      onPressIn={() => {
        pressOpacity.value = withTiming(0.45, { duration: 70 })
      }}
      onPressOut={() => {
        pressOpacity.value = withTiming(1, { duration: 160, easing: EASE_OUT })
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[s.tabInner, pressStyle]}>
        <View style={s.iconContainer}>
          {icon}
        </View>
        <Text style={[s.label, isActive && s.labelActive]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export default function TabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  function handlePress(name: string, key: string, i: number) {
    if (state.index === i) return
    const ev = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true })
    if (!ev.defaultPrevented) navigation.navigate(name as never)
  }

  // Helper to render standard Tab item
  const renderTab = (route: any, i: number) => {
    const { options } = descriptors[route.key]
    const isActive = state.index === i
    const label = typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : (options.title ?? route.name)
    const icon = options.tabBarIcon?.({
      color: isActive ? TAB_ACTIVE : TAB_INACTIVE,
      size: ICON_SIZE,
      focused: isActive,
    })

    return (
      <TabItem
        key={route.key}
        label={label}
        isActive={isActive}
        icon={icon}
        onPress={() => handlePress(route.name, route.key, i)}
      />
    )
  }

  // We have 4 routes: index, explore, activity, profile.
  // We want to insert the elevated Camera/Scan button in the middle (index 2 of a 5-item bar).
  const route0 = state.routes[0] // index (Home)
  const route1 = state.routes[1] // explore (Explore)
  const route2 = state.routes[2] // activity (Activity)
  const route3 = state.routes[3] // profile (Profile)

  const tabs = (
    <View style={s.bar}>
      {route0 && renderTab(route0, 0)}
      {route1 && renderTab(route1, 1)}

      {/* Elevated Scan Button (Center) */}
      <View style={s.elevatedBtnContainer}>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [
            s.elevatedBtn,
            pressed && { transform: [{ scale: 0.94 }, { translateY: -20 }], opacity: 0.9 },
          ]}
        >
          <Ionicons name="camera" size={24} color="#FFF" />
        </Pressable>
      </View>

      {route2 && renderTab(route2, 2)}
      {route3 && renderTab(route3, 3)}
    </View>
  )

  return (
    <View style={s.wrapper}>
      {/* Frosted glassmorphic green overlay on iOS */}
      {Platform.OS === 'ios' && (
        <>
          <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(46, 125, 50, 0.12)' }]} />
        </>
      )}
      {tabs}
      {insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: '#141C17' }} />
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#141C17', // Deep forest-green glass base
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'visible',
    shadowColor: '#4CAF50', // Rising ambient green glow shadow!
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderTopWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.20)', // Translucent green card top line
  },
  bar: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  label: {
    fontSize: 10,
    color: TAB_INACTIVE,
    textAlign: 'center',
    fontWeight: '700',
  },
  labelActive: {
    color: TAB_ACTIVE,
    fontWeight: '800',
  },

  // Elevated Center Button
  elevatedBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    zIndex: 100,
  },
  elevatedBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#141C17', // Seam-blended border
    transform: [{ translateY: -20 }],
  },
})
