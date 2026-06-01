import React, { useMemo, useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  ACCENT,
  ACCENT_DIM,
  ACCENT_BORDER,
  BG,
  SURFACE,
  SURFACE2,
  SURFACE3,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useProfileGoals, useFoodLogs } from '@/hooks/useFoodLogs'

interface Message {
  id: string
  sender: 'ai' | 'user'
  text: string
  timestamp: string
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()

  // ─── Data Queries ───
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: goals } = useProfileGoals()
  const { data: foodLogs = [] } = useFoodLogs(todayStr)

  const calorieGoal = goals?.calorieGoal ?? 2000
  const proteinGoal = goals?.proteinGoal ?? 130

  // ─── Computations ───
  const totals = useMemo(() => {
    let cal = 0, prot = 0
    foodLogs.forEach((log) => {
      cal += log.calories
      prot += log.protein
    })
    return { calories: cal, protein: Math.round(prot) }
  }, [foodLogs])

  // Initial greeting coach message based on today's logs
  const getCoachGreeting = () => {
    if (foodLogs.length === 0) {
      return "Hi! I'm your AI Nutrition Coach. 🥑 I don't see any meals logged for today yet. Take a photo of your breakfast, lunch, or snack, and let's check your nutrition!"
    }
    if (totals.calories > calorieGoal) {
      return `You have reached ${totals.calories} kcal today, which is slightly above your daily goal of ${calorieGoal} kcal. Don't worry, every journey has its fluctuations! Try emphasizing low-fat, high-protein foods tomorrow to remain satiated.`
    }
    if (totals.protein < proteinGoal * 0.4) {
      return `You have logged ${totals.calories} calories so far, but your protein is quite low at ${totals.protein}g (target ${proteinGoal}g). Consider incorporating a lean chicken wrap or a whey shake to recover muscle fibers!`
    }
    return `Looking excellent! You are currently at ${totals.calories} / ${calorieGoal} kcal with solid macro distributions. Keep up the amazing consistency!`
  }

  // ─── Chat States ───
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Hydrate initial chat greeting
  useEffect(() => {
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: getCoachGreeting(),
        timestamp: 'Just now',
      },
    ])
  }, [foodLogs])

  const handleActionClick = (actionType: 'macros' | 'recipe' | 'streak') => {
    if (isLoading) return

    const userText =
      actionType === 'macros'
        ? 'Can you analyze my macro balance?'
        : actionType === 'recipe'
        ? 'Give me a quick high-protein snack recipe'
        : 'How is my streak doing?'

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: 'Just now',
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI computing deep physiological answer
    setTimeout(() => {
      let aiText = ''
      if (actionType === 'macros') {
        const pRatio = totals.protein * 4
        const cKcal = totals.calories || 1
        const pPercent = Math.min(100, Math.round((pRatio / cKcal) * 100))
        aiText = `Based on your logs, Protein contributes ${pPercent}% of your active energy today. Ideal is 25-35%. ${
          pPercent < 25
            ? 'Consider increasing egg whites, cottage cheese, or fish to balance ratios.'
            : 'Your amino acid distribution is optimal for thermogenesis & recovery!'
        }`
      } else if (actionType === 'recipe') {
        aiText = `Here is a 5-minute **AI Power Snack**:\n\n• **Ingredients**: 150g Greek Yogurt, 1 scoop Whey Protein, 10g almond slices.\n• **Macros**: 280 kcal | 32g Protein | 10g Carbs | 8g Fat.\n\nStir the protein powder into yogurt until smooth, top with almonds, and enjoy!`
      } else {
        aiText = `You are currently on a 🔥 **${goals?.streakCount ?? 5}-Day Log Streak**! Consistently scanning your food daily trains your brain's awareness, reinforcing fat loss or muscle gain systems automatically. Keep it going!`
      }

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiText,
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1800)
  }

  return (
    <View style={s.root}>
      {/* ─── Premium Light Header ─── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View style={s.coachProfile}>
            <View style={s.avatarWrap}>
              <Text style={{ fontSize: 22 }}>🥑</Text>
              <View style={s.statusDot} />
            </View>
            <View>
              <Text style={s.coachName}>AI Nutrition Coach</Text>
              <Text style={s.coachActive}>Online • Cal AI assistant</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── Chat Messages Scroll ─── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.chatContainer, { paddingBottom: TAB_BAR_CLEARANCE + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai'
          return (
            <Animated.View
              key={msg.id}
              entering={FadeInDown.duration(350)}
              style={[s.bubbleWrap, isAi ? s.aiWrap : s.userWrap]}
            >
              <View style={[s.bubble, isAi ? s.aiBubble : s.userBubble]}>
                {isAi && (
                  <BlurView
                    intensity={40}
                    tint="light"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[s.bubbleText, isAi ? s.aiText : s.userText]}>
                  {msg.text}
                </Text>
              </View>
            </Animated.View>
          )
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <Animated.View entering={FadeIn.duration(150)} style={[s.bubbleWrap, s.aiWrap]}>
            <View style={[s.bubble, s.aiBubble, s.loadingBubble]}>
              <BlurView
                intensity={40}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={s.loadingText}>AI Coach is composing a reply...</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* ─── Coach Instant Action Prompts ─── */}
      <View style={[s.actionFooter, { bottom: TAB_BAR_CLEARANCE + 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.footerScroll}>
          <Pressable
            onPress={() => handleActionClick('macros')}
            disabled={isLoading}
            style={({ pressed }) => [s.actionChip, isLoading && { opacity: 0.5 }, pressed && s.chipPressed]}
          >
            <Ionicons name="pie-chart-outline" size={14} color={ACCENT} />
            <Text style={s.actionChipText}>Analyze Macros</Text>
          </Pressable>

          <Pressable
            onPress={() => handleActionClick('recipe')}
            disabled={isLoading}
            style={({ pressed }) => [s.actionChip, isLoading && { opacity: 0.5 }, pressed && s.chipPressed]}
          >
            <Ionicons name="book-outline" size={14} color={ACCENT} />
            <Text style={s.actionChipText}>Get Snack Recipe</Text>
          </Pressable>

          <Pressable
            onPress={() => handleActionClick('streak')}
            disabled={isLoading}
            style={({ pressed }) => [s.actionChip, isLoading && { opacity: 0.5 }, pressed && s.chipPressed]}
          >
            <Ionicons name="flame-outline" size={14} color={ACCENT} />
            <Text style={s.actionChipText}>Streak Status</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header styles
  header: {
    paddingHorizontal: 20,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: BG,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  coachActive: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Chat layout
  chatContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  bubbleWrap: {
    flexDirection: 'row',
    width: '100%',
  },
  aiWrap: {
    justifyContent: 'flex-start',
  },
  userWrap: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.14)',
    borderTopLeftRadius: 4,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
      },
      default: {},
    }),
  },
  userBubble: {
    backgroundColor: ACCENT,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiText: {
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  userText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // Footer action prompts
  actionFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingVertical: 12,
  },
  footerScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: SURFACE2,
    opacity: 0.9,
  },
  actionChipText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '800',
  },
})
