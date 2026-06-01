import { View, StyleSheet, type ViewProps, Platform } from 'react-native'
import { BlurView } from 'expo-blur'

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
          intensity={65}
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
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.16)',
    overflow: 'hidden',
    // Premium green shadow glow
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    // Web backdrop filter support
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
      default: {},
    }),
  },
  normal: { padding: 16 },
  compact: { padding: 10 },
})

