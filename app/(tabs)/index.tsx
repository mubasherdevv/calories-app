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
import { useFoodLogs, useDeleteFoodLog, type FoodLog } from '@/hooks/useFoodLogs'
import { useGoals } from '@/hooks/useGoals'
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
  const { data: goals } = useGoals()
  const { data: foodLogs = [] } = useFoodLogs(activeDate)
  const { mutate: deleteFood } = useDeleteFoodLog()

  // ─── Computations ───
  const calorieGoal = goals?.calories ?? 2000
  const proteinGoal = goals?.protein ?? 130
  const carbsGoal = goals?.carbs ?? 220
  const fatGoal = goals?.fats ?? 65
  const streakCount = 5

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
      {/* Premium Linear Gradient Background */}
      <LinearGradient
        colors={['#F8FFF9', '#F3FFF6', '#ECFDF3']}
        style={StyleSheet.absoluteFill}
      />

      {/* Dynamic Background Blurring Glows (Green Glassmorphism Backdrop) */}
      <View style={s.blurGlow1} />
      <View style={s.blurGlow2} />
      <View style={s.blurGlow3} />

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
        contentContainerStyle={[s.scrollContent, { paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Compact Date & Streak Row ─── */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={s.calendarStreakRow}>
            {/* Calendar Card */}
            <View style={s.calendarCard}>
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
              <Ionicons name="calendar-outline" size={18} color="#22C55E" style={{ marginRight: 6 }} />
              <Text style={s.calendarDateText}>{activeFullDateString}</Text>

              <View style={s.calendarArrows}>
                <Pressable onPress={() => changeDate('back')} hitSlop={12} style={s.arrowBtn}>
                  <Ionicons name="chevron-back" size={12} color="#1A1A1A" />
                </Pressable>
                <Pressable onPress={() => changeDate('forward')} hitSlop={12} style={s.arrowBtn}>
                  <Ionicons name="chevron-forward" size={12} color="#1A1A1A" />
                </Pressable>
              </View>
            </View>

            {/* Streak Badge Card */}
            <View style={s.streakCard}>
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
              <Text style={s.streakText}>🔥 {streakCount} Day Streak</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Daily Calories Glass Card ─── */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)}>
          <View style={s.caloriesCard}>
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />

            {/* Diagonal Premium Glass Shine Overlay */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Floating Leaves (VisionOS Glass style) */}
            <View style={s.floatingLeaf1} pointerEvents="none">
              <Ionicons name="leaf-outline" size={14} color="rgba(34,197,94,0.3)" />
            </View>
            <View style={s.floatingLeaf2} pointerEvents="none">
              <Ionicons name="leaf" size={10} color="rgba(74,222,128,0.25)" />
            </View>
            <View style={s.floatingLeaf3} pointerEvents="none">
              <Ionicons name="leaf" size={12} color="rgba(34,197,94,0.18)" />
            </View>
            <View style={s.floatingLeaf4} pointerEvents="none">
              <Ionicons name="leaf-outline" size={15} color="rgba(74,222,128,0.22)" />
            </View>

            <Text style={s.caloriesSectionTitle}>✨ DAILY RESULT</Text>

            <View style={s.caloriesCardTop}>
              {/* Left: Salad & Bottle image */}
              <View style={s.caloriesCardImageContainer}>
                <Image
                  source={require('../../assets/img.png')}
                  style={s.caloriesCardImage}
                  resizeMode="contain"
                />
              </View>

              {/* Right: Calories Circular Ring */}
              <View style={s.caloriesCircleContainer}>
                <Svg width={130} height={130}>
                  <Circle
                    cx={65}
                    cy={65}
                    r={54}
                    stroke="rgba(34, 197, 94, 0.05)"
                    strokeWidth={8.5}
                    fill="transparent"
                  />
                  <Circle
                    cx={65}
                    cy={65}
                    r={54}
                    stroke="#22C55E"
                    strokeWidth={8.5}
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - calPercent)}
                    strokeLinecap="round"
                    transform="rotate(-90 65 65)"
                  />
                </Svg>
                <View style={s.caloriesCircleInner}>
                  <Ionicons name="leaf-outline" size={14} color="#22C55E" style={{ marginBottom: 1 }} />
                  <Text style={s.caloriesCircleLabel}>Calories Left</Text>
                  <Text style={s.caloriesCircleValue}>{remainingCalories}</Text>
                  <Text style={s.caloriesCircleSub}>kcal</Text>
                </View>
              </View>
            </View>

            {/* Bottom consistency banner button */}
            <View style={s.consistencyBar}>
              <Text style={s.consistencyText}>Stay consistent and hit your goal! 🎯</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Macros Grid ─── */}
        <Animated.View entering={FadeInDown.delay(150).duration(450)}>
          <View style={s.macrosSection}>
            <Text style={s.macrosTitle}>Macros</Text>
            <View style={s.macrosUnifiedCard}>
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
              <View style={s.macrosGridRow}>
                {/* Protein Column */}
                <MacroColumn
                  label="Protein"
                  current={totals.protein}
                  goal={proteinGoal}
                  color="#22C55E"
                  icon="leaf"
                  iconBg="#F0FDF4"
                  pillBg="rgba(34, 197, 94, 0.12)"
                />

                <View style={s.macroDivider} />

                {/* Carbs Column */}
                <MacroColumn
                  label="Carbs"
                  current={totals.carbs}
                  goal={carbsGoal}
                  color="#F59E0B"
                  icon="nutrition"
                  iconBg="#FFFBEB"
                  pillBg="rgba(245, 158, 11, 0.12)"
                />

                <View style={s.macroDivider} />

                {/* Fat Column */}
                <MacroColumn
                  label="Fat"
                  current={totals.fat}
                  goal={fatGoal}
                  color="#8B5CF6"
                  icon="water"
                  iconBg="#F5F3FF"
                  pillBg="rgba(139, 92, 246, 0.12)"
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ─── Today's Meals Section ─── */}
        <Animated.View entering={FadeInDown.delay(200).duration(450)}>
          <View style={s.mealsSection}>
            <View style={s.mealsHeaderRow}>
              <Text style={s.mealsTitle}>Today's Meals</Text>
              <Pressable onPress={() => router.push('/explore')} hitSlop={10}>
                <Text style={s.mealsViewAllText}>View All</Text>
              </Pressable>
            </View>

            {foodLogs.length === 0 ? (
              /* Empty state from reference mockup */
              <View style={s.emptyMealsCard}>
                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
                <View style={s.emptyMealsContent}>
                  <View style={s.emptyMealsIconContainer}>
                    <Ionicons name="clipboard-outline" size={24} color="#22C55E" />
                  </View>
                  <Text style={s.emptyMealsTitle}>No meals logged yet</Text>
                  <Text style={s.emptyMealsSubtitle}>Tap below to add your first meal</Text>

                  <Pressable
                    onPress={() => router.push('/scan')}
                    style={({ pressed }) => [s.addFoodScanBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={s.addFoodScanBtnText}>+ Add Food / Scan</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Normal categories list */
              <View style={s.mealsListContainer}>
                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
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
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// ─── Custom Macro Column Component ──────────────────────────────────────────

function MacroColumn({
  label,
  current,
  goal,
  color,
  icon,
  iconBg,
  pillBg,
}: {
  label: string
  current: number
  goal: number
  color: string
  icon: any
  iconBg: string
  pillBg: string
}) {
  const percent = Math.min(1.0, current / goal)

  return (
    <View style={s.macroColumn}>
      <Text style={[s.macroCardLabel, { color }]}>{label}</Text>
      <View style={[s.macroCardIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={s.macroCardVal}>{current}g</Text>
      <Text style={s.macroCardGoal}>/ {goal}g</Text>
      <View style={[s.macroPill, { backgroundColor: pillBg }]}>
        <Text style={[s.macroPillText, { color }]}>
          {Math.round(percent * 100)}%
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Green Blurring Backdrop Effects
  blurGlow1: {
    position: 'absolute',
    top: -40,
    left: -120,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(34, 197, 94, 0.28)',
    opacity: 1,
    transform: [{ scale: 1.3 }],
    filter: Platform.OS === 'web' ? 'blur(120px)' : undefined,
  },
  blurGlow2: {
    position: 'absolute',
    bottom: 100,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(74, 222, 128, 0.22)',
    opacity: 1,
    transform: [{ scale: 1.1 }],
    filter: Platform.OS === 'web' ? 'blur(150px)' : undefined,
  },
  blurGlow3: {
    position: 'absolute',
    top: '40%',
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
    opacity: 1,
    transform: [{ scale: 1.2 }],
    filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
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
    backgroundColor: '#22C55E',
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
    fontSize: 23,
    fontWeight: '900',
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
    backgroundColor: '#22C55E',
    borderWidth: 1.2,
    borderColor: '#FFF',
  },

  // Main scroll content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },

  // Calendar styling
  calendarStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarCard: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 28,
    paddingHorizontal: 12,
    height: 38,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
  },
  calendarDateText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  calendarArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 28,
    paddingHorizontal: 12,
    height: 38,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // Daily Calories Card
  caloriesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 28,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
    position: 'relative',
  },
  caloriesSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 2,
  },
  floatingLeaf1: {
    position: 'absolute',
    top: 15,
    left: 25,
    transform: [{ rotate: '35deg' }],
    zIndex: 5,
  },
  floatingLeaf2: {
    position: 'absolute',
    bottom: 55,
    left: 110,
    transform: [{ rotate: '-20deg' }],
    zIndex: 5,
  },
  floatingLeaf3: {
    position: 'absolute',
    top: 35,
    left: 130,
    transform: [{ rotate: '15deg' }],
    zIndex: 5,
  },
  floatingLeaf4: {
    position: 'absolute',
    top: 80,
    left: 15,
    transform: [{ rotate: '-45deg' }],
    zIndex: 5,
  },
  caloriesCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 10,
  },
  caloriesCardImageContainer: {
    flex: 1,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesCardImage: {
    width: '100%',
    height: '100%',
  },
  caloriesCircleContainer: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesCircleInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  caloriesCircleLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  caloriesCircleValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    marginVertical: 1,
  },
  caloriesCircleSub: {
    fontSize: 9,
    color: '#666',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  consistencyBar: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consistencyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Macros Section
  macrosSection: {
    gap: 10,
  },
  macrosTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingLeft: 2,
  },
  macrosUnifiedCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
  },
  macrosGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  macroColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  macroDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 4,
  },
  macroCardLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  macroCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCardVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  macroCardGoal: {
    fontSize: 10,
    color: '#777',
    fontWeight: '600',
    marginTop: -4,
  },
  macroPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  macroPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Meals Section
  mealsSection: {
    gap: 10,
  },
  mealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
  mealsListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 28,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
  },
  mealListWrap: {
    gap: 10,
    marginBottom: 14,
  },
  mealListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  mealImage: {
    width: 48,
    height: 48,
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

  // Empty Meals State
  emptyMealsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 28,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
  },
  emptyMealsContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  emptyMealsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    marginBottom: 4,
  },
  emptyMealsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  emptyMealsSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#777',
    marginBottom: 6,
  },
  addFoodScanBtn: {
    width: '100%',
    height: 46,
    backgroundColor: '#22C55E',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 3,
  },
  addFoodScanBtnText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
})

