import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export interface FoodLog {
  id: string
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  imageUri?: string
  loggedAt: string // ISO String
}

export interface ProfileGoals {
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
  streakCount: number
  lastLoggedDate: string // YYYY-MM-DD
}

const STORAGE_KEYS = {
  LOGS: '@calai:food_logs',
  PROFILE: '@calai:profile_goals',
}

// ─── High-Fidelity Initial Mock Data ──────────────────────────────────────────
const INITIAL_GOALS: ProfileGoals = {
  calorieGoal: 2000,
  proteinGoal: 130,
  carbsGoal: 220,
  fatGoal: 65,
  streakCount: 5,
  lastLoggedDate: new Date().toISOString().split('T')[0],
}

const getTodayString = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return d.toISOString().split('T')[0]
}

const INITIAL_LOGS: FoodLog[] = [
  // Today's Logs
  {
    id: 't1',
    name: 'Avocado Toast & Soft Egg',
    mealType: 'breakfast',
    calories: 380,
    protein: 15,
    carbs: 24,
    fat: 22,
    loggedAt: `${getTodayString(0)}T08:30:00.000Z`,
  },
  {
    id: 't2',
    name: 'Grilled Salmon Bowl',
    mealType: 'lunch',
    calories: 620,
    protein: 42,
    carbs: 45,
    fat: 24,
    loggedAt: `${getTodayString(0)}T13:15:00.000Z`,
  },
  {
    id: 't3',
    name: 'Greek Yogurt with Blueberries',
    mealType: 'snack',
    calories: 180,
    protein: 15,
    carbs: 18,
    fat: 2,
    loggedAt: `${getTodayString(0)}T16:45:00.000Z`,
  },
  // Yesterday's Logs
  {
    id: 'y1',
    name: 'Protein Oatmeal & Banana',
    mealType: 'breakfast',
    calories: 340,
    protein: 18,
    carbs: 52,
    fat: 5,
    loggedAt: `${getTodayString(1)}T08:15:00.000Z`,
  },
  {
    id: 'y2',
    name: 'Lean Chicken Breast & Rice',
    mealType: 'lunch',
    calories: 580,
    protein: 48,
    carbs: 50,
    fat: 12,
    loggedAt: `${getTodayString(1)}T13:00:00.000Z`,
  },
  {
    id: 'y3',
    name: 'Mixed Nuts & Dark Chocolate',
    mealType: 'snack',
    calories: 220,
    protein: 6,
    carbs: 14,
    fat: 18,
    loggedAt: `${getTodayString(1)}T17:00:00.000Z`,
  },
  {
    id: 'y4',
    name: 'Protein Shake',
    mealType: 'snack',
    calories: 140,
    protein: 26,
    carbs: 3,
    fat: 2,
    loggedAt: `${getTodayString(1)}T21:00:00.000Z`,
  },
  // 2 Days Ago
  {
    id: 'd2_1',
    name: 'Peanut Butter Granola Bar',
    mealType: 'breakfast',
    calories: 280,
    protein: 8,
    carbs: 35,
    fat: 12,
    loggedAt: `${getTodayString(2)}T09:00:00.000Z`,
  },
  {
    id: 'd2_2',
    name: 'Turkey Club Sandwich',
    mealType: 'lunch',
    calories: 520,
    protein: 34,
    carbs: 42,
    fat: 18,
    loggedAt: `${getTodayString(2)}T13:30:00.000Z`,
  },
  {
    id: 'd2_3',
    name: 'Sirloin Steak & Veggies',
    mealType: 'dinner',
    calories: 680,
    protein: 52,
    carbs: 20,
    fat: 32,
    loggedAt: `${getTodayString(2)}T19:30:00.000Z`,
  },
  // 3 Days Ago
  {
    id: 'd3_1',
    name: 'Scrambled Eggs & Toast',
    mealType: 'breakfast',
    calories: 320,
    protein: 18,
    carbs: 22,
    fat: 16,
    loggedAt: `${getTodayString(3)}T08:00:00.000Z`,
  },
  {
    id: 'd3_2',
    name: 'Chicken Caesar Salad',
    mealType: 'lunch',
    calories: 460,
    protein: 38,
    carbs: 12,
    fat: 24,
    loggedAt: `${getTodayString(3)}T12:45:00.000Z`,
  },
  {
    id: 'd3_3',
    name: 'Spaghetti Bolognese',
    mealType: 'dinner',
    calories: 720,
    protein: 28,
    carbs: 88,
    fat: 22,
    loggedAt: `${getTodayString(3)}T20:00:00.000Z`,
  },
  // 4 Days Ago
  {
    id: 'd4_1',
    name: 'French Toast & Berries',
    mealType: 'breakfast',
    calories: 450,
    protein: 12,
    carbs: 68,
    fat: 10,
    loggedAt: `${getTodayString(4)}T09:30:00.000Z`,
  },
  {
    id: 'd4_2',
    name: 'Salmon Quinoa Bowl',
    mealType: 'lunch',
    calories: 610,
    protein: 38,
    carbs: 45,
    fat: 22,
    loggedAt: `${getTodayString(4)}T13:00:00.000Z`,
  },
  {
    id: 'd4_3',
    name: 'Whey Protein shake',
    mealType: 'snack',
    calories: 130,
    protein: 25,
    carbs: 2,
    fat: 1,
    loggedAt: `${getTodayString(4)}T18:00:00.000Z`,
  },
]

// ─── Helpers for Local Storage ────────────────────────────────────────────────
async function getLocalLogs(): Promise<FoodLog[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.LOGS)
  if (!data) {
    await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS))
    return INITIAL_LOGS
  }
  return JSON.parse(data)
}

async function saveLocalLogs(logs: FoodLog[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs))
}

async function getLocalGoals(): Promise<ProfileGoals> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE)
  if (!data) {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_GOALS))
    return INITIAL_GOALS
  }
  return JSON.parse(data)
}

async function saveLocalGoals(goals: ProfileGoals) {
  await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(goals))
}

// ─── Custom Query Hooks ───────────────────────────────────────────────────────

/**
 * Fetches user goals (streaks, targets)
 */
export function useProfileGoals() {
  return useQuery<ProfileGoals>({
    queryKey: ['profileGoals'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data } = await supabase
              .from('profiles')
              .select('calorie_goal, protein_goal, carbs_goal, fat_goal, streak_count, last_logged_date')
              .eq('id', user.id)
              .maybeSingle()

            if (data) {
              return {
                calorieGoal: data.calorie_goal ?? 2000,
                proteinGoal: data.protein_goal ?? 130,
                carbsGoal: data.carbs_goal ?? 220,
                fatGoal: data.fat_goal ?? 65,
                streakCount: data.streak_count ?? 1,
                lastLoggedDate: data.last_logged_date ?? getTodayString(),
              }
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed loading goals, fallback to local', e)
        }
      }
      return getLocalGoals()
    },
    placeholderData: INITIAL_GOALS,
  })
}

/**
 * Fetches food logs logged for a specific date (YYYY-MM-DD)
 */
export function useFoodLogs(dateString: string) {
  return useQuery<FoodLog[]>({
    queryKey: ['foodLogs', dateString],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Find logs between start and end of that date
            const startStr = `${dateString}T00:00:00.000Z`
            const endStr = `${dateString}T23:59:59.999Z`

            const { data, error } = await supabase
              .from('food_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('logged_at', startStr)
              .lte('logged_at', endStr)
              .order('logged_at', { ascending: true })

            if (!error && data) {
              return data.map((row: any) => ({
                id: row.id,
                name: row.name,
                mealType: row.meal_type,
                calories: row.calories,
                protein: Number(row.protein),
                carbs: Number(row.carbs),
                fat: Number(row.fat),
                imageUri: row.image_uri ?? undefined,
                loggedAt: row.logged_at,
              }))
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed loading food logs, fallback to local', e)
        }
      }

      const allLogs = await getLocalLogs()
      return allLogs.filter((log) => log.loggedAt.startsWith(dateString))
    },
    placeholderData: [],
  })
}

/**
 * Fetches food logs for the past 7 days (used for analytics history)
 */
export function useWeeklyLogs() {
  return useQuery<FoodLog[]>({
    queryKey: ['weeklyLogs'],
    queryFn: async () => {
      const today = new Date()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(today.getDate() - 6)
      const startDateString = sevenDaysAgo.toISOString().split('T')[0]

      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data, error } = await supabase
              .from('food_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('logged_at', `${startDateString}T00:00:00.000Z`)
              .order('logged_at', { ascending: true })

            if (!error && data) {
              return data.map((row: any) => ({
                id: row.id,
                name: row.name,
                mealType: row.meal_type,
                calories: row.calories,
                protein: Number(row.protein),
                carbs: Number(row.carbs),
                fat: Number(row.fat),
                imageUri: row.image_uri ?? undefined,
                loggedAt: row.logged_at,
              }))
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed loading weekly stats, fallback to local', e)
        }
      }

      const allLogs = await getLocalLogs()
      return allLogs.filter((log) => log.loggedAt >= `${startDateString}T00:00:00`)
    },
    placeholderData: INITIAL_LOGS,
  })
}

/**
 * Fetches all food logs (used for All Time history)
 */
export function useAllLogs() {
  return useQuery<FoodLog[]>({
    queryKey: ['allLogs'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data, error } = await supabase
              .from('food_logs')
              .select('*')
              .eq('user_id', user.id)
              .order('logged_at', { ascending: false })

            if (!error && data) {
              return data.map((row: any) => ({
                id: row.id,
                name: row.name,
                mealType: row.meal_type,
                calories: row.calories,
                protein: Number(row.protein),
                carbs: Number(row.carbs),
                fat: Number(row.fat),
                imageUri: row.image_uri ?? undefined,
                loggedAt: row.logged_at,
              }))
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed loading all stats, fallback to local', e)
        }
      }

      const allLogs = await getLocalLogs()
      return allLogs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    },
    placeholderData: INITIAL_LOGS,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mutation: Add a new food log
 */
export function useAddFoodLog() {
  const queryClient = useQueryClient()

  return useMutation<FoodLog, Error, Omit<FoodLog, 'id' | 'loggedAt'>>({
    mutationFn: async (newLog: Omit<FoodLog, 'id' | 'loggedAt'>) => {
      const loggedAt = new Date().toISOString()
      const dateStr = loggedAt.split('T')[0]

      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // First increment streak or verify streak state
            const { data: profile } = await supabase
              .from('profiles')
              .select('streak_count, last_logged_date')
              .eq('id', user.id)
              .maybeSingle()

            let newStreak = profile?.streak_count ?? 1
            const lastLogged = profile?.last_logged_date
            const todayStr = getTodayString()

            if (lastLogged && lastLogged !== todayStr) {
              const yesterdayStr = getTodayString(1)
              if (lastLogged === yesterdayStr) {
                newStreak += 1
              } else {
                newStreak = 1
              }
              await supabase
                .from('profiles')
                .update({ streak_count: newStreak, last_logged_date: todayStr })
                .eq('id', user.id)
            }

            const { data, error } = await supabase
              .from('food_logs')
              .insert({
                user_id: user.id,
                name: newLog.name,
                meal_type: newLog.mealType,
                calories: newLog.calories,
                protein: newLog.protein,
                carbs: newLog.carbs,
                fat: newLog.fat,
                image_uri: newLog.imageUri,
                logged_at: loggedAt,
              })
              .select()
              .single()

            if (error) throw error

            return {
              id: data.id,
              name: data.name,
              mealType: data.meal_type,
              calories: data.calories,
              protein: Number(data.protein),
              carbs: Number(data.carbs),
              fat: Number(data.fat),
              imageUri: data.image_uri ?? undefined,
              loggedAt: data.logged_at,
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed inserting log, falling back to local', e)
        }
      }

      // Local State insertion
      const allLogs = await getLocalLogs()
      const createdLog: FoodLog = {
        ...newLog,
        id: `local_${Date.now()}`,
        loggedAt,
      }
      await saveLocalLogs([createdLog, ...allLogs])

      // Handle local streak
      const goals = await getLocalGoals()
      const todayStr = getTodayString()
      let streak = goals.streakCount
      if (goals.lastLoggedDate !== todayStr) {
        const yesterdayStr = getTodayString(1)
        if (goals.lastLoggedDate === yesterdayStr) {
          streak += 1
        } else {
          streak = 1
        }
        await saveLocalGoals({
          ...goals,
          streakCount: streak,
          lastLoggedDate: todayStr,
        })
      }

      return createdLog
    },
    onSuccess: (data: FoodLog) => {
      const dateStr = data.loggedAt.split('T')[0]
      queryClient.invalidateQueries({ queryKey: ['foodLogs', dateStr] })
      queryClient.invalidateQueries({ queryKey: ['weeklyLogs'] })
      queryClient.invalidateQueries({ queryKey: ['profileGoals'] })
      queryClient.invalidateQueries({ queryKey: ['allLogs'] })
    },
  })
}

/**
 * Mutation: Delete a food log
 */
export function useDeleteFoodLog() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, { id: string; dateString: string }>({
    mutationFn: async ({ id, dateString }: { id: string; dateString: string }) => {
      if (isSupabaseEnabled) {
        try {
          const { error } = await supabase
            .from('food_logs')
            .delete()
            .eq('id', id)

          if (!error) return id
        } catch (e) {
          console.warn('[Supabase] Failed deleting log, fallback to local', e)
        }
      }

      const allLogs = await getLocalLogs()
      const filtered = allLogs.filter((log) => log.id !== id)
      await saveLocalLogs(filtered)
      return id
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['foodLogs', variables.dateString] })
      queryClient.invalidateQueries({ queryKey: ['weeklyLogs'] })
      queryClient.invalidateQueries({ queryKey: ['allLogs'] })
    },
  })
}

/**
 * Mutation: Update target macro/calorie goals
 */
export function useUpdateProfileGoals() {
  const queryClient = useQueryClient()

  return useMutation<ProfileGoals, Error, Partial<ProfileGoals>>({
    mutationFn: async (updatedFields: Partial<ProfileGoals>) => {
      if (isSupabaseEnabled) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const updates: any = {}
            if (updatedFields.calorieGoal !== undefined) updates.calorie_goal = updatedFields.calorieGoal
            if (updatedFields.proteinGoal !== undefined) updates.protein_goal = updatedFields.proteinGoal
            if (updatedFields.carbsGoal !== undefined) updates.carbs_goal = updatedFields.carbsGoal
            if (updatedFields.fatGoal !== undefined) updates.fat_goal = updatedFields.fatGoal

            const { data, error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', user.id)
              .select()
              .single()

            if (!error && data) {
              return {
                calorieGoal: data.calorie_goal,
                proteinGoal: data.protein_goal,
                carbsGoal: data.carbs_goal,
                fatGoal: data.fat_goal,
                streakCount: data.streak_count,
                lastLoggedDate: data.last_logged_date,
              }
            }
          }
        } catch (e) {
          console.warn('[Supabase] Failed updating goals, fallback to local', e)
        }
      }

      const goals = await getLocalGoals()
      const newGoals = {
        ...goals,
        ...updatedFields,
      }
      await saveLocalGoals(newGoals)
      return newGoals
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileGoals'] })
    },
  })
}
