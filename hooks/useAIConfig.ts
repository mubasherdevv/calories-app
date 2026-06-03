import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'custom'
  apiKey: string
  baseUrl: string
  modelName: string
}

export const DEFAULT_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  baseUrl: '',
  modelName: 'gemini-1.5-flash',
}

const CONFIG_KEY = 'ai_config_v1'

export function useAIConfig() {
  return useQuery<AIConfig>({
    queryKey: ['aiConfig'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CONFIG_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      return DEFAULT_CONFIG
    },
  })
}

export function useSaveAIConfig() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newConfig: AIConfig) => {
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConfig'] })
    }
  })
}
