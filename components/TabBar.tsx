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
import Svg, { Path } from 'react-native-svg'
import { Dimensions } from 'react-native'

import { LinearGradient } from 'expo-linear-gradient'
import {
  TAB_ACTIVE,
  TAB_INACTIVE,
  TAB_HEIGHT,
  ACCENT,
  ACCENT_DARK,
} from '@/lib/theme'
import { Text } from '@/components/ui/Text'

const ICON_SIZE = 24.2
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
        <View style={[s.iconContainer, isActive && s.iconContainerActive]}>
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
  const bottomPosition = insets.bottom > 0 ? insets.bottom + 6 : 14

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
      color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
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
            pressed && { transform: [{ scale: 0.94 }, { translateY: -25 }] },
          ]}
        >
          <LinearGradient
            colors={['#FBBF24', '#EA580C']}
            style={s.elevatedBtnGradient}
          >
            <Ionicons name="add" size={32} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {route2 && renderTab(route2, 2)}
      {route3 && renderTab(route3, 3)}
    </View>
  )

  const { width: windowWidth } = Dimensions.get('window')
  const W = windowWidth - 40
  const H = TAB_HEIGHT
  const R = 28
  const CX = W / 2
  // Make the cutout perfectly concentric with the button
  // Button radius = 30. Button center Y = 10 (translateY: -25 from 35).
  // Cutout radius = 36 (6px gap). Cutout center Y = 10.
  // Intersection with top edge (Y = 0): sqrt(36^2 - 10^2) = sqrt(1196) = 34.58
  const CR = 36
  const X_OFFSET = 34.58
  const X1 = CX - X_OFFSET
  const X2 = CX + X_OFFSET
  
  // Custom cutout path for the navbar
  const bgPath = `
    M 0 ${R}
    A ${R} ${R} 0 0 1 ${R} 0
    L ${X1} 0
    A ${CR} ${CR} 0 0 0 ${X2} 0
    L ${W - R} 0
    A ${R} ${R} 0 0 1 ${W} ${R}
    L ${W} ${H - R}
    A ${R} ${R} 0 0 1 ${W - R} ${H}
    L ${R} ${H}
    A ${R} ${R} 0 0 1 0 ${H - R}
    Z
  `

  return (
    <View style={[s.wrapper, { bottom: bottomPosition }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Path d={bgPath} fill="rgba(34, 197, 94, 0.85)" />
        </Svg>
      </View>
      {tabs}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: TAB_HEIGHT,
    borderRadius: 28,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    width: 44,
    height: 30,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '700',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Elevated Center Button
  elevatedBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    zIndex: 100,
  },
  elevatedBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFF',
    transform: [{ translateY: -25 }],
  },
  elevatedBtnGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
