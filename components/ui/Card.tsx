import { View, StyleSheet, type ViewProps, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { GLASS_BG, GLASS_BORDER, CARD_RADIUS, AMBIENT_SHADOW } from '@/lib/theme'

interface CardProps extends ViewProps {
  /** Tighter padding */
  compact?: boolean
  /** Skip the blur background layer */
  noBlur?: boolean
}

/**
 * Generic glassmorphic container card.
 * Uses expo-blur on native and CSS backdrop-filter on web.
 */
export function Card({ compact, noBlur = false, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        compact ? styles.compact : styles.normal,
        style,
      ]}
      {...rest}
    >
      {!noBlur && (
        <BlurView
          intensity={70}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: CARD_RADIUS,
    borderWidth: 1.2,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
    ...AMBIENT_SHADOW,
    // Web backdrop filter support
    ...Platform.select({
      web: {
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
      },
      default: {},
    }),
  },
  normal: { padding: 16 },
  compact: { padding: 10 },
})

