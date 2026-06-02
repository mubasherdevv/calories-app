import { useEffect, useRef } from 'react'
import {
  View, Pressable, StyleSheet, Dimensions,
  ImageBackground, StatusBar, PanResponder, Animated as RNAnimated, Platform,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { ACCENT } from '@/lib/theme'

const { width: SW, height: SH } = Dimensions.get('window')

// Calorie badge data (floating pills on the landing screen)
const BADGES = [
  { label: 'AI Scan 📸', color: ACCENT,    x: SW * 0.52, y: SH * 0.38 },
  { label: 'Track 🥗',   color: '#F59E0B', x: SW * 0.06, y: SH * 0.50 },
  { label: 'Analyze 🧠', color: '#60A5FA', x: SW * 0.48, y: SH * 0.62 },
]

export default function LandingScreen() {
  const insets = useSafeAreaInsets()

  const titleY   = useSharedValue(-30)
  const titleOp  = useSharedValue(0)
  const badgeOp  = useSharedValue(0)
  const footerY  = useSharedValue(40)
  const footerOp = useSharedValue(0)

  // Floating badge animation values
  const b0Y = useSharedValue(0)
  const b1Y = useSharedValue(0)
  const b2Y = useSharedValue(0)

  // Slider animation and responder variables
  const sliderWidth = SW - 32 - 40 // SW - 32 (margins) - 40 (paddings)
  const handleSize = 48
  const maxDistance = sliderWidth - handleSize - 8 // 8px inside margin

  const pan = useRef(new RNAnimated.Value(0)).current

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        const val = Math.max(0, Math.min(gestureState.dx, maxDistance))
        pan.setValue(val)
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx >= maxDistance * 0.75) {
          // Slide fully completed! Animate handle to the end and navigate.
          RNAnimated.timing(pan, {
            toValue: maxDistance,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            router.push('/(auth)/login')
            // Spring back handle after transition completes
            setTimeout(() => {
              RNAnimated.spring(pan, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
              }).start()
            }, 1000)
          })
        } else {
          // Slide not completed, spring back to start
          RNAnimated.spring(pan, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  const textOpacity = pan.interpolate({
    inputRange: [0, maxDistance * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const textStyle = {
    opacity: textOpacity,
  }

  const handleStyle = {
    transform: [{ translateX: pan }],
  }

  useEffect(() => {
    titleY.value  = withSpring(0, { damping: 14, stiffness: 100 })
    titleOp.value = withTiming(1, { duration: 600 })

    badgeOp.value = withDelay(400, withTiming(1, { duration: 500 }))

    footerY.value  = withDelay(500, withSpring(0, { damping: 14, stiffness: 100 }))
    footerOp.value = withDelay(500, withTiming(1, { duration: 500 }))

    // Floating loop animations
    b0Y.value = withRepeat(withSequence(
      withTiming(-10, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,   { duration: 2800, easing: Easing.inOut(Easing.sin) }),
    ), -1, true)
    b1Y.value = withRepeat(withSequence(
      withTiming(12, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,  { duration: 3200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true)
    b2Y.value = withRepeat(withSequence(
      withTiming(-8, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,  { duration: 2400, easing: Easing.inOut(Easing.sin) }),
    ), -1, true)
  }, [])

  const titleStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: titleY.value }], opacity: titleOp.value }))
  const badgeStyle  = useAnimatedStyle(() => ({ opacity: badgeOp.value }))
  const footerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: footerY.value }], opacity: footerOp.value }))
  const b0Style = useAnimatedStyle(() => ({ transform: [{ translateY: b0Y.value }] }))
  const b1Style = useAnimatedStyle(() => ({ transform: [{ translateY: b1Y.value }] }))
  const b2Style = useAnimatedStyle(() => ({ transform: [{ translateY: b2Y.value }] }))

  const badgeStyles = [b0Style, b1Style, b2Style]

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen food background image with slight blur for high readability */}
      <ImageBackground
        source={require('../assets/food-bg.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={Platform.OS === 'ios' ? 4 : 3}
      >
        {/* Dark overlay at bottom for text readability */}
        <View style={s.overlay} />
      </ImageBackground>

      {/* App logo top-left (enlarged per request) */}
      <View style={[s.logoRow, { marginTop: insets.top + 16 }]}>
        <View style={s.logoBadge}>
          <Ionicons name="leaf" size={20} color="#fff" />
        </View>
        <Text style={s.logoText}>FitBite</Text>
      </View>

      {/* Title */}
      <Animated.View style={[s.titleWrap, titleStyle]}>
        <Text style={s.titleLine1}>Your Daily Guide to</Text>
        <Text style={s.titleLine2}>
          Smarter <Text style={s.titleAccent}>🌿</Text> Eating
        </Text>
        <Text style={s.subtitle}>
          Snap, track, and discover the{'\n'}nutrition behind every bite.
        </Text>
      </Animated.View>

      {/* Floating calorie badges */}
      <Animated.View style={[StyleSheet.absoluteFillObject, badgeStyle]} pointerEvents="none">
        {BADGES.map((b, i) => (
          <Animated.View key={i} style={[s.badge, { left: b.x, top: b.y }, badgeStyles[i]]}>
            <View style={[s.badgeDot, { backgroundColor: b.color }]} />
            <Text style={s.badgeText}>{b.label}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Floating Glassmorphism Footer panel */}
      <Animated.View style={[s.footer, { paddingBottom: insets.bottom + 12 }, footerStyle]}>
        {Platform.OS === 'ios' && <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />}

        {/* Premium Interactive Swipe-to-Start Button */}
        <View style={s.sliderTrack}>
          <RNAnimated.Text style={[s.sliderText, textStyle]}>
            Slide to Get Started  →
          </RNAnimated.Text>

          <RNAnimated.View
            {...panResponder.panHandlers}
            style={[s.sliderHandle, handleStyle]}
          >
            <Ionicons name="chevron-forward" size={20} color={ACCENT} />
          </RNAnimated.View>
        </View>

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => [s.loginBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.loginText}>Already have an account? <Text style={s.loginLink}>Log In</Text></Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a2e1a' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  logoText: {
    fontSize: 21, fontWeight: '900', color: '#fff',
    letterSpacing: -0.4,
  },

  // Title
  titleWrap: {
    position: 'absolute',
    top: '18%',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  titleLine1: {
    fontSize: 34, fontWeight: '800', color: '#fff',
    lineHeight: 40, letterSpacing: -0.5,
  },
  titleLine2: {
    fontSize: 34, fontWeight: '800', color: '#fff',
    lineHeight: 44, letterSpacing: -0.5,
  },
  titleAccent: { fontSize: 32 },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)',
    lineHeight: 22, marginTop: 12,
  },

  // Calorie badges
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeDot: {
    width: 8, height: 8, borderRadius: 999,
  },
  badgeText: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A',
  },

  // Floating Glassmorphism Footer Card
  footer: {
    position: 'absolute',
    bottom: 20, left: 16, right: 16,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
      default: {},
    }),
    gap: 16,
    alignItems: 'center',
    zIndex: 10,
  },

  // Swipe-to-Start Button styling
  sliderTrack: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'relative',
  },
  sliderText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sliderHandle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'grab' as any,
      },
      default: {},
    }),
  },

  loginBtn: { paddingVertical: 4 },
  loginText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  loginLink: { color: ACCENT, fontWeight: '700' },
})
