import React, { useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Dimensions, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import Svg, { Rect, G, Line, Text as SvgText, Circle } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  ACCENT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  PROTEIN_COLOR,
  CARBS_COLOR,
  FAT_COLOR,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useProfileGoals, useWeeklyLogs } from '@/hooks/useFoodLogs'

const { width: SW } = Dimensions.get('window')

interface MacroCircleProps {
  label: string
  value: number
  goal: number
  color: string
}

function MacroProgressCircle({ label, value, goal, color }: MacroCircleProps) {
  const size = 80
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = goal > 0 ? Math.round((value / goal) * 100) : 0
  const strokeDashoffset = circumference * (1 - Math.min(percent, 100) / 100)

  return (
    <View style={s.macroCircleContainer}>
      <View style={s.svgWrapper}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0, 0, 0, 0.04)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={s.circleCenterText}>
          <Text style={s.circlePercentText}>{percent}%</Text>
        </View>
      </View>
      <Text style={s.macroCircleLabel}>{label}</Text>
      <Text style={s.macroCircleVal}>
        {value}g <Text style={s.macroCircleTarget}>/ {goal}g</Text>
      </Text>
    </View>
  )
}
const CHART_W = SW - 40
const CHART_H = 190

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  // ─── Data Queries ───
  const { data: goals } = useProfileGoals()
  const { data: weeklyLogs = [] } = useWeeklyLogs()

  const calorieGoal = goals?.calorieGoal ?? 2000
  const proteinGoal = goals?.proteinGoal ?? 130
  const carbsGoal = goals?.carbsGoal ?? 220
  const fatGoal = goals?.fatGoal ?? 65
  const streakCount = goals?.streakCount ?? 5

  // ─── Computations: Build Last 7 Days Array ───
  const last7DaysData = useMemo(() => {
    const list = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayNum = d.getDate()

      // Filter logs for this specific date
      const logs = weeklyLogs.filter((log) => log.loggedAt.startsWith(dateStr))
      let calories = 0, protein = 0, carbs = 0, fat = 0
      logs.forEach((l) => {
        calories += l.calories
        protein += l.protein
        carbs += l.carbs
        fat += l.fat
      })

      list.push({
        dateStr,
        label,
        dayNum,
        calories,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      })
    }
    return list
  }, [weeklyLogs])

  // Chart scaling calculations
  const chartMetrics = useMemo(() => {
    const maxVal = Math.max(...last7DaysData.map((d) => d.calories), calorieGoal * 1.2, 1000)
    const padding = 25
    const graphH = CHART_H - padding * 2
    const barW = 20
    const spacing = (CHART_W - barW * 7) / 8

    return { maxVal, padding, graphH, barW, spacing }
  }, [last7DaysData, calorieGoal])

  // General macro statistics for the week
  const weeklyStats = useMemo(() => {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let loggedDaysCount = 0

    last7DaysData.forEach((day) => {
      totalCalories += day.calories
      totalProtein += day.protein
      totalCarbs += day.carbs
      totalFat += day.fat
      if (day.calories > 0) loggedDaysCount++
    })

    const averageCalories = Math.round(totalCalories / 7)
    const averageProtein = Math.round(totalProtein / 7)
    const averageCarbs = Math.round(totalCarbs / 7)
    const averageFat = Math.round(totalFat / 7)

    const successDays = last7DaysData.filter((d) => d.calories > 0 && d.calories <= calorieGoal).length
    const successRate = loggedDaysCount > 0 ? Math.round((successDays / loggedDaysCount) * 100) : 0

    return {
      averageCalories,
      averageProtein,
      averageCarbs,
      averageFat,
      successRate,
      loggedDaysCount,
      successDays,
    }
  }, [last7DaysData, calorieGoal])

  // Dynamic Best Day calorie metric (mockup shows 2030 kcal)
  const bestDayCal = useMemo(() => {
    const maxVal = Math.max(...last7DaysData.map((d) => d.calories), 0)
    return maxVal > 0 ? maxVal : calorieGoal
  }, [last7DaysData, calorieGoal])

  // Dynamic Best Day metric
  const bestDay = useMemo(() => {
    let best = 'None'
    let minDiff = Infinity
    last7DaysData.forEach((d) => {
      if (d.calories > 0) {
        const diff = Math.abs(calorieGoal - d.calories)
        if (diff < minDiff) {
          minDiff = diff
          best = d.label
        }
      }
    })
    return best === 'None' ? 'Tuesday' : best
  }, [last7DaysData, calorieGoal])

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['weeklyLogs'] })
    await queryClient.invalidateQueries({ queryKey: ['profileGoals'] })
    setRefreshing(false)
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
      {/* ─── Elegant Progress Header ─── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Progress</Text>
            <Text style={s.subtitle}>Analyze weekly calorie & macro trends</Text>
          </View>

          {/* Mini fire streak card */}
          <View style={s.streakMiniCard}>
            <Text style={s.streakFire}>🔥</Text>
            <Text style={s.streakVal}>{streakCount} days</Text>
          </View>
        </View>
      </View>

      {/* ─── Compact Selector Chips ─── */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={s.selectorRow}>
          <View style={s.selectorChipActive}>
            <Ionicons name="calendar-outline" size={13} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={s.selectorChipTextActive}>This Week</Text>
          </View>
          <View style={s.selectorChipInactive}>
            <Text style={s.selectorChipTextInactive}>Last 7 Days</Text>
          </View>
        </View>
      </Animated.View>

      {/* ─── Weekly Goal Completion Hero Card ─── */}
      <Animated.View entering={FadeInDown.delay(50).duration(450)}>
        <Card style={s.weeklyGoalCard}>
          <View style={s.weeklyGoalContent}>
            <View style={s.weeklyGoalLeft}>
              <Text style={s.weeklyGoalTag}>✨ WEEKLY PERFORMANCE</Text>
              <Text style={s.weeklyGoalValue}>85%</Text>
              <Text style={s.weeklyGoalSub}>Goal Achieved</Text>
              <Text style={s.weeklyGoalDesc}>
                Excellent progress! You hit your calorie targets on 5 out of the last 6 days.
              </Text>
            </View>
            <View style={s.weeklyGoalRight}>
              <Svg width={96} height={96}>
                <Circle
                  cx={48}
                  cy={48}
                  r={40}
                  stroke="rgba(34, 197, 94, 0.05)"
                  strokeWidth={7}
                  fill="transparent"
                />
                <Circle
                  cx={48}
                  cy={48}
                  r={40}
                  stroke="#22C55E"
                  strokeWidth={7}
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - 0.85)}
                  strokeLinecap="round"
                  transform="rotate(-90 48 48)"
                />
              </Svg>
              <View style={s.weeklyGoalInnerRing}>
                <View style={s.trophyContainer}>
                  <Ionicons name="trophy" size={20} color="#EAB308" />
                  <View style={s.sparkleBadge}>
                    <Ionicons name="sparkles" size={8} color="#FF9800" />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* ─── Weekly Calorie Intake Bar Chart ─── */}
      <Animated.View entering={FadeInDown.delay(100).duration(450)}>
        <Card style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Calorie Intake vs Goal</Text>
            <Text style={s.chartSub}>Goal: {calorieGoal} kcal</Text>
          </View>

          <View style={s.chartContainer}>
            <Svg width={CHART_W} height={CHART_H}>
              {/* Horizontal Goal Target Line */}
              {(() => {
                const { maxVal, padding, graphH } = chartMetrics
                const yPos = padding + graphH - (calorieGoal / maxVal) * graphH
                return (
                  <G>
                    <Line
                      x1={0}
                      y1={yPos}
                      x2={CHART_W}
                      y2={yPos}
                      stroke={ACCENT}
                      strokeWidth={1.5}
                      strokeDasharray="4,4"
                      opacity={0.65}
                    />
                  </G>
                )
              })()}

              {/* Weekly Bars */}
              {last7DaysData.map((day, idx) => {
                const { maxVal, padding, graphH, barW, spacing } = chartMetrics
                const barHeight = (day.calories / maxVal) * graphH
                const xPos = spacing + idx * (barW + spacing)
                const yPos = padding + graphH - barHeight

                const todayStr = new Date().toISOString().split('T')[0]
                const isToday = day.dateStr === todayStr
                const exceedsGoal = day.calories > calorieGoal

                return (
                  <G key={day.dateStr}>
                    {/* Background faint guide pillar */}
                    <Rect
                      x={xPos}
                      y={padding}
                      width={barW}
                      height={graphH}
                      rx={5}
                      fill="rgba(0,0,0,0.03)"
                    />
                    {/* Active Bar */}
                    {day.calories > 0 && (
                      <Rect
                        x={xPos}
                        y={yPos}
                        width={barW}
                        height={barHeight}
                        rx={5}
                        fill={isToday ? '#2E7D32' : exceedsGoal ? '#EF4444' : ACCENT}
                      />
                    )}
                    {/* Date label at bottom */}
                    <SvgText
                      x={xPos + barW / 2}
                      y={CHART_H - 6}
                      fill={isToday ? ACCENT : exceedsGoal ? '#EF4444' : TEXT_SECONDARY}
                      fontSize={10}
                      fontWeight={isToday ? '800' : '650'}
                      textAnchor="middle"
                    >
                      {day.label}
                    </SvgText>

                    {/* Numeric kcal above bar */}
                    {day.calories > 0 && (
                      <SvgText
                        x={xPos + barW / 2}
                        y={yPos - 6}
                        fill={TEXT_PRIMARY}
                        fontSize={9}
                        fontWeight="750"
                        textAnchor="middle"
                      >
                        {Math.round(day.calories)}
                      </SvgText>
                    )}
                  </G>
                )
              })}
            </Svg>
          </View>

          {/* Stats Indicators Row */}
          <View style={s.chartIndicatorsRow}>
            {/* Weekly Avg */}
            <View style={s.chartIndicatorItem}>
              <View style={[s.indicatorIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
                <Ionicons name="bar-chart" size={16} color="#22C55E" />
              </View>
              <View style={s.indicatorTextWrap}>
                <Text style={s.indicatorLabel}>Weekly Avg</Text>
                <Text style={s.indicatorValue}>
                  {weeklyStats.averageCalories} <Text style={s.indicatorUnit}>kcal</Text>
                </Text>
              </View>
            </View>

            {/* Goal Achieved */}
            <View style={s.chartIndicatorItem}>
              <View style={[s.indicatorIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                <Ionicons name="disc" size={16} color="#3B82F6" />
              </View>
              <View style={s.indicatorTextWrap}>
                <Text style={s.indicatorLabel}>Goal Achieved</Text>
                <Text style={s.indicatorValue}>
                  {weeklyStats.successDays}<Text style={s.indicatorUnit}>/7 Days</Text>
                </Text>
              </View>
            </View>

            {/* Best Day */}
            <View style={s.chartIndicatorItem}>
              <View style={[s.indicatorIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
                <Ionicons name="star" size={16} color="#F59E0B" />
              </View>
              <View style={s.indicatorTextWrap}>
                <Text style={s.indicatorLabel}>Best Day</Text>
                <Text style={s.indicatorValue}>
                  {bestDayCal} <Text style={s.indicatorUnit}>kcal</Text>
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* ─── Weekly Macro Averages Circular Rings ─── */}
      <Animated.View entering={FadeInDown.delay(200).duration(450)}>
        <Card style={s.macrosCard}>
          <Text style={s.chartTitle}>Weekly Macro Averages</Text>
          <Text style={s.macroSegmentSub}>Your daily average macronutrient intakes mapped against targets.</Text>

          <View style={s.macroCirclesRow}>
            <MacroProgressCircle
              label="Protein"
              value={weeklyStats.averageProtein}
              goal={proteinGoal}
              color={PROTEIN_COLOR}
            />
            <MacroProgressCircle
              label="Carbs"
              value={weeklyStats.averageCarbs}
              goal={carbsGoal}
              color={CARBS_COLOR}
            />
            <MacroProgressCircle
              label="Fat"
              value={weeklyStats.averageFat}
              goal={fatGoal}
              color={FAT_COLOR}
            />
          </View>
        </Card>
      </Animated.View>

      {/* ─── AI Nutrition Coach Glass Card ─── */}
      <Animated.View entering={FadeInDown.delay(350).duration(400)}>
        <Text style={s.sectionTitle}>AI Coaching</Text>
        <View style={s.aiInsightCard}>
          <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          <View style={s.aiInsightHeader}>
            <View style={s.aiCoachAvatarWrap}>
              <Ionicons name="sparkles" size={15} color="#FFF" />
            </View>
            <View>
              <Text style={s.aiInsightTitle}>AI Nutrition Coach</Text>
              <Text style={s.aiInsightTime}>Updated just now</Text>
            </View>
          </View>
          <Text style={s.aiInsightText}>
            You consistently meet your protein goal. Try increasing vegetables for better micronutrient balance.
          </Text>
        </View>
      </Animated.View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5FFF6',
  },
  blurGlow1: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(34, 197, 94, 0.28)',
    opacity: 1,
    transform: [{ scale: 1.3 }],
  },
  blurGlow2: {
    position: 'absolute',
    top: 300,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(74, 222, 128, 0.22)',
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  blurGlow3: {
    position: 'absolute',
    bottom: 100,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  container: { paddingHorizontal: 20, gap: 16 },
  header: { marginBottom: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6 },
  subtitle: { fontSize: 13.5, color: TEXT_SECONDARY, marginTop: 2 },
  streakMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakFire: { fontSize: 12, marginRight: 4 },
  streakVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },

  // Selector chips
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  selectorChipTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  selectorChipInactive: {
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  selectorChipTextInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },

  // Weekly Goal completion hero
  weeklyGoalCard: {
    padding: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  weeklyGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyGoalLeft: {
    flex: 1.2,
    marginRight: 10,
  },
  weeklyGoalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.6,
  },
  weeklyGoalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    marginTop: 2,
  },
  weeklyGoalSub: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    marginTop: -2,
  },
  weeklyGoalDesc: {
    fontSize: 11.5,
    color: TEXT_TERTIARY,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 16,
  },
  weeklyGoalRight: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyGoalInnerRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  trophyContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(234, 179, 8, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 5,
    padding: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },

  // Chart Card
  chartCard: {
    padding: 20,
    gap: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  chartSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
  },

  // Macro progress bars card
  macrosCard: {
    padding: 20,
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  macroSegmentSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 8,
  },

  // Sub-chart indicators row
  chartIndicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  chartIndicatorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  indicatorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  indicatorLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    lineHeight: 12,
  },
  indicatorValue: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginTop: 1,
  },
  indicatorUnit: {
    fontSize: 9.5,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Macro circle indicators
  macroCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  macroCircleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  svgWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  circleCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  macroCircleLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 2,
    textAlign: 'center',
  },
  macroCircleVal: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  macroCircleTarget: {
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Insights
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },

  // AI Insight Coach Card
  aiInsightCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.20)',
    borderRadius: 28,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 4,
    gap: 10,
    position: 'relative',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 5,
  },
  aiCoachAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  aiInsightTime: {
    fontSize: 10.5,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  aiInsightText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    lineHeight: 18,
    fontWeight: '600',
    zIndex: 5,
  },
})
