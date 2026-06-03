import React, { useMemo } from 'react'
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/Text'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, ACCENT } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useWeeklyLogs, useProfileGoals, FoodLog } from '@/hooks/useFoodLogs'

const { width } = Dimensions.get('window')

// Helper to get past 7 days dates array
function getPast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const { data: logs = [] } = useWeeklyLogs()
  const { data: goals } = useProfileGoals()

  const calGoal = goals?.calorieGoal ?? 1850
  const protGoal = goals?.proteinGoal ?? 130
  const carbGoal = goals?.carbsGoal ?? 210
  const fatGoal = goals?.fatGoal ?? 52
  const streak = goals?.streakCount ?? 7

  const days = useMemo(() => getPast7Days(), [])

  // Aggregate stats per day
  const dailyStats = useMemo(() => {
    return days.map(d => {
      const dateStr = d.toISOString().split('T')[0]
      const dayLogs = logs.filter(l => l.loggedAt.startsWith(dateStr))
      let calories = 0, protein = 0, carbs = 0, fat = 0
      dayLogs.forEach(l => {
        calories += l.calories
        protein += l.protein
        carbs += l.carbs
        fat += l.fat
      })
      return {
        date: d,
        calories,
        protein,
        carbs,
        fat,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate()
      }
    })
  }, [logs, days])

  // Averages
  const avgStats = useMemo(() => {
    let tCal = 0, tProt = 0, tCarb = 0, tFat = 0
    let daysWithLogs = 0
    dailyStats.forEach(s => {
      if (s.calories > 0) {
        daysWithLogs++
        tCal += s.calories
        tProt += s.protein
        tCarb += s.carbs
        tFat += s.fat
      }
    })
    const denom = daysWithLogs || 1
    return {
      calories: Math.round(tCal / denom),
      protein: Math.round(tProt / denom),
      carbs: Math.round(tCarb / denom),
      fat: Math.round(tFat / denom),
      daysWithLogs,
      bestDayCal: Math.max(...dailyStats.map(s => s.calories))
    }
  }, [dailyStats])

  // AI Dynamic Insights
  const dynamicInsights = useMemo(() => {
    // 1. Calorie Insight
    const calDiff = Math.abs(calGoal - avgStats.calories)
    const calInsight = {
      icon: avgStats.calories <= calGoal ? "trending-down" : "trending-up",
      color: avgStats.calories <= calGoal ? "#10B981" : "#F43F5E",
      text: avgStats.calories === 0 
        ? "Start logging your meals to see AI insights on your calorie trends." 
        : `You are averaging ${calDiff} kcal ${avgStats.calories < calGoal ? 'below' : 'above'} your daily goal.`
    }

    // 2. Consistency Insight
    const daysHit = dailyStats.filter(s => s.calories > 0 && s.calories <= calGoal).length
    const daysLogged = dailyStats.filter(s => s.calories > 0).length
    const consistencyInsight = {
      icon: daysHit >= 4 ? "flame" : "calendar-outline",
      color: daysHit >= 4 ? "#F59E0B" : "#3B82F6",
      text: daysLogged === 0 
        ? "No meals logged this week. Let's build a streak!"
        : `Great job! You stayed within your calorie goal ${daysHit} times this week.`
    }

    // 3. Macro Insight (Protein Focus)
    const protDiff = protGoal - avgStats.protein
    let protText = ""
    let protColor = "#8B5CF6"
    let protIcon = "barbell-outline"
    
    if (avgStats.protein === 0) {
      protText = "Log protein-rich foods to build muscle."
      protColor = "#9CA3AF"
    } else if (protDiff > 15) {
      protText = `Protein intake is ${protDiff}g below target. Try adding more lean meats!`
      protColor = "#8B5CF6"
    } else if (protDiff < -10) {
      protText = "You're exceeding your protein goal! Excellent work for muscle recovery."
      protColor = "#10B981"
    } else {
      protText = "Protein intake is perfectly balanced with your weekly target!"
      protColor = "#10B981"
    }

    const macroInsight = {
      icon: protIcon,
      color: protColor,
      text: protText
    }

    return [calInsight, consistencyInsight, macroInsight]
  }, [calGoal, avgStats, dailyStats, protGoal])

  const renderCircularProgress = (value: number, goal: number, color: string, label: string) => {
    const size = 64
    const strokeWidth = 5
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
    const strokeDashoffset = circumference - (percent / 100) * circumference

    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle stroke="#E5E7EB" fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
            <Circle 
              stroke={color} 
              fill="none" 
              cx={size/2} cy={size/2} r={radius} 
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY }}>{percent}%</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT_PRIMARY, marginTop: 8 }}>{label}</Text>
        <Text style={{ fontSize: 9, color: TEXT_SECONDARY, marginTop: 2 }}>{value}g / {goal}g</Text>
      </View>
    )
  }

  // Find max calories for chart scale
  const maxCal = Math.max(calGoal, avgStats.bestDayCal) * 1.15
  const chartHeight = 120

  return (
    <View style={s.root}>
      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Progress</Text>
            <Text style={s.subtitle}>Analyze your calorie & macro trends</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakText}>🔥 {streak} Days</Text>
          </View>
        </View>

        {/* CALENDAR ROW */}
        <View style={s.calendarRow}>
          {dailyStats.map((stat, i) => {
            const isToday = i === 6 // 6 is the last element (today)
            return (
              <View key={`cal-${i}`} style={[s.calDayWrap, isToday && s.calDayWrapActive]}>
                <Text style={[s.calDayName, isToday && s.calDayNameActive]}>{stat.dayName.toUpperCase()}</Text>
                <Text style={[s.calDayNum, isToday && s.calDayNumActive]}>{stat.dayNum}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          {/* BAR CHART CARD */}
          <Card style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Calorie Intake vs Goal</Text>
              <Text style={s.cardGoal}>Goal: {calGoal} kcal</Text>
            </View>

            <View style={{ height: chartHeight + 20, marginTop: 16 }}>
              {/* Goal Line */}
              <View style={[s.goalLine, { bottom: (calGoal / maxCal) * chartHeight + 20 }]} />
              <Text style={[s.goalLineText, { bottom: (calGoal / maxCal) * chartHeight + 14 }]}>{calGoal}</Text>

              <View style={s.chartBars}>
                {dailyStats.map((stat, i) => {
                  const h = Math.max(4, (stat.calories / maxCal) * chartHeight)
                  const isToday = i === 6
                  return (
                    <View key={`bar-${i}`} style={s.barWrap}>
                      <Text style={s.barLabelTop}>{stat.calories || ''}</Text>
                      <View style={[s.bar, { height: h, backgroundColor: isToday ? '#22C55E' : '#86EFAC' }]} />
                      <Text style={[s.barLabelBot, isToday && { color: '#22C55E', fontWeight: '800' }]}>{stat.dayName}</Text>
                    </View>
                  )
                })}
              </View>
            </View>

            <View style={s.chartStatsRow}>
              <View style={s.chartStatBlock}>
                <Ionicons name="stats-chart" size={16} color="#10B981" />
                <View>
                  <Text style={s.cstatLabel}>Weekly Avg</Text>
                  <Text style={s.cstatVal}>{avgStats.calories} <Text style={{fontSize: 10, fontWeight:'400'}}>kcal</Text></Text>
                </View>
              </View>
              <View style={s.chartStatBlock}>
                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                <View>
                  <Text style={s.cstatLabel}>Goal Achieved</Text>
                  <Text style={s.cstatVal}>{dailyStats.filter(s => s.calories > 0 && s.calories <= calGoal).length} / 7 Days</Text>
                </View>
              </View>
              <View style={s.chartStatBlock}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <View>
                  <Text style={s.cstatLabel}>Best Day</Text>
                  <Text style={s.cstatVal}>{avgStats.bestDayCal} <Text style={{fontSize: 10, fontWeight:'400'}}>kcal</Text></Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          {/* MACROS CARD */}
          <Card style={s.card}>
            <Text style={s.cardTitle}>Weekly Macro Averages</Text>
            <Text style={s.cardSub}>Your average daily macronutrient intakes mapped against targets.</Text>
            
            <View style={s.macrosRow}>
              {renderCircularProgress(avgStats.protein, protGoal, '#10B981', 'Protein')}
              {renderCircularProgress(avgStats.carbs, carbGoal, '#F59E0B', 'Carbs')}
              {renderCircularProgress(avgStats.fat, fatGoal, '#8B5CF6', 'Fat')}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          {/* INSIGHTS */}
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="medical-outline" size={16} color="#10B981" />
              <Text style={s.sectionTitle}>Weekly Insights</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>View All</Text>
          </View>

          <View style={s.insightsGrid}>
            <Card style={s.insightCard}>
              <Ionicons name={dynamicInsights[0].icon as any} size={18} color={dynamicInsights[0].color} />
              <Text style={s.insightText}>{dynamicInsights[0].text}</Text>
            </Card>
            <Card style={s.insightCard}>
              <Ionicons name={dynamicInsights[1].icon as any} size={18} color={dynamicInsights[1].color} />
              <Text style={s.insightText}>{dynamicInsights[1].text}</Text>
            </Card>
            <Card style={s.insightCard}>
              <Ionicons name={dynamicInsights[2].icon as any} size={18} color={dynamicInsights[2].color} />
              <Text style={s.insightText}>{dynamicInsights[2].text}</Text>
            </Card>
          </View>
          
          {/* TREND OVERVIEW */}
          <View style={s.trendHeader}>
            <View>
              <Text style={s.sectionTitle}>Trend Overview</Text>
              <Text style={s.cardSub}>This Week vs Last Week</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={s.trendPill}><Text style={s.trendPillText}>- 120 kcal</Text></View>
              <View style={s.trendPill}><Text style={s.trendPillText}>+8%</Text></View>
            </View>
          </View>

        </Animated.View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    paddingHorizontal: 20,
    backgroundColor: '#F8FAF9',
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  calDayWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  calDayWrapActive: {
    backgroundColor: '#22C55E',
  },
  calDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  calDayNameActive: {
    color: '#FFF',
  },
  calDayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  calDayNumActive: {
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  cardGoal: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  cardSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    lineHeight: 18,
  },
  
  // Chart
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#10B981',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#10B981',
    zIndex: 1,
  },
  goalLineText: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: '#FFF',
    paddingLeft: 4,
    zIndex: 2,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  barWrap: {
    alignItems: 'center',
    width: 32,
  },
  bar: {
    width: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  barLabelTop: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    fontWeight: '600',
  },
  barLabelBot: {
    position: 'absolute',
    bottom: -18,
    fontSize: 10,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  chartStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chartStatBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cstatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  cstatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },

  // Macros
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 8,
  },

  // Insights
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  insightText: {
    fontSize: 11,
    color: TEXT_PRIMARY,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 8,
  },
  
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  trendPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  trendPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  }
})
