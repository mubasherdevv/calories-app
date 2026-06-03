import React, { useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Platform, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import {
  ACCENT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useAllLogs, FoodLog } from '@/hooks/useFoodLogs'

type FilterType = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'All Time'
const FILTERS: FilterType[] = ['Today', 'Yesterday', 'This Week', 'This Month', 'All Time']

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const [activeFilter, setActiveFilter] = useState<FilterType>('Today')

  const { data: allLogs = [], isLoading } = useAllLogs()

  // ─── Filter Logic ───
  const filteredLogs = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const getStartOfDay = (d: Date) => {
      const copy = new Date(d)
      copy.setHours(0, 0, 0, 0)
      return copy
    }

    return allLogs.filter(log => {
      const logDate = new Date(log.loggedAt)
      const logStartOfDay = getStartOfDay(logDate)
      const diffTime = today.getTime() - logStartOfDay.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      switch (activeFilter) {
        case 'Today':
          return diffDays === 0
        case 'Yesterday':
          return diffDays === 1
        case 'This Week':
          return diffDays >= 0 && diffDays <= 7
        case 'This Month':
          return diffDays >= 0 && diffDays <= 30
        case 'All Time':
        default:
          return true
      }
    }).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
  }, [allLogs, activeFilter])

  // Helpers
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getMealStyle = (type: string) => {
    switch (type) {
      case 'breakfast': return { icon: 'sunny', color: '#F59E0B', label: 'Breakfast' }
      case 'lunch': return { icon: 'leaf', color: '#10B981', label: 'Lunch' }
      case 'dinner': return { icon: 'moon', color: '#8B5CF6', label: 'Dinner' }
      case 'snack': return { icon: 'nutrition', color: '#F43F5E', label: 'Snack' }
      default: return { icon: 'restaurant', color: TEXT_SECONDARY, label: 'Meal' }
    }
  }

  const getAiBadge = (log: FoodLog) => {
    if (log.protein > 30) return { text: 'High Protein Meal', color: '#10B981', icon: 'barbell' }
    if (log.calories > 600) return { text: 'Muscle Gain Meal', color: '#8B5CF6', icon: 'fitness' }
    if (log.calories < 300) return { text: 'Light Snack', color: '#F59E0B', icon: 'flash' }
    return { text: 'Balanced Meal', color: '#F59E0B', icon: 'scale' }
  }

  const renderItem = ({ item, index }: { item: FoodLog, index: number }) => {
    const style = getMealStyle(item.mealType)
    const badge = getAiBadge(item)

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <Pressable style={({pressed}) => [s.card, pressed && { opacity: 0.85 }]}>
          {/* Card Header */}
          <View style={s.cardHeader}>
            <View style={s.mealTypeRow}>
              <Ionicons name={style.icon as any} size={14} color={style.color} />
              <Text style={[s.mealTypeLabel, { color: style.color }]}>{style.label}</Text>
              <View style={s.aiTag}>
                <Ionicons name="sparkles" size={10} color="#10B981" />
                <Text style={s.aiTagText}>AI</Text>
              </View>
            </View>
          </View>
          
          <View style={s.cardBody}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.mealName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.mealMacros} numberOfLines={2}>
                Protein: {item.protein}g • Carbs: {item.carbs}g • Fat: {item.fat}g
              </Text>
              
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={14} color={TEXT_TERTIARY} />
                <Text style={s.timeText}>{formatTime(item.loggedAt)}</Text>
              </View>

              <View style={[s.badgeWrap, { backgroundColor: badge.color + '15' }]}>
                <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
            </View>

            <View style={s.calorieBlock}>
              <Text style={s.calValue}>{item.calories}</Text>
              <Text style={s.calLabel}>kcal</Text>
              <Ionicons name="chevron-forward" size={16} color={TEXT_TERTIARY} style={{ marginTop: 4 }} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={s.root}>
      {/* Glassmorphism Background */}
      <LinearGradient
        colors={['#F8FFF9', '#F3FFF6', '#ECFDF3']}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.blurGlow1} />
      <View style={s.blurGlow2} />
      <View style={s.blurGlow3} />

      {/* ─── Header ─── */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Meal History</Text>
            <Text style={s.subtitle}>All your scanned meals</Text>
          </View>
          <Pressable style={({pressed}) => [s.filterBtn, pressed && {opacity: 0.6}]}>
            <Ionicons name="filter-outline" size={18} color={ACCENT} />
            <Text style={s.filterText}>Filter</Text>
          </Pressable>
        </View>

        {/* ─── Filters ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[s.filterChip, isActive && s.filterChipActive]}
              >
                <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{f}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ─── List Header ─── */}
      <View style={s.listHeader}>
        <Text style={s.listHeaderTitle}>{activeFilter}</Text>
        <Text style={s.listHeaderCount}>{filteredLogs.length} meals</Text>
      </View>

      {/* ─── Meal List ─── */}
      <FlatList
        data={filteredLogs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[s.listContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={s.emptyState}>
            {!isLoading && <Text style={s.emptyText}>No meals found for {activeFilter}</Text>}
          </View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  
  // Background Glows
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

  header: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '600',
  },
  filterScroll: {
    gap: 12,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  filterChipActive: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  filterChipTextActive: {
    color: ACCENT,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  listHeaderCount: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  mealMacros: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 13,
    color: TEXT_TERTIARY,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  calorieBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  calValue: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  calLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
})
