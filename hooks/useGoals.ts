import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface UserGoals {
  calories: number
  protein: number
  carbs: number
  fats: number
}

const DEFAULT_GOALS: UserGoals = {
  calories: 2000,
  protein: 130,
  carbs: 220,
  fats: 65,
}

const GOALS_KEY = 'user_goals_v1'

export function useGoals() {
  return useQuery<UserGoals>({
    queryKey: ['userGoals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(GOALS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      return DEFAULT_GOALS
    },
  })
}

export function useSaveGoals() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newGoals: UserGoals) => {
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(newGoals))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGoals'] })
    }
  })
}
