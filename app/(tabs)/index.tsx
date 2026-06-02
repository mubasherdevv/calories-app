import React, { useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Dimensions,
  LayoutAnimation,
  Platform,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { BlurView } from 'expo-blur'

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
  PROTEIN_COLOR,
  CARBS_COLOR,
  FAT_COLOR,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useProfileGoals, useFoodLogs, useDeleteFoodLog, type FoodLog } from '@/hooks/useFoodLogs'
import { useProfile } from '@/hooks/useProfile'

const { width: SW } = Dimensions.get('window')

const MEAL_CATEGORIES = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    icon: 'cafe-outline',
    color: '#38bdf8',
    defaultImg: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=150&auto=format&fit=crop&q=60',
    time: '8:30 AM',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    icon: 'restaurant-outline',
    color: '#4ade80',
    defaultImg: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=60',
    time: '1:30 PM',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    icon: 'pizza-outline',
    color: '#fb7185',
    defaultImg: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&auto=format&fit=crop&q=60',
    time: '7:30 PM',
  },
  {
    key: 'snack',
    label: 'Snacks',
    icon: 'fast-food-outline',
    color: '#fbbf24',
    defaultImg: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=150&auto=format&fit=crop&q=60',
    time: '4:30 PM',
  },
] as const

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  // ─── Active Date State ───────────────────────────────────────────────────────
  const [activeDate, setActiveDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })

  // ─── Interactive Mockup States (Removed per user request) ───


  // ─── Data Queries ───────────────────────────────────────────────────────────
  const { data: profile } = useProfile()
  const { data: goals } = useProfileGoals()
  const { data: foodLogs = [] } = useFoodLogs(activeDate)
  const { mutate: deleteFood } = useDeleteFoodLog()

  // ─── Computations ───
  const calorieGoal = goals?.calorieGoal ?? 2000
  const proteinGoal = goals?.proteinGoal ?? 130
  const carbsGoal = goals?.carbsGoal ?? 220
  const fatGoal = goals?.fatGoal ?? 65
  const streakCount = goals?.streakCount ?? 5

  const totals = useMemo(() => {
    let cal = 0, prot = 0, carb = 0, ft = 0
    foodLogs.forEach((log) => {
      cal += log.calories
      prot += log.protein
      carb += log.carbs
      ft += log.fat
    })
    return { calories: cal, protein: Math.round(prot), carbs: Math.round(carb), fat: Math.round(ft) }
  }, [foodLogs])

  const remainingCalories = Math.max(0, calorieGoal - totals.calories)
  const isOverGoal = totals.calories > calorieGoal
  const calPercent = Math.min(1.0, totals.calories / calorieGoal)

  // Fasting Window Simulation
  const fastingHours = 20

  // Group logs by meal type
  const logsByMeal = useMemo(() => {
    const groups: Record<string, FoodLog[]> = { breakfast: [], lunch: [], dinner: [], snack: [] }
    foodLogs.forEach((log) => {
      if (groups[log.mealType]) {
        groups[log.mealType].push(log)
      }
    })
    return groups
  }, [foodLogs])

  // Month-Year formatted string (e.g. "May 2025")
  const activeMonthString = useMemo(() => {
    const d = new Date(`${activeDate}T12:00:00`)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [activeDate])

  // Full formatted date (e.g. "Mon, Jun 1")
  const activeFullDateString = useMemo(() => {
    const d = new Date(`${activeDate}T12:00:00`)
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
  }, [activeDate])

  // Dynamically compute the 7 days of the current week containing activeDate
  const currentWeekDays = useMemo(() => {
    const list = []
    const current = new Date(`${activeDate}T12:00:00`)
    const dayOfWeek = current.getDay() // 0 = Sunday, 1 = Monday, ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(current)
    monday.setDate(monday.getDate() + distanceToMonday)

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayNum = d.getDate()
      list.push({ dateStr, label, dayNum })
    }
    return list
  }, [activeDate])

  const changeDate = (direction: 'back' | 'forward') => {
    const d = new Date(`${activeDate}T12:00:00`)
    d.setDate(d.getDate() + (direction === 'back' ? -7 : 7)) // Jump week-by-week
    setActiveDate(d.toISOString().split('T')[0])
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['foodLogs', activeDate] })
    await queryClient.invalidateQueries({ queryKey: ['profileGoals'] })
    await queryClient.invalidateQueries({ queryKey: ['profile'] })
    setRefreshing(false)
  }

  const handleDelete = (id: string) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    }
    deleteFood({ id, dateString: activeDate })
  }

  const getGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good morning'
    if (hours < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <View style={s.root}>
      {/* Dynamic Background Blurring Glows (Green Glassmorphism Backdrop) */}
      <View style={s.blurGlow1} />
      <View style={s.blurGlow2} />

      {/* ─── Elegant User Greeting Header ─── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View style={s.coachProfile}>
            {/* Round avatar headshot with status dot */}
            <View style={s.avatarWrap}>
              <Image source={require('../../assets/avatar.jpg')} style={s.avatar as any} />
              <View style={s.statusDot} />
            </View>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={s.greetingLabel}>{getGreeting()},</Text>
              <Text style={s.userName} numberOfLines={1} ellipsizeMode="tail">{profile?.fullName ?? 'User'} 👋</Text>
              <Text style={s.greetingSubtitle} numberOfLines={1} ellipsizeMode="tail">Let's make today amazing!</Text>
            </View>
          </View>

          {/* Right actions: Notification bell */}
          <View style={s.headerRightActions}>
            <Pressable style={s.notificationBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={18} color={TEXT_PRIMARY} />
              <View style={s.notificationBadge} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: TAB_BAR_CLEARANCE + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Compact Date & Streak Card ─── */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card compact style={s.compactCalendarCard}>
            <View style={s.compactCalendarRow}>
              <View style={s.compactCalendarLeft}>
                <View style={s.compactCalendarDateContainer}>
                  <Ionicons name="calendar" size={16} color={ACCENT} style={{ marginRight: 6 }} />
                  <Text style={s.compactCalendarDate}>{activeFullDateString}</Text>
                </View>
                
                <View style={s.calendarArrowsGroup}>
                  <Pressable onPress={() => changeDate('back')} hitSlop={15} style={s.calendarArrow}>
                    <Ionicons name="chevron-back" size={13} color={TEXT_PRIMARY} />
                  </Pressable>
                  <Pressable onPress={() => changeDate('forward')} hitSlop={15} style={s.calendarArrow}>
                    <Ionicons name="chevron-forward" size={13} color={TEXT_PRIMARY} />
                  </Pressable>
                </View>
              </View>

              {/* Streak Badge moved here per user request */}
              <Animated.View entering={FadeIn.delay(200)} style={s.streakBadgeCalendar}>
                <Text style={s.streakIcon}>🔥</Text>
                <Text style={s.streakText}>{streakCount} Day Streak</Text>
              </Animated.View>
            </View>
          </Card>
        </Animated.View>


        {/* ─── Daily Result Glass Card ─── */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)}>
          <Card>
            <View style={s.dailyResultHeader}>
              <View style={s.dailyResultLabelWrap}>
                <Ionicons name="sparkles" size={16} color={ACCENT} style={{ marginRight: 6 }} />
                <Text style={s.dailyResultTitle}>Daily Result</Text>
              </View>
            </View>

            <View style={s.dailyResultSplitRow}>
              {/* Left Column: Big Calorie Circle with soft outer glow */}
              <View style={s.bigCalorieCircleContainer}>
                <Svg width={112} height={112}>
                  <Circle
                    cx={56}
                    cy={56}
                    r={48}
                    stroke="rgba(76, 175, 80, 0.05)"
                    strokeWidth={7}
                    fill="transparent"
                  />
                  <Circle
                    cx={56}
                    cy={56}
                    r={48}
                    stroke={ACCENT}
                    strokeWidth={7}
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - calPercent)}
                    strokeLinecap="round"
                    transform="rotate(-90 56 56)"
                  />
                </Svg>
                <View style={s.bigCircleInner}>
                  <Text style={s.bigCircleVal}>{remainingCalories}</Text>
                  <Text style={s.bigCircleLabel}>kcal{"\n"}remaining</Text>
                </View>
              </View>

              {/* Right Column: 3 Stats Summary Blocks container */}
              <View style={s.statsSummaryContainer}>
                {/* Block 1: Goal */}
                <View style={s.summaryBlock}>
                  <Ionicons name="disc-outline" size={18} color="#4CAF50" style={s.summaryIcon} />
                  <Text style={s.summaryVal}>{calorieGoal}</Text>
                  <Text style={s.summaryLabel}>Goal</Text>
                </View>

                <View style={s.summaryDivider} />

                {/* Block 2: Consumed */}
                <View style={s.summaryBlock}>
                  <Ionicons name="restaurant-outline" size={18} color="#4CAF50" style={s.summaryIcon} />
                  <Text style={s.summaryVal}>{totals.calories}</Text>
                  <Text style={s.summaryLabel}>Consumed</Text>
                </View>

                <View style={s.summaryDivider} />

                {/* Block 3: Hours Left */}
                <View style={s.summaryBlock}>
                  <Ionicons name="time-outline" size={18} color="#4CAF50" style={s.summaryIcon} />
                  <Text style={s.summaryVal}>{fastingHours}</Text>
                  <Text style={s.summaryLabel}>Hours Left</Text>
                </View>
              </View>
            </View>

            {/* Horizontal progress bar */}
            <View style={s.dailyResultProgressWrap}>
              <View style={s.progressBarTrack}>
                <View
                  style={[
                    s.progressBarFill,
                    {
                      width: `${calPercent * 100}%`,
                      backgroundColor: isOverGoal ? '#EF4444' : ACCENT,
                    },
                  ]}
                />
              </View>

              <View style={s.progressBarSubRow}>
                <Text style={s.progressPercentageText}>
                  {Math.round(calPercent * 100)}% of your daily goal
                </Text>
                <View style={s.encouragementBadge}>
                  <Ionicons name="leaf" size={11} color="#388E3C" style={{ marginRight: 3 }} />
                  <Text style={s.encouragementText}>You're doing great!</Text>
                </View>
              </View>
            </View>

            {/* Premium Macros Circular Progress Row */}
            <View style={s.circularMacrosGrid}>
              <MacroCircleProgress
                label="Protein"
                current={totals.protein}
                goal={proteinGoal}
                color={PROTEIN_COLOR}
              />
              <MacroCircleProgress
                label="Carbs"
                current={totals.carbs}
                goal={carbsGoal}
                color={CARBS_COLOR}
              />
              <MacroCircleProgress
                label="Fat"
                current={totals.fat}
                goal={fatGoal}
                color={FAT_COLOR}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Tracker section removed per user request */}


        {/* ─── Today's Meals Card ─── */}
        <Animated.View entering={FadeInDown.delay(200).duration(450)}>
          <Card>
            <View style={s.mealsHeaderRow}>
              <Text style={s.mealsTitle}>Today's Meals</Text>
              <Pressable onPress={() => router.push('/explore')} hitSlop={10}>
                <Text style={s.mealsViewAllText}>View All</Text>
              </Pressable>
            </View>

            <View style={s.mealListWrap}>
              {MEAL_CATEGORIES.map((cat) => {
                const logs = logsByMeal[cat.key] || []
                const catCalories = logs.reduce((sum, item) => sum + item.calories, 0)
                const foodsStr = logs.length > 0 ? logs.map((l) => l.name).join(', ') : 'No food items logged'

                const catProtein = Math.round(logs.reduce((sum, item) => sum + item.protein, 0))
                const catCarbs = Math.round(logs.reduce((sum, item) => sum + item.carbs, 0))
                const catFat = Math.round(logs.reduce((sum, item) => sum + item.fat, 0))

                return (
                  <View key={cat.key} style={s.mealListItem}>
                    <Image source={{ uri: cat.defaultImg }} style={s.mealImage as any} />
                    <View style={s.mealItemContent}>
                      <View style={s.mealItemTitleRow}>
                        <View style={s.mealItemNameGroup}>
                          <Text style={[s.mealItemName, { color: ACCENT }]}>{cat.label}</Text>
                          <Text style={s.mealItemTime}>• {cat.time}</Text>
                        </View>
                        <View style={s.mealItemValueGroup}>
                          {catCalories > 0 ? (
                            <Text style={s.mealItemKcal}>{catCalories} kcal</Text>
                          ) : (
                            <Text style={[s.mealItemKcal, { color: TEXT_TERTIARY }]}>0 kcal</Text>
                          )}
                          <Pressable
                            onPress={() => {
                              if (logs.length > 0) {
                                handleDelete(logs[0].id)
                              } else {
                                router.push('/scan')
                              }
                            }}
                            hitSlop={8}
                            style={s.moreBtn}
                          >
                            <Ionicons
                              name={logs.length > 0 ? 'trash-outline' : 'add-circle-outline'}
                              size={15}
                              color={logs.length > 0 ? '#EF4444' : ACCENT}
                            />
                          </Pressable>
                        </View>
                      </View>
                      <Text style={s.mealItemDesc} numberOfLines={1}>
                        {foodsStr}
                      </Text>

                      {/* Macros split row underneath */}
                      <View style={s.mealItemMacrosRow}>
                        <View style={s.miniSplitTag}>
                          <Text style={[s.miniSplitText, { color: PROTEIN_COLOR }]}>P <Text style={{ color: TEXT_PRIMARY }}>{catProtein}g</Text></Text>
                        </View>
                        <View style={s.miniSplitTag}>
                          <Text style={[s.miniSplitText, { color: CARBS_COLOR }]}>C <Text style={{ color: TEXT_PRIMARY }}>{catCarbs}g</Text></Text>
                        </View>
                        <View style={s.miniSplitTag}>
                          <Text style={[s.miniSplitText, { color: FAT_COLOR }]}>F <Text style={{ color: TEXT_PRIMARY }}>{catFat}g</Text></Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>

            {/* Bottom Add button */}
            <Pressable
              onPress={() => router.push('/scan')}
              style={({ pressed }) => [s.addMoreFoodBtn, pressed && s.addMoreFoodBtnPressed]}
            >
              <Ionicons name="add" size={16} color={ACCENT} style={{ marginRight: 4 }} />
              <Text style={s.addMoreFoodBtnText}>Add More Food</Text>
            </Pressable>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// ─── Custom Macro Circle Progress Component ──────────────────────────────────

function MacroCircleProgress({
  label,
  current,
  goal,
  color,
  progressColor,
  isDarkTheme,
}: {
  label: string
  current: number
  goal: number
  color: string
  progressColor?: string
  isDarkTheme?: boolean
}) {
  const radius = 17
  const strokeWidth = 3.5
  const circ = 2 * Math.PI * radius
  const percent = Math.min(1.0, current / goal)
  const strokeDashoffset = circ * (1 - percent)

  const activeColor = progressColor || color

  return (
    <Card
      compact
      noBlur={isDarkTheme}
      style={[
        s.macroRowBlockCard,
        isDarkTheme && s.macroRowBlockCardDark,
      ]}
    >
      <View style={s.macroRowBlockInner}>
        {/* Left: Circle SVG */}
        <View style={s.macroCircleSvgWrap}>
          <Svg width={38} height={38}>
            <Circle
              cx={19}
              cy={19}
              r={radius}
              stroke={isDarkTheme ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.03)'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={19}
              cy={19}
              r={radius}
              stroke={activeColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circ}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 19 19)"
            />
          </Svg>
          <View style={s.circleCenterText}>
            <Text style={[s.macroPercentageText, { color: activeColor }]}>{Math.round(percent * 100)}%</Text>
          </View>
        </View>

        {/* Right: Text descriptions */}
        <View style={s.macroRowTextGroup}>
          <Text style={[s.macroRowLabel, { color: isDarkTheme ? '#FFFFFF' : color }]}>{label}</Text>
          <Text style={isDarkTheme ? s.macroRowValWhite : s.macroRowVal}>{current}g</Text>
          <Text style={isDarkTheme ? s.macroRowSubValWhite : s.macroRowSubVal}>/ {goal}g</Text>
        </View>
      </View>
    </Card>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Green Blurring Backdrop Effects
  blurGlow1: {
    position: 'absolute',
    top: 150,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
  },
  blurGlow2: {
    position: 'absolute',
    bottom: 200,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    filter: Platform.OS === 'web' ? 'blur(120px)' : undefined,
  },

  // Greeting Header
  header: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    paddingBottom: 10,
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
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 20,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  greetingLabel: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  userName: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginTop: 1,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 11.5,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    marginTop: 1.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakIcon: { fontSize: 12 },
  streakText: {
    color: '#D97706',
    fontSize: 11.5,
    fontWeight: '800',
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4CAF50',
    borderWidth: 1.2,
    borderColor: '#FFF',
  },

  // Main scroll content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },

  // Glassmorphic Card Style (green blurring & clean drop shadow)
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.14)',
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  // Calendar styling
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  calendarArrowsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarArrow: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayItem: {
    alignItems: 'center',
    paddingVertical: 8,
    width: (SW - 72) / 7,
    borderRadius: 14,
  },
  calendarDaySelected: {
    backgroundColor: ACCENT,
  },
  calendarDayName: {
    fontSize: 9.5,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
  },
  calendarDayNameSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  calendarDayNum: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  calendarDayNumSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 4,
  },

  // Daily Result values
  dailyResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dailyResultLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyResultTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Split view Daily Result
  dailyResultSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  bigCalorieCircleContainer: {
    position: 'relative',
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCircleInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bigCircleVal: {
    fontSize: 24,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 26,
  },
  bigCircleLabel: {
    fontSize: 8.5,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 1.5,
    lineHeight: 10,
  },
  statsSummaryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.08)',
  },
  summaryBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIcon: {
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 14.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  summaryLabel: {
    fontSize: 9.5,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  // Daily result progress bar
  dailyResultProgressWrap: {
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressBarSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressPercentageText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  encouragementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  encouragementText: {
    fontSize: 10.5,
    color: '#2E7D32',
    fontWeight: '700',
  },

  // Circular Macros Progress Row (3 circles side by side)
  circularMacrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    paddingTop: 14,
    gap: 8,
  },

  // Macro Row Blocks inside Daily Result
  macroRowBlockCard: {
    flex: 1,
    padding: 8,
    borderRadius: 14,
  },
  macroRowBlockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroCircleSvgWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPercentageText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  circleCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  macroRowTextGroup: {
    flex: 1,
    flexDirection: 'column',
  },
  macroRowLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  macroRowVal: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginTop: 1,
  },
  macroRowSubVal: {
    fontSize: 9,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // 4 Tracker indicators cards row
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  trackerCard: {
    flex: 1,
  },
  trackerGlassCard: {
    padding: 10,
    alignItems: 'center',
    height: 122,
    justifyContent: 'space-between',
  },
  trackerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trackerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  trackerVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    marginTop: 2,
  },
  trackerSub: {
    fontSize: 9.5,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    marginTop: 1,
  },
  trackerLineTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  trackerLineFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // Meals Section styling
  mealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  mealsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  mealsViewAllText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: ACCENT,
  },
  mealListWrap: {
    gap: 12,
    marginBottom: 14,
  },
  mealListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.08)',
  },
  mealImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  mealItemContent: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  mealItemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealItemNameGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  mealItemName: {
    fontSize: 14,
    fontWeight: '800',
  },
  mealItemTime: {
    fontSize: 10.5,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },
  mealItemValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealItemKcal: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
  },
  moreBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  mealItemDesc: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  mealItemMacrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miniSplitTag: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  miniSplitText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Add more food button
  addMoreFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.22)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  addMoreFoodBtnPressed: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  },
  addMoreFoodBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: ACCENT,
  },

  // Compact Calendar/Date styling
  compactCalendarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.14)',
  },
  compactCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  compactCalendarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactCalendarDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCalendarDate: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  streakBadgeCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  // Daily Result Green Card styling
  dailyResultGreenCard: {
    backgroundColor: '#388E3C', // Premium vibrant brand green
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#388E3C',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  bigCircleValWhite: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  bigCircleLabelWhite: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.76)',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  summaryValWhite: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  summaryLabelWhite: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '600',
    marginTop: 1,
  },
  summaryDividerWhite: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarTrackWhite: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressBarFillWhite: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  progressPercentageTextWhite: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  encouragementBadgeWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  encouragementTextWhite: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  macroRowBlockCardDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  macroRowValWhite: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  macroRowSubValWhite: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
})
