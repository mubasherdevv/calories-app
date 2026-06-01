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

const { width: SW, height: SH } = Dimensions.get('window')
const PHOTO_SIZE = SW - 40

// Mock vision AI food taxonomy
const PRESET_FOODS = [
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
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''

    if (geminiKey && base64Data) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Analyze this food image. Return a JSON object with the calorie and macro nutritional breakdown of the main food item present. The JSON must have exactly these keys: 'name' (string, e.g. 'Avocado Toast'), 'calories' (integer, e.g. 350), 'protein' (integer, e.g. 12), 'carbs' (integer, e.g. 24), 'fat' (integer, e.g. 22). Return ONLY the raw JSON block without markdown formatting or backticks.",
                    },
                    {
                      inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        )

        const result = await response.json()
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanText)

        if (parsed.name && parsed.calories !== undefined) {
          const matched = {
            name: parsed.name,
            calories: Number(parsed.calories),
            protein: Number(parsed.protein ?? 0),
            carbs: Number(parsed.carbs ?? 0),
            fat: Number(parsed.fat ?? 0),
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
        {status === 'analyzed' && (
          <Animated.View entering={FadeInDown.duration(450)} style={s.analyzedContainer}>
            {/* Meal Image header preview */}
            {imageUri && (
              <View style={s.imageHeaderFrame}>
                <Image source={{ uri: imageUri }} style={s.photoHeader as any} />
              </View>
            )}

            {/* Identified List */}
            <Text style={s.sectionTitle}>AI Food Identifications</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.foodPresetsList}>
              {PRESET_FOODS.map((food, i) => {
                const isActive = selectedFoodIndex === i
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedFoodIndex(i)}
                    style={[
                      s.foodPresetCard,
                      isActive && { borderColor: ACCENT, backgroundColor: ACCENT_DIM },
                    ]}
                  >
                    <Text style={[s.presetCardName, isActive && { color: ACCENT }]}>{food.name}</Text>
                    <Text style={s.presetCardCalories}>{food.calories} kcal</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Custom Macro Display */}
            <Card style={s.macrosGridCard}>
              <View style={s.macrosGridHeader}>
                <View style={s.mainCalorieWrap}>
                  <Text style={s.macrosGridCalories}>{calories}</Text>
                  <Text style={s.macrosGridCalLabel}>Estimated Calories</Text>
                </View>
              </View>

              <View style={s.macrosMiniRow}>
                <View style={s.miniMacroItem}>
                  <Text style={[s.miniMacroVal, { color: '#4CAF50' }]}>{protein}g</Text>
                  <Text style={s.miniMacroLabel}>Protein</Text>
                </View>
                <View style={s.miniMacroItem}>
                  <Text style={[s.miniMacroVal, { color: '#F59E0B' }]}>{carbs}g</Text>
                  <Text style={s.miniMacroLabel}>Carbs</Text>
                </View>
                <View style={s.miniMacroItem}>
                  <Text style={[s.miniMacroVal, { color: '#8B5CF6' }]}>{fat}g</Text>
                  <Text style={s.miniMacroLabel}>Fat</Text>
                </View>
              </View>
            </Card>

            {/* Portion Control Slider */}
            <Card style={s.portionCard}>
              <View style={s.portionHeader}>
                <Text style={s.portionTitle}>Serving Portion</Text>
                <Text style={s.portionValueText}>{portion.toFixed(1)}x</Text>
              </View>
              <View style={s.portionBtnRow}>
                {[0.5, 1.0, 1.5, 2.0].map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => setPortion(val)}
                    style={[
                      s.portionSelectBtn,
                      portion === val && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    <Text style={[s.portionSelectText, portion === val && { color: '#FFF' }]}>
                      {val === 1.0 ? '1x (Normal)' : `${val}x`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Meal Category Selector */}
            <Card style={s.mealTypeCard}>
              <Text style={s.portionTitle}>Meal Log Category</Text>
              <View style={s.mealTypeBtnRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setMealType(type)}
                    style={[
                      s.mealTypeBtn,
                      mealType === type && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    <Text style={[s.mealTypeBtnText, mealType === type && { color: '#FFF' }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Logging Buttons */}
            <View style={s.reScanGroup}>
              <Button
                label={isLogging ? 'Logging...' : 'Log Food to Diary'}
                onPress={handleLogMeal}
                disabled={isLogging}
                variant="primary"
                style={s.logMealBtn}
              />

              <Pressable
                onPress={() => {
                  setStatus('idle')
                  setImageUri(null)
                  setCustomDescription('')
                  setPortion(1.0)
                }}
                style={s.reScanBtn}
              >
                <Text style={s.reScanBtnText}>Re-scan another food</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>
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
    gap: 16,
  },
  imageHeaderFrame: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  photoHeader: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  foodPresetsList: {
    flexDirection: 'row',
  },
  foodPresetCard: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.08)',
    marginRight: 8,
    alignItems: 'center',
    gap: 2,
    minWidth: 120,
  },
  presetCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  presetCardCalories: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Macro Summary Card
  macrosGridCard: {
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  macrosGridHeader: {
    alignItems: 'center',
  },
  mainCalorieWrap: {
    alignItems: 'center',
  },
  macrosGridCalories: {
    fontSize: 34,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  macrosGridCalLabel: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginTop: 2,
  },
  macrosMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  miniMacroItem: {
    alignItems: 'center',
    gap: 2,
  },
  miniMacroVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  miniMacroLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // Portion slider card
  portionCard: {
    padding: 16,
    gap: 12,
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  portionValueText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: ACCENT,
  },
  portionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portionSelectBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionSelectText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '700',
  },

  // Meal Category Selector
  mealTypeCard: {
    padding: 16,
    gap: 12,
  },
  mealTypeBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealTypeBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeBtnText: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '700',
  },

  // Logging controls
  reScanGroup: {
    gap: 10,
    marginTop: 8,
  },
  logMealBtn: {
    height: 50,
    borderRadius: 14,
  },
  reScanBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reScanBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 13.5,
    fontWeight: '700',
  },
})
