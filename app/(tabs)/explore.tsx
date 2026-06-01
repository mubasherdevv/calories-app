import React, { useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import Svg, { Rect, Line, Text as SvgText, G, Circle } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  BORDER,
  SURFACE,
  SURFACE2,
  SURFACE3,
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
    }
  }, [last7DaysData, calorieGoal])

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['weeklyLogs'] })
    await queryClient.invalidateQueries({ queryKey: ['profileGoals'] })
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 30 }]}
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

      <Animated.View entering={FadeInDown.duration(400)}>
        <Card style={s.calendarStrip} compact>
          {last7DaysData.map((day) => {
            const todayStr = new Date().toISOString().split('T')[0]
            const isToday = day.dateStr === todayStr
            const hasLogs = day.calories > 0

            return (
              <View
                key={day.dateStr}
                style={[
                  s.calendarDayCard,
                  isToday && { backgroundColor: ACCENT, borderColor: ACCENT },
                ]}
              >
                <Text style={[s.calendarDayLabel, isToday && { color: '#fff' }]}>
                  {day.label}
                </Text>
                <Text style={[s.calendarDayNum, isToday && { color: '#fff' }]}>
                  {day.dayNum}
                </Text>
                {hasLogs && (
                  <View style={[s.loggedDot, isToday && { backgroundColor: '#fff' }]} />
                )}
              </View>
            )
          })}
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
        </Card>
      </Animated.View>

      {/* ─── Circular Weekly Macro Averages ─── */}
      <Animated.View entering={FadeInDown.delay(200).duration(450)}>
        <Card style={s.macrosCard}>
          <Text style={s.chartTitle}>Weekly Macro Averages</Text>
          <Text style={s.macroSegmentSub}>Your average daily macronutrient intakes mapped against targets.</Text>

          <View style={s.macroCirclesRow}>
            <MacroProgressCircle
              label="Protein"
              current={weeklyStats.averageProtein}
              goal={proteinGoal}
              color={PROTEIN_COLOR}
              unit="g"
            />
            <MacroProgressCircle
              label="Carbs"
              current={weeklyStats.averageCarbs}
              goal={carbsGoal}
              color={CARBS_COLOR}
              unit="g"
            />
            <MacroProgressCircle
              label="Fat"
              current={weeklyStats.averageFat}
              goal={fatGoal}
              color={FAT_COLOR}
              unit="g"
            />
          </View>
        </Card>
      </Animated.View>

      {/* ─── Health Insights Grid ─── */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={s.sectionTitle}>Weekly Insights</Text>
        <View style={s.insightsGrid}>
          <Card style={s.insightCard}>
            <View style={s.insightIconContainer}>
              <Ionicons name="flame-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={s.insightVal}>{weeklyStats.averageCalories} kcal</Text>
            <Text style={s.insightLabel}>Avg Daily Intake</Text>
          </Card>
          <Card style={s.insightCard}>
            <View style={s.insightIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={18} color={ACCENT} />
            </View>
            <Text style={s.insightVal}>{weeklyStats.successRate}%</Text>
            <Text style={s.insightLabel}>Goal Consistency</Text>
          </Card>
        </View>

        <View style={[s.insightsGrid, { marginTop: 10 }]}>
          <Card style={s.insightCard}>
            <View style={s.insightIconContainer}>
              <Ionicons name="barbell-outline" size={18} color={PROTEIN_COLOR} />
            </View>
            <Text style={s.insightVal}>{weeklyStats.averageProtein}g</Text>
            <Text style={s.insightLabel}>Avg Daily Protein</Text>
          </Card>
          <Card style={s.insightCard}>
            <View style={s.insightIconContainer}>
              <Ionicons name="calendar-outline" size={18} color="#06b6d4" />
            </View>
            <Text style={s.insightVal}>{weeklyStats.loggedDaysCount} / 7 days</Text>
            <Text style={s.insightLabel}>Days Logged</Text>
          </Card>
        </View>
      </Animated.View>
    </ScrollView>
  )
}

// ─── Custom Circular Progress Component ───────────────────────────────────────

function MacroProgressCircle({
  label,
  current,
  goal,
  color,
  unit,
}: {
  label: string
  current: number
  goal: number
  color: string
  unit: string
}) {
  const radius = 24
  const strokeWidth = 5
  const circ = 2 * Math.PI * radius
  const percent = Math.min(1.0, current / goal)
  const strokeDashoffset = circ * (1 - percent)

  return (
    <View style={s.macroCircleContainer}>
      <View style={s.svgWrapper}>
        <Svg width={60} height={60}>
          <Circle
            cx={30}
            cy={30}
            r={radius}
            stroke="rgba(0,0,0,0.04)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={30}
            cy={30}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
          />
        </Svg>
        <View style={s.circleCenterText}>
          <Text style={[s.circlePercentText, { color }]}>{Math.round(percent * 100)}%</Text>
        </View>
      </View>
      <Text style={s.macroCircleLabel}>{label}</Text>
      <Text style={s.macroCircleVal}>
        {current}{unit} <Text style={s.macroCircleTarget}>/ {goal}g</Text>
      </Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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

  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  calendarDayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
  },
  calendarDayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  loggedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 4,
  },

  chartCard: {
    padding: 20,
    gap: 16,
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
  },

  macrosCard: {
    padding: 20,
    gap: 8,
  },
  macroSegmentSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 12,
  },
  macroCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  macroCircleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  svgWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  circleCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  macroCircleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  macroCircleVal: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  macroCircleTarget: {
    fontSize: 9,
    color: TEXT_TERTIARY,
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
  insightsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  insightIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.08)',
  },
  insightVal: {
    fontSize: 16.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  insightLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
})
