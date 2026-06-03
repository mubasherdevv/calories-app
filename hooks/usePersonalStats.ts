import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface PersonalStats {
  age: string
  gender: 'male' | 'female' | 'other'
  weight: string // kg
  height: string // cm
  goal: 'weight_loss' | 'maintain' | 'muscle_gain'
}

const DEFAULT_STATS: PersonalStats = {
  age: '25',
  gender: 'male',
  weight: '75',
  height: '175',
  goal: 'weight_loss',
}

const STATS_KEY = 'personal_stats_v1'

export function usePersonalStats() {
  return useQuery<PersonalStats>({
    queryKey: ['personalStats'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STATS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      return DEFAULT_STATS
    },
  })
}

export function useSavePersonalStats() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newStats: PersonalStats) => {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalStats'] })
    }
  })
}
