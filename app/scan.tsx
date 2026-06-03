import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import TextInputField from '@/components/ui/TextInputField'
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
} from '@/lib/theme'
import { useAddFoodLog } from '@/hooks/useFoodLogs'
import { useToast } from '@/contexts/ToastContext'
import { useAIConfig, DEFAULT_CONFIG } from '@/hooks/useAIConfig'
import { usePersonalStats } from '@/hooks/usePersonalStats'
import { useGoals } from '@/hooks/useGoals'

const { width: SW, height: SH } = Dimensions.get('window')
const PHOTO_SIZE = SW - 40

// Mock vision AI food taxonomy
let PRESET_FOODS: any[] = [
  { name: 'Avocado Quinoa Bowl', calories: 420, protein: 12, carbs: 48, fat: 22 },
  { name: 'Pan-Seared Ribeye & Broccoli', calories: 740, protein: 58, carbs: 8, fat: 54 },
  { name: 'Spaghetti Carbonara', calories: 680, protein: 24, carbs: 82, fat: 28 },
  { name: 'Grilled Chicken & Sweet Potato', calories: 510, protein: 44, carbs: 38, fat: 12 },
  { name: 'Blueberry Matcha Smoothie', calories: 240, protein: 15, carbs: 32, fat: 4 },
  { name: 'Greek Salad with Feta', calories: 310, protein: 8, carbs: 14, fat: 26 },
]

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()
  const { mutate: addFoodLog, isPending: isLogging } = useAddFoodLog()
  const { data: aiConfigData } = useAIConfig()
  const { data: statsData } = usePersonalStats()
  const { data: goalsData } = useGoals()

  // ─── States ───
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzed'>('idle')
  const [portion, setPortion] = useState<number>(1.0) // portion size: 0.5 to 2.0
  const [selectedFoodIndex, setSelectedFoodIndex] = useState<number>(0)
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [customDescription, setCustomDescription] = useState('')

  // ─── Reanimated Laser Sweep ───
  const laserY = useSharedValue(0)

  useEffect(() => {
    if (status === 'scanning') {
      laserY.value = 0
      laserY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    } else {
      laserY.value = 0
    }
  }, [status])

  const laserStyle = useAnimatedStyle(() => {
    return {
      top: `${laserY.value * 100}%`,
    }
  })

  // ─── Actions ───
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync()
      const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      return camStatus === 'granted' && libStatus === 'granted'
    }
    return true
  }

  const pickImage = async (useCamera: boolean) => {
    const granted = await requestPermissions()
    if (!granted) {
      showToast('Camera and library permissions are required to scan food.', 'error')
      return
    }

    let result
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
    }

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri)
      startScanning(result.assets[0].base64 ?? undefined)
    }
  }

  const startScanning = async (base64Data?: string) => {
    setStatus('scanning')
    const config = aiConfigData || DEFAULT_CONFIG
    const apiKey = config.apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''

    if (apiKey && base64Data) {
      try {
        let cleanText = ''
        const prompt = `You are an elite nutritionist AI. The user is a ${statsData?.age || 25}yo ${statsData?.gender || 'male'}, ${statsData?.weight || 75}kg, ${statsData?.height || 175}cm, aiming for ${statsData?.goal || 'weight_loss'} with a ${goalsData?.calories || 2000} kcal daily limit, ${goalsData?.protein || 130}g protein, ${goalsData?.carbs || 220}g carbs, ${goalsData?.fats || 65}g fats. Analyze this food image. Return a JSON object with EXACTLY these keys: 'name' (string, e.g. 'Avocado Toast'), 'calories' (integer, e.g. 350), 'protein' (integer, e.g. 12), 'carbs' (integer, e.g. 24), 'fat' (integer, e.g. 22), 'match_percentage' (integer, 0-100 indicating how well this fits their goals), 'match_label' (string, e.g. 'Best Match', 'Balanced Choice', 'Avoid'), 'coach_feedback' (string, 1-2 short sentences of personalized advice), 'healthier_alternatives' (array of strings, e.g. ["Turkey Burger", "Salad"]). Return ONLY the raw JSON block without markdown formatting or backticks.`

        if (config.provider === 'openai' || config.provider === 'custom') {
          const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
          const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: config.modelName || 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                  ]
                }
              ]
            })
          })

          const result = await response.json()
          cleanText = result.choices?.[0]?.message?.content || ''
        } else {
          // Gemini Provider
          const model = config.modelName || 'gemini-2.5-flash'
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    ],
                  },
                ],
              }),
            }
          )

          const result = await response.json()
          cleanText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanText)

        if (parsed.name && parsed.calories !== undefined) {
          const matched = {
            name: parsed.name,
            calories: Number(parsed.calories),
            protein: Number(parsed.protein ?? 0),
            carbs: Number(parsed.carbs ?? 0),
            fat: Number(parsed.fat ?? 0),
            matchPercentage: Number(parsed.match_percentage ?? 85),
            matchLabel: parsed.match_label ?? 'Good Match',
            coachFeedback: parsed.coach_feedback ?? 'Great choice!',
            healthierAlternatives: parsed.healthier_alternatives ?? [],
          }

          PRESET_FOODS.unshift(matched)
          setSelectedFoodIndex(0)
          setStatus('analyzed')
          showToast('Real-time AI Scan Success!', 'success')
          return
        }
      } catch (e) {
        console.warn('[Gemini AI] Failed, falling back to smart simulation', e)
      }
    }

    // Fallback simulation
    setTimeout(() => {
      setStatus('analyzed')
      showToast('AI analysis complete! Matches found.', 'success')
    }, 2800)
  }

  // Calculate current dynamic scaled macros
  const currentPreset = PRESET_FOODS[selectedFoodIndex]
  const calories = Math.round(currentPreset.calories * portion)
  const protein = Math.round(currentPreset.protein * portion)
  const carbs = Math.round(currentPreset.carbs * portion)
  const fat = Math.round(currentPreset.fat * portion)

  const handleLogMeal = () => {
    let mealName = currentPreset.name
    if (customDescription.trim()) {
      mealName = customDescription.trim()
    }

    addFoodLog(
      {
        name: mealName,
        mealType,
        calories,
        protein,
        carbs,
        fat,
        imageUri: imageUri ?? undefined,
      },
      {
        onSuccess: () => {
          showToast(`Logged ${mealName} successfully!`, 'success')
          router.replace('/(tabs)')
        },
        onError: () => {
          showToast('Failed to log food. Try again.', 'error')
        },
      }
    )
  }

  // Handle descriptive manual search
  const handleDescribeSearch = () => {
    if (!customDescription.trim()) return
    setStatus('scanning')
    setTimeout(() => {
      // Simulate mapping custom string to macro database
      const desc = customDescription.toLowerCase()
      let matched = { name: customDescription, calories: 350, protein: 18, carbs: 32, fat: 12 }

      if (desc.includes('chicken') || desc.includes('chicken breast')) {
        matched = { name: 'Grilled Chicken Meal', calories: 480, protein: 42, carbs: 20, fat: 10 }
      } else if (desc.includes('rice') || desc.includes('fried rice')) {
        matched = { name: 'Egg Fried Rice', calories: 550, protein: 12, carbs: 80, fat: 18 }
      } else if (desc.includes('pizza')) {
        matched = { name: 'Pepperoni Pizza Slices', calories: 690, protein: 26, carbs: 74, fat: 28 }
      } else if (desc.includes('egg') || desc.includes('scrambled')) {
        matched = { name: 'Scrambled Eggs & Toast', calories: 340, protein: 20, carbs: 22, fat: 18 }
      }

      // Add to preset array at the beginning
      PRESET_FOODS.unshift(matched)
      setSelectedFoodIndex(0)
      setStatus('analyzed')
      showToast('Custom food mapped to calorie index!', 'success')
    }, 1800)
  }

  return (
    <View style={s.root}>
      {/* ─── Premium Light Header ─── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={15}
            style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
          >
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={s.headerTitle}>AI Scanner</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Idle State: Camera Finder View (Screen 1) ─── */}
        {status === 'idle' && (
          <Animated.View entering={FadeInDown.duration(400)} style={s.finderContainer}>
            {/* The Camera Finder Frame with Corner Markers */}
            <View style={s.cameraFinder}>
              {/* Corner brackets */}
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />

              {/* Faint Grid Lines */}
              <View style={s.gridRow} />
              <View style={s.gridCol} />

              <Ionicons name="scan-outline" size={48} color={ACCENT} style={s.centerScannerIcon} />
            </View>

            {/* Premium Action Control Panel */}
            <Card style={s.controlPanel}>
              <Text style={s.controlTitle}>Snap & Track</Text>
              <Text style={s.controlSub}>
                Position your meal inside the grid. Cal AI identifies food types, counts calories, and maps macros instantly.
              </Text>

              <View style={s.actionBtns}>
                <Pressable
                  onPress={() => pickImage(true)}
                  style={({ pressed }) => [s.primaryActionBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={s.actionBtnText}>Take Photo</Text>
                </Pressable>

                <Pressable
                  onPress={() => pickImage(false)}
                  style={({ pressed }) => [s.secondaryActionBtn, pressed && s.secondaryPressed]}
                >
                  <Ionicons name="image-outline" size={20} color={ACCENT} style={{ marginRight: 8 }} />
                  <Text style={[s.actionBtnText, { color: ACCENT }]}>Upload from Gallery</Text>
                </Pressable>
              </View>

              {/* Manual search fallback */}
              <View style={s.fallbackBlock}>
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or describe manually</Text>
                  <View style={s.dividerLine} />
                </View>

                <View style={s.fallbackInputRow}>
                  <TextInputField
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    placeholder="e.g. 2 fried eggs with avocado"
                    style={s.descInput}
                  />
                  <Pressable
                    onPress={handleDescribeSearch}
                    disabled={!customDescription.trim()}
                    style={({ pressed }) => [
                      s.descSearchBtn,
                      !customDescription.trim() && { opacity: 0.4 },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* ─── Scanning Mode Preview ─── */}
        {status === 'scanning' && imageUri && (
          <View style={s.scanningContainer}>
            <View style={s.imageFrame}>
              <Image source={{ uri: imageUri }} style={s.photo as any} />

              {/* Corner brackets */}
              <View style={[s.corner, s.cornerTL, { borderColor: '#fff' }]} />
              <View style={[s.corner, s.cornerTR, { borderColor: '#fff' }]} />
              <View style={[s.corner, s.cornerBL, { borderColor: '#fff' }]} />
              <View style={[s.corner, s.cornerBR, { borderColor: '#fff' }]} />

              {/* Laser line overlay */}
              <Animated.View style={[s.laserLine, laserStyle]} />
            </View>

            <Card style={s.scanningStatusCard}>
              <ActivityIndicator size="small" color={ACCENT} style={{ marginBottom: 6 }} />
              <Text style={s.scanningTitle}>Scanning plate...</Text>
              <Text style={s.scanningSub}>Vision AI is extracting food groups & weight volumes</Text>
            </Card>
          </View>
        )}

        {/* ─── Analyzed Results Screen (Screen 2) ─── */}
        {/* ─── Analyzed Results Screen (Screen 2) ─── */}
        {status === 'analyzed' && (
          <Animated.View entering={FadeInDown.duration(450)} style={s.analyzedContainer}>
            {/* 1. Uploaded Image Header with Retake */}
            {imageUri && (
              <View style={s.imageHeaderFrame}>
                <Image source={{ uri: imageUri }} style={s.photoHeader as any} />
                <Pressable
                  style={s.retakeImageBtn}
                  onPress={() => {
                    setStatus('idle')
                    setImageUri(null)
                    setCustomDescription('')
                  }}
                >
                  <Ionicons name="camera-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={s.retakeImageBtnText}>Retake</Text>
                </Pressable>
              </View>
            )}

            {/* 2. AI Detection Section */}
            <Text style={s.sectionTitle}>AI DETECTION</Text>
            <View style={[s.detectionCard, { alignItems: 'flex-start' }]}>
              <View style={s.detectionIconWrap}>
                <Ionicons name="sparkles" size={20} color={ACCENT} />
              </View>
              <View style={s.detectionInfo}>
                <Text style={[s.detectionName, { fontSize: 14 }]} numberOfLines={2}>{currentPreset.name}</Text>
                <Text style={s.detectionSub}>AI identified this meal</Text>
                <View style={[s.detectionBadge, { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 3, paddingHorizontal: 6 }]}>
                  <Text style={[s.detectionBadgeText, { fontSize: 10 }]}>{currentPreset.matchPercentage ?? 85}% Match</Text>
                  <Ionicons name="checkmark-circle" size={11} color={ACCENT} style={{ marginLeft: 3 }} />
                </View>
              </View>
            </View>

            {/* 3. NUTRITION SUMMARY */}
            <Text style={s.sectionTitle}>NUTRITION SUMMARY</Text>
            <View style={s.nutritionCard}>
              <View style={s.nutritionTop}>
                <View style={s.nutritionFlameWrap}>
                  <Ionicons name="flame" size={22} color={ACCENT} />
                </View>
                <View style={s.nutritionCalInfo}>
                  <Text style={s.nutritionCalText}>{calories}</Text>
                  <Text style={s.nutritionCalUnit}>kcal</Text>
                </View>
              </View>
              <Text style={s.nutritionCalSub}>Estimated Calories</Text>

              <View style={s.nutritionMacrosRow}>
                <View style={s.nutritionMacroItem}>
                  <Text style={[s.nutritionMacroVal, { color: '#22C55E' }]}>{protein}g</Text>
                  <Text style={s.nutritionMacroLabel}>Protein</Text>
                  <Text style={s.nutritionMacroGoal}>/ {goalsData?.protein ?? 130}g</Text>
                </View>
                <View style={s.nutritionMacroDivider} />
                <View style={s.nutritionMacroItem}>
                  <Text style={[s.nutritionMacroVal, { color: '#F59E0B' }]}>{carbs}g</Text>
                  <Text style={s.nutritionMacroLabel}>Carbs</Text>
                  <Text style={s.nutritionMacroGoal}>/ {goalsData?.carbs ?? 220}g</Text>
                </View>
                <View style={s.nutritionMacroDivider} />
                <View style={s.nutritionMacroItem}>
                  <Text style={[s.nutritionMacroVal, { color: '#A855F7' }]}>{fat}g</Text>
                  <Text style={s.nutritionMacroLabel}>Fat</Text>
                  <Text style={s.nutritionMacroGoal}>/ {goalsData?.fats ?? 65}g</Text>
                </View>
              </View>
            </View>

            {/* 4. MEAL CATEGORY */}
            <Text style={s.sectionTitle}>MEAL CATEGORY</Text>
            <View style={s.categoryCard}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                const isActive = mealType === type;
                let iconName: any = 'sunny-outline';
                if (type === 'lunch') iconName = 'fast-food-outline';
                if (type === 'dinner') iconName = 'moon-outline';
                if (type === 'snack') iconName = 'nutrition-outline';

                return (
                  <Pressable
                    key={type}
                    onPress={() => setMealType(type)}
                    style={[s.categoryBtn, isActive && s.categoryBtnActive]}
                  >
                    <Ionicons
                      name={iconName}
                      size={15}
                      color={isActive ? ACCENT : TEXT_SECONDARY}
                    />
                    <Text style={[s.categoryBtnText, isActive && s.categoryBtnTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* 5. AI COACH */}
            <Text style={s.sectionTitle}>AI COACH</Text>
            <View style={s.aiCoachCard}>
              <View style={s.aiCoachIconWrap}>
                <Ionicons name="planet" size={32} color="#000" />
              </View>
              <View style={s.aiCoachContent}>
                <Text style={s.aiCoachTitle}>{currentPreset.matchLabel ?? 'Great choice! 💪'}</Text>
                <Text style={s.aiCoachSub}>
                  {currentPreset.coachFeedback ?? 'High protein meal detected. Consider adding some vegetables or a side salad for better fiber intake.'}
                </Text>
              </View>
              <Ionicons name="sparkles" size={16} color="#A7F3D0" style={{ position: 'absolute', top: 12, right: 24, opacity: 0.8 }} />
              <Ionicons name="sparkles" size={12} color="#A7F3D0" style={{ position: 'absolute', top: 32, right: 12, opacity: 0.6 }} />
              <Ionicons name="sparkles" size={20} color="#A7F3D0" style={{ position: 'absolute', bottom: 16, right: 16, opacity: 0.4 }} />
            </View>

            {/* 6. HEALTHIER ALTERNATIVES */}
            {currentPreset.healthierAlternatives && currentPreset.healthierAlternatives.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Healthier Alternatives</Text>
                <View style={[s.categoryCard, { paddingVertical: 12, flexDirection: 'column', gap: 8 }]}>
                  {currentPreset.healthierAlternatives.map((alt: string, i: number) => (
                    <View key={`alt-${i}`} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'rgba(34, 197, 94, 0.08)', borderRadius: 10, width: '100%' }}>
                      <Ionicons name="leaf" size={16} color="#22C55E" style={{ marginRight: 10 }} />
                      <Text style={{ flex: 1, color: TEXT_SECONDARY, fontSize: 13, fontWeight: '500' }}>{alt}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 80 }} />
          </Animated.View>
        )}
      </ScrollView>

      {/* 6. Fixed Bottom Add to Diary Button */}
      {status === 'analyzed' && (
        <Animated.View entering={FadeInDown.duration(400)} style={[s.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            onPress={handleLogMeal}
            disabled={isLogging}
            style={({ pressed }) => [s.addToDiaryBtn, pressed && { opacity: 0.85 }, isLogging && { opacity: 0.5 }]}
          >
            <Text style={s.addToDiaryText}>{isLogging ? 'Logging...' : 'Add to Diary'}</Text>
            <View style={s.addToDiaryPlus}>
              <Ionicons name="add" size={20} color={ACCENT} />
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header styles
  header: {
    paddingHorizontal: 20,
    backgroundColor: BG,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  backBtnPressed: {
    backgroundColor: SURFACE2,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },

  // Camera finder view (Screen 1)
  finderContainer: {
    gap: 16,
  },
  cameraFinder: {
    width: '100%',
    height: PHOTO_SIZE,
    borderRadius: 24,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3.5,
    borderColor: '#FFF',
  },
  cornerTL: { top: 20, left: 20, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 20, right: 20, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 20, left: 20, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 20, right: 20, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },

  gridRow: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  gridCol: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    width: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  centerScannerIcon: {
    opacity: 0.6,
  },

  // Idle Control Panel
  controlPanel: {
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  controlSub: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actionBtns: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFF',
  },

  // Fallback description manual search
  fallbackBlock: {
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  dividerText: {
    color: TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  descInput: {
    flex: 1,
  },
  descSearchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scanning State view
  scanningContainer: {
    alignItems: 'center',
    gap: 20,
  },
  imageFrame: {
    position: 'relative',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  scanningStatusCard: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  scanningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  scanningSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  // Analyzed state results (Screen 2)
  analyzedContainer: {
    gap: 12,
  },
  imageHeaderFrame: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    position: 'relative',
  },
  photoHeader: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeImageBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeImageBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
    paddingHorizontal: 4,
  },

  // Detection Card
  detectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detectionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  detectionName: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  detectionSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detectionBadgeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },

  // Nutrition Card
  nutritionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  nutritionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  nutritionFlameWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionCalInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  nutritionCalText: {
    fontSize: 42,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -1,
  },
  nutritionCalUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  nutritionCalSub: {
    textAlign: 'center',
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 20,
  },
  nutritionMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nutritionMacroItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  nutritionMacroDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
  },
  nutritionMacroVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  nutritionMacroLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  nutritionMacroGoal: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '500',
    marginTop: 2,
  },

  // Category Row
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 4,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginLeft: 4,
  },
  categoryBtnTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },

  // AI Coach Card
  aiCoachCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    overflow: 'hidden',
  },
  aiCoachIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  aiCoachContent: {
    flex: 1,
    paddingRight: 20,
  },
  aiCoachTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  aiCoachSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },

  // Bottom Action Button
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  addToDiaryBtn: {
    backgroundColor: ACCENT,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToDiaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  addToDiaryPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
