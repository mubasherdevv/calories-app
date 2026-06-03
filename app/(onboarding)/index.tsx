import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import Svg, { Circle, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import {
  ACCENT,
  SURFACE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/lib/theme'

const { width: SW, height: SH } = Dimensions.get('window')

// --- Styling constants ---
const BG_MINT = '#F5FFF6'
const MINT_PRIMARY = '#4ADE80'
const MINT_SECONDARY = '#22C55E'
const MINT_BG_GLASS = 'rgba(255, 255, 255, 0.70)'
const MINT_BORDER_GLASS = 'rgba(255, 255, 255, 0.55)'

// --- Data Lists ---
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = Array.from({ length: 60 }, (_, i) => 2010 - i) // 2010 down to 1951
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

interface MetricPickerProps {
  min: number
  max: number
  value: number
  onChange: (val: number) => void
}

function MetricScrollPicker({ min, max, value, onChange }: MetricPickerProps) {
  const scrollRef = useRef<ScrollView>(null)
  const ITEM_WIDTH = 54
  
  const list = useMemo(() => {
    const arr = []
    for (let i = min; i <= max; i++) {
      arr.push(i)
    }
    return arr
  }, [min, max])

  const [isReady, setIsReady] = useState(false)

  // Scroll to active index on mount
  useEffect(() => {
    const idx = value - min
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: idx * ITEM_WIDTH, animated: false })
      setIsReady(true)
    }, 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <View style={s.pickerOuter}>
      <View style={s.pickerIndicator} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={(e) => {
          if (!isReady) return
          const x = e.nativeEvent.contentOffset.x
          const idx = Math.round(x / ITEM_WIDTH)
          const val = min + idx
          if (val >= min && val <= max && val !== value) {
            onChange(val)
          }
        }}
        contentContainerStyle={{
          paddingHorizontal: (SW - 80 - ITEM_WIDTH) / 2, // Centering logic
        }}
      >
        {list.map((item) => {
          const isSel = item === value
          return (
            <Pressable
              key={item}
              onPress={() => {
                const idx = item - min
                scrollRef.current?.scrollTo({ x: idx * ITEM_WIDTH, animated: true })
                onChange(item)
              }}
              style={{
                width: ITEM_WIDTH,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[
                s.pickerItemText,
                isSel && s.pickerItemTextActive
              ]}>
                {item}
              </Text>
              {isSel && <View style={s.pickerItemDot} />}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── SCREEN 1: Personal Info States ─────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')

  // Birthday Selector State
  const [selectedDay, setSelectedDay] = useState(15)
  const [selectedMonth, setSelectedMonth] = useState('May') // Default: May
  const [selectedYear, setSelectedYear] = useState(1998)    // Default: 1998

  // Calculate age dynamically
  const calculatedAge = useMemo(() => {
    const monthIdx = MONTHS.indexOf(selectedMonth)
    const today = new Date()
    let age = today.getFullYear() - selectedYear
    const m = today.getMonth() - monthIdx
    if (m < 0 || (m === 0 && today.getDate() < selectedDay)) {
      age--
    }
    return Math.max(0, age)
  }, [selectedDay, selectedMonth, selectedYear])

  // Refs for ScrollView pickers
  const dayScrollRef = useRef<ScrollView>(null)
  const monthScrollRef = useRef<ScrollView>(null)
  const yearScrollRef = useRef<ScrollView>(null)

  // Snap birthday pickers to defaults on mount
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => {
        // May is index 4
        monthScrollRef.current?.scrollTo({ y: 4 * 34, animated: false })
        // 15 is index 14
        dayScrollRef.current?.scrollTo({ y: 14 * 34, animated: false })
        // 1998 is index 12 in YEARS (2010 - 12 = 1998)
        yearScrollRef.current?.scrollTo({ y: 12 * 34, animated: false })
      }, 100)
    }
  }, [step])

  // ─── SCREEN 2: Body Metrics States ──────────────────────────────────────────
  const [height, setHeight] = useState(175)
  const [heightUnit, setHeightUnit] = useState<'CM' | 'FT'>('CM')
  const [weight, setWeight] = useState(72)
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LB'>('KG')
  const [goalWeight, setGoalWeight] = useState(65)

  // Dynamic Goal weight badges
  const goalWeightDifference = useMemo(() => {
    const diff = weight - goalWeight
    if (diff > 0) {
      return `Goal: Lose ${Math.round(diff)} ${weightUnit.toLowerCase()}`
    } else if (diff < 0) {
      return `Goal: Gain ${Math.round(Math.abs(diff))} ${weightUnit.toLowerCase()}`
    }
    return 'Goal: Maintain Weight'
  }, [weight, goalWeight, weightUnit])

  // ─── SCREEN 3: Goals & Lifestyle States ─────────────────────────────────────
  const [goalType, setGoalType] = useState('Lose Fat')
  const [activityLevel, setActivityLevel] = useState('Moderately Active')
  const [dietPreference, setDietPreference] = useState('Vegetarian')
  const [workoutFrequency, setWorkoutFrequency] = useState('3-4 Days')

  const [activeSheet, setActiveSheet] = useState<'goal' | 'activity' | 'diet' | 'workout' | null>(null)

  // ─── SCREEN 4: AI Generation Loading States ─────────────────────────────────
  const [generationPhase, setGenerationPhase] = useState<'loading' | 'results'>('loading')
  const [checkedList, setCheckedList] = useState<boolean[]>([false, false, false, false, false, false])

  // Brain animation values
  const brainScale = useSharedValue(1)
  const brainRotate = useSharedValue(0)

  useEffect(() => {
    if (step === 4 && generationPhase === 'loading') {
      // Pulsing brain glow
      brainScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000 }),
          withTiming(1.0, { duration: 1000 })
        ),
        -1,
        true
      )
      brainRotate.value = withRepeat(
        withTiming(360, { duration: 8000 }),
        -1,
        false
      )

      // Animate checkmarks sliding/popping in one-by-one
      const intervals = [600, 1400, 2200, 3000, 3800, 4600]
      intervals.forEach((delay, idx) => {
        setTimeout(() => {
          setCheckedList((prev) => {
            const next = [...prev]
            next[idx] = true
            return next
          })
        }, delay)
      })

      // Complete phase transitions
      setTimeout(() => {
        setGenerationPhase('results')
      }, 5400)
    }
  }, [step, generationPhase])

  const brainStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: brainScale.value },
      { rotate: `${brainRotate.value}deg` },
    ],
  }))

  // ─── Complete and Save to Supabase ──────────────────────────────────────────
  async function handleComplete() {
    setLoading(true)
    setError(null)

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'User'

    const { error: err } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        full_name: fullName,
        calorie_goal: 1850,
        protein_goal: 138,
        carbs_goal: 210,
        fat_goal: 52,
        onboarding_details: {
          firstName,
          lastName,
          gender,
          age: calculatedAge,
          height,
          heightUnit,
          weight,
          weightUnit,
          goalWeight,
          goalType,
          activityLevel,
          dietPreference,
          workoutFrequency,
        },
      },
    })

    if (err) {
      setLoading(false)
      setError('Could not save details. Please try again.')
      return
    }

    // Save profile metadata inside DB profiles table
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: fullName,
            calorie_goal: 1850,
            protein_goal: 138,
            carbs_goal: 210,
            fat_goal: 52,
          })
      }
    } catch {
      // non-fatal failure
    }

    track('onboarding_completed', { name: fullName })
    setLoading(false)
  }

  // Next and Back navigation helpers
  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!firstName.trim()) {
        setError('Please enter your first name')
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // Render navigation dots bar
  const renderProgressIndicator = () => (
    <View style={s.progressIndicatorContainer}>
      <View style={s.dotsRow}>
        <View style={[s.dot, step >= 1 && s.dotActive]} />
        <View style={[s.dot, step >= 2 && s.dotActive]} />
        <View style={[s.dot, step >= 3 && s.dotActive]} />
        <View style={[s.dot, step >= 4 && s.dotActive]} />
      </View>
      <Text style={s.stepText}>Step {step} of 4</Text>
    </View>
  )

  return (
    <View style={s.root}>
      {/* Background Mint Blurring Glows */}
      <View style={s.blurGlow1} />
      <View style={s.blurGlow2} />

      {/* --- Top Navigation Header --- */}
      <View style={[s.topNavbar, { paddingTop: insets.top + 8 }]}>
        {step > 1 && step < 4 ? (
          <Pressable onPress={handleBack} style={s.backBtn} hitSlop={15}>
            <Ionicons name="arrow-back" size={20} color={TEXT_PRIMARY} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {renderProgressIndicator()}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.scrollContainer,
            { paddingBottom: step === 1 ? insets.bottom + 80 : insets.bottom + 110 }
          ]}
          scrollEnabled={step !== 1}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
        >
          {/* ──────────────────────────────────────────────────────────────────
              SCREEN 1: PERSONAL INFORMATION
              ────────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.cardStack}>
              {/* Illustration Top Avatar badge */}
              <View style={s.avatarBadgeContainer}>
                <View style={s.avatarGlowOuter}>
                  <View style={s.avatarGlowInner}>
                    <Ionicons name="person" size={20} color="#FFF" />
                  </View>
                </View>
                <View style={s.sparkleDot1} />
                <View style={s.sparkleDot2} />
              </View>

              <View style={s.headerTexts}>
                <Text style={s.title}>Let's get to know you</Text>
                <Text style={s.subtitle}>Help us personalize your nutrition journey.</Text>
              </View>

              {/* Input details glass card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                
                {/* First Name Input */}
                <View style={s.inputWrapper}>
                  <Text style={s.label}>First Name</Text>
                  <View style={s.textInputBox}>
                    <TextInput
                      value={firstName}
                      onChangeText={(v) => {
                        setFirstName(v)
                        setError(null)
                      }}
                      placeholder="Enter your first name"
                      placeholderTextColor={TEXT_TERTIARY}
                      style={s.textInput}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Last Name Input */}
                <View style={[s.inputWrapper, { marginTop: 8 }]}>
                  <Text style={s.label}>Last Name</Text>
                  <View style={s.textInputBox}>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter your last name"
                      placeholderTextColor={TEXT_TERTIARY}
                      style={s.textInput}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              {/* Gender selector card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <Text style={s.label}>Gender</Text>
                <View style={s.genderRow}>
                  {['Male', 'Female', 'Other'].map((item) => {
                    const isSel = gender === item
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setGender(item as any)}
                        style={[s.genderBtn, isSel && s.genderBtnActive]}
                      >
                        <Text style={[s.genderBtnText, isSel && s.genderBtnTextActive]}>
                          {item}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Birthday Picker Wheel card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                
                <View style={s.birthdayLabelRow}>
                  <Text style={s.label}>Birthday</Text>
                  <View style={s.ageBadge}>
                    <Text style={s.ageBadgeText}>Age: {calculatedAge} years</Text>
                  </View>
                </View>

                {/* iOS style wheel date picker */}
                <View style={s.dateWheelContainer}>
                  {/* Selected Item highlight background bar overlay */}
                  <View style={s.dateWheelHighlightOverlay} />

                  <View style={s.dateWheelColumn}>
                    <ScrollView
                      ref={dayScrollRef}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={34}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e) => {
                        const y = e.nativeEvent.contentOffset.y
                        const idx = Math.round(y / 34)
                        if (DAYS[idx]) setSelectedDay(DAYS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {DAYS.map((day) => (
                        <Pressable
                          key={day}
                          onPress={() => {
                            setSelectedDay(day)
                            dayScrollRef.current?.scrollTo({ y: (day - 1) * 34, animated: true })
                          }}
                          style={s.dateRowItem}
                        >
                          <Text style={[s.dateRowText, selectedDay === day && s.dateRowTextActive]}>
                            {day}
                          </Text>
                        </Pressable>
                      ))}
                      <View style={{ height: 34 }} />
                    </ScrollView>
                  </View>

                  <View style={s.dateWheelColumn}>
                    <ScrollView
                      ref={monthScrollRef}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={34}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e) => {
                        const y = e.nativeEvent.contentOffset.y
                        const idx = Math.round(y / 34)
                        if (MONTHS[idx]) setSelectedMonth(MONTHS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {MONTHS.map((m, idx) => (
                        <Pressable
                          key={m}
                          onPress={() => {
                            setSelectedMonth(m)
                            monthScrollRef.current?.scrollTo({ y: idx * 34, animated: true })
                          }}
                          style={s.dateRowItem}
                        >
                          <Text style={[s.dateRowText, selectedMonth === m && s.dateRowTextActive]}>
                            {m}
                          </Text>
                        </Pressable>
                      ))}
                      <View style={{ height: 34 }} />
                    </ScrollView>
                  </View>

                  <View style={s.dateWheelColumn}>
                    <ScrollView
                      ref={yearScrollRef}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={34}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e) => {
                        const y = e.nativeEvent.contentOffset.y
                        const idx = Math.round(y / 34)
                        if (YEARS[idx]) setSelectedYear(YEARS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {YEARS.map((y, idx) => (
                        <Pressable
                          key={y}
                          onPress={() => {
                            setSelectedYear(y)
                            yearScrollRef.current?.scrollTo({ y: idx * 34, animated: true })
                          }}
                          style={s.dateRowItem}
                        >
                          <Text style={[s.dateRowText, selectedYear === y && s.dateRowTextActive]}>
                            {y}
                          </Text>
                        </Pressable>
                      ))}
                      <View style={{ height: 34 }} />
                    </ScrollView>
                  </View>
                </View>
              </View>

              {error && (
                <View style={s.errorBadge}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

            </Animated.View>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              SCREEN 2: BODY METRICS
              ────────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.cardStack}>
              {/* Illustration Top Metric Icon */}
              <View style={s.avatarBadgeContainer}>
                <View style={s.bodyMetricsGlowOuter}>
                  <View style={s.bodyMetricsGlowInner}>
                    <Ionicons name="body" size={30} color={MINT_SECONDARY} />
                  </View>
                </View>
                <View style={s.horizontalDividerLeft} />
                <View style={s.horizontalDividerRight} />
                <View style={s.sparkleCheckIcon}>
                  <Ionicons name="checkmark-circle" size={16} color={MINT_SECONDARY} />
                </View>
              </View>

              <View style={s.headerTexts}>
                <Text style={s.title}>Tell us about your body</Text>
                <Text style={s.subtitle}>We'll calculate your perfect calorie targets.</Text>
              </View>

              {/* Height Selector Card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.metricHeader}>
                  <Text style={s.metricLabel}>Height</Text>
                  <View style={s.metricToggleRow}>
                    <Pressable
                      onPress={() => setHeightUnit('CM')}
                      style={[s.metricToggleBtn, heightUnit === 'CM' && s.metricToggleBtnActive]}
                    >
                      <Text style={[s.metricToggleBtnText, heightUnit === 'CM' && s.metricToggleBtnTextActive]}>
                        CM
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setHeightUnit('FT')}
                      style={[s.metricToggleBtn, heightUnit === 'FT' && s.metricToggleBtnActive]}
                    >
                      <Text style={[s.metricToggleBtnText, heightUnit === 'FT' && s.metricToggleBtnTextActive]}>
                        FT
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <MetricScrollPicker
                  min={120}
                  max={220}
                  value={height}
                  onChange={setHeight}
                />
                <Text style={s.metricsResultBoldText}>
                  {heightUnit === 'CM' ? `${height} cm` : `${Math.floor(height / 30.48)}' ${Math.round((height % 30.48) / 2.54)}"`}
                </Text>
              </View>

              {/* Weight Selector Card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.metricHeader}>
                  <Text style={s.metricLabel}>Current Weight</Text>
                  <View style={s.metricToggleRow}>
                    <Pressable
                      onPress={() => setWeightUnit('KG')}
                      style={[s.metricToggleBtn, weightUnit === 'KG' && s.metricToggleBtnActive]}
                    >
                      <Text style={[s.metricToggleBtnText, weightUnit === 'KG' && s.metricToggleBtnTextActive]}>
                        KG
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setWeightUnit('LB')}
                      style={[s.metricToggleBtn, weightUnit === 'LB' && s.metricToggleBtnActive]}
                    >
                      <Text style={[s.metricToggleBtnText, weightUnit === 'LB' && s.metricToggleBtnTextActive]}>
                        LB
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <MetricScrollPicker
                  min={30}
                  max={250}
                  value={weight}
                  onChange={setWeight}
                />
                <Text style={s.metricsResultBoldText}>
                  {weight} {weightUnit.toLowerCase()}
                </Text>
              </View>

              {/* Goal Weight Card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.metricHeader}>
                  <Text style={s.metricLabel}>Goal Weight</Text>
                  <View style={s.goalBadgeRow}>
                    <Ionicons name="arrow-down" size={11} color={MINT_SECONDARY} style={{ marginRight: 2 }} />
                    <Text style={s.goalBadgeRowText}>{goalWeightDifference}</Text>
                  </View>
                </View>

                <MetricScrollPicker
                  min={30}
                  max={250}
                  value={goalWeight}
                  onChange={setGoalWeight}
                />
                <Text style={s.metricsResultBoldText}>
                  {goalWeight} {weightUnit.toLowerCase()}
                </Text>
              </View>

            </Animated.View>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              SCREEN 3: GOALS & LIFESTYLE
              ────────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.cardStack}>
              <View style={s.headerTexts}>
                <Text style={s.title}>Build your personalized plan</Text>
                <Text style={s.subtitle}>Tell us your goals and lifestyle habits.</Text>
              </View>

              {/* Cards for sheet togglers */}
              
              {/* Goal Type Card */}
              <Pressable onPress={() => setActiveSheet('goal')} style={s.glassCardBtn}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.cardBtnLeft}>
                  <View style={[s.iconBoxRound, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ fontSize: 16 }}>🔥</Text>
                  </View>
                  <View style={s.cardBtnTexts}>
                    <Text style={s.cardBtnLabel}>Goal Type</Text>
                    <Text style={s.cardBtnVal}>{goalType}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color={TEXT_TERTIARY} />
              </Pressable>

              {/* Activity Level Card */}
              <Pressable onPress={() => setActiveSheet('activity')} style={s.glassCardBtn}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.cardBtnLeft}>
                  <View style={[s.iconBoxRound, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={{ fontSize: 16 }}>🏃</Text>
                  </View>
                  <View style={s.cardBtnTexts}>
                    <Text style={s.cardBtnLabel}>Activity Level</Text>
                    <Text style={s.cardBtnVal}>{activityLevel}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color={TEXT_TERTIARY} />
              </Pressable>

              {/* Diet Preference Card */}
              <Pressable onPress={() => setActiveSheet('diet')} style={s.glassCardBtn}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.cardBtnLeft}>
                  <View style={[s.iconBoxRound, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={{ fontSize: 16 }}>🥗</Text>
                  </View>
                  <View style={s.cardBtnTexts}>
                    <Text style={s.cardBtnLabel}>Diet Preference</Text>
                    <Text style={s.cardBtnVal}>{dietPreference}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color={TEXT_TERTIARY} />
              </Pressable>

              {/* Workout Frequency Card */}
              <Pressable onPress={() => setActiveSheet('workout')} style={s.glassCardBtn}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                <View style={s.cardBtnLeft}>
                  <View style={[s.iconBoxRound, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={{ fontSize: 16 }}>🏋️</Text>
                  </View>
                  <View style={s.cardBtnTexts}>
                    <Text style={s.cardBtnLabel}>Workout Frequency</Text>
                    <Text style={s.cardBtnVal}>{workoutFrequency}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color={TEXT_TERTIARY} />
              </Pressable>

            </Animated.View>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              SCREEN 4: AI PLAN GENERATION
              ────────────────────────────────────────────────────────────────── */}
          {step === 4 && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.cardStack}>
              {/* Spinning/Pulsing Brain Glow */}
              <View style={s.brainContainer}>
                <Animated.View style={[s.brainGlowCircle, brainStyle]}>
                  <View style={s.brainInnerWhiteCircle}>
                    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9.5 2C7.57 2 6 3.57 6 5.5C6 6.38 6.33 7.18 6.88 7.8C5.23 8.35 4 9.9 4 11.75C4 12.83 4.43 13.8 5.12 14.5C4.43 15.2 4 16.17 4 17.25C4 19.1 5.23 20.65 6.88 21.2C6.33 21.82 6 22.62 6 23.5C6 25.43 7.57 27 9.5 27"
                        stroke={MINT_SECONDARY}
                        strokeWidth="2.0"
                        strokeLinecap="round"
                      />
                      <Path
                        d="M14.5 2C16.43 2 18 3.57 18 5.5C18 6.38 17.67 7.18 17.12 7.8C18.77 8.35 20 9.9 20 11.75C20 12.83 19.57 13.8 18.88 14.5C19.57 15.2 20 16.17 20 17.25C20 19.1 18.77 20.65 17.12 21.2C17.67 21.82 18 22.62 18 23.5C18 25.43 16.43 27 14.5 27"
                        stroke={MINT_SECONDARY}
                        strokeWidth="2.0"
                        strokeLinecap="round"
                      />
                      <Path
                        d="M12 4V20M8 12H16"
                        stroke={MINT_SECONDARY}
                        strokeWidth="2.0"
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                </Animated.View>
                <View style={s.brainPulsingBackgroundGlow} />
              </View>

              <View style={s.headerTexts}>
                <Text style={s.title}>Creating your personalized nutrition plan...</Text>
                <Text style={s.subtitle}>Our AI is analyzing your data.</Text>
              </View>

              {/* Animated Checklist card */}
              <View style={s.glassCard}>
                {Platform.OS === 'ios' && <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />}
                
                {[
                  'BMI Calculated',
                  'Daily Calories',
                  'Protein Goals',
                  'Carb Goals',
                  'Fat Goals',
                  'AI Nutrition Profile',
                ].map((item, idx) => {
                  const isChecked = checkedList[idx]
                  return (
                    <View key={item} style={[s.checkItemRow, idx > 0 && { marginTop: 12 }]}>
                      <View style={[s.checkDot, isChecked && s.checkDotActive]}>
                        {isChecked ? (
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        ) : (
                          <View style={s.checkDotInnerInactive} />
                        )}
                      </View>
                      <Text style={[s.checkItemText, isChecked && s.checkItemTextActive]}>
                        {item}
                      </Text>
                    </View>
                  )
                })}
              </View>

              {/* Results metrics (Only shown when loading is finished) */}
              {generationPhase === 'results' && (
                <Animated.View entering={FadeInDown.duration(450)} style={s.resultsGrid}>
                  {/* Calorie Results block */}
                  <View style={[s.resultMetricBlock, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={s.resultBlockVal}>1,850 kcal</Text>
                    <Text style={s.resultBlockLabel}>Daily Calories</Text>
                  </View>

                  {/* Protein Results block */}
                  <View style={[s.resultMetricBlock, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={s.resultBlockVal}>138g</Text>
                    <Text style={s.resultBlockLabel}>Protein Target</Text>
                  </View>

                  {/* Carbs Results block */}
                  <View style={[s.resultMetricBlock, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={s.resultBlockVal}>210g</Text>
                    <Text style={s.resultBlockLabel}>Carbs Target</Text>
                  </View>

                  {/* Fat Results block */}
                  <View style={[s.resultMetricBlock, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={s.resultBlockVal}>52g</Text>
                    <Text style={s.resultBlockLabel}>Fat Target</Text>
                  </View>
                </Animated.View>
              )}

              {error && (
                <View style={s.errorBadge}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

            </Animated.View>
          )}
        </ScrollView>

        {/* Fixed Dynamic Action Button Footer */}
        {!(step === 4 && generationPhase === 'loading') && (
          <View style={[s.fixedFooter, { paddingBottom: insets.bottom + 12 }]}>
            {step === 4 ? (
              <Pressable
                onPress={handleComplete}
                disabled={loading}
                style={({ pressed }) => [
                  s.completeBtnFixed,
                  (pressed || loading) && { opacity: 0.85 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.completeBtnTextFixed}>Start Tracking 🚀</Text>
                )}
              </Pressable>
            ) : (
              <Pressable onPress={handleNext} style={s.continueBtnFixed}>
                <Text style={s.continueBtnTextFixed}>Continue  →</Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ──────────────────────────────────────────────────────────────────
          BOTTOM SHEET SELECTORS (SCREEN 3)
          ────────────────────────────────────────────────────────────────── */}
      {activeSheet !== null && (
        <View style={s.bottomSheetOverlay}>
          {/* Backdrop presser to dismiss sheet */}
          <Pressable onPress={() => setActiveSheet(null)} style={StyleSheet.absoluteFill} />

          <Animated.View entering={FadeInDown.duration(300)} style={s.sheetContent}>
            {Platform.OS === 'ios' && <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />}
            <View style={s.sheetGrabber} />

            {/* Goal selector options */}
            {activeSheet === 'goal' && (
              <View style={s.sheetInner}>
                <Text style={s.sheetTitle}>Select Goal Type</Text>
                {[
                  { label: 'Lose Fat', emoji: '🔥' },
                  { label: 'Gain Muscle', emoji: '💪' },
                  { label: 'Maintain Weight', emoji: '⚖️' },
                ].map((item) => {
                  const isSel = goalType === item.label
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        setGoalType(item.label)
                        setActiveSheet(null)
                      }}
                      style={[s.sheetOptionBtn, isSel && s.sheetOptionBtnActive]}
                    >
                      <Text style={s.sheetOptionText}>{item.emoji}  {item.label}</Text>
                      {isSel && <Ionicons name="checkmark" size={16} color={MINT_SECONDARY} />}
                    </Pressable>
                  )
                })}
              </View>
            )}

            {/* Activity Level selector options */}
            {activeSheet === 'activity' && (
              <View style={s.sheetInner}>
                <Text style={s.sheetTitle}>Select Activity Level</Text>
                {[
                  { label: 'Lightly Active', emoji: '🚶' },
                  { label: 'Moderately Active', emoji: '🏃' },
                  { label: 'Very Active', emoji: '🏋️' },
                ].map((item) => {
                  const isSel = activityLevel === item.label
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        setActivityLevel(item.label)
                        setActiveSheet(null)
                      }}
                      style={[s.sheetOptionBtn, isSel && s.sheetOptionBtnActive]}
                    >
                      <Text style={s.sheetOptionText}>{item.emoji}  {item.label}</Text>
                      {isSel && <Ionicons name="checkmark" size={16} color={MINT_SECONDARY} />}
                    </Pressable>
                  )
                })}
              </View>
            )}

            {/* Diet Preference selector options */}
            {activeSheet === 'diet' && (
              <View style={s.sheetInner}>
                <Text style={s.sheetTitle}>Select Diet Preference</Text>
                {[
                  { label: 'Non-Veg', emoji: '🍗' },
                  { label: 'Vegetarian', emoji: '🥗' },
                  { label: 'Vegan', emoji: '🌱' },
                ].map((item) => {
                  const isSel = dietPreference === item.label
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        setDietPreference(item.label)
                        setActiveSheet(null)
                      }}
                      style={[s.sheetOptionBtn, isSel && s.sheetOptionBtnActive]}
                    >
                      <Text style={s.sheetOptionText}>{item.emoji}  {item.label}</Text>
                      {isSel && <Ionicons name="checkmark" size={16} color={MINT_SECONDARY} />}
                    </Pressable>
                  )
                })}
              </View>
            )}

            {/* Workout Frequency selector options */}
            {activeSheet === 'workout' && (
              <View style={s.sheetInner}>
                <Text style={s.sheetTitle}>Select Workout Frequency</Text>
                {[
                  { label: '0-2 Days', emoji: '🚶' },
                  { label: '3-4 Days', emoji: '🏃' },
                  { label: '5-6 Days', emoji: '🏋️' },
                  { label: '7+ Days', emoji: '🔥' },
                ].map((item) => {
                  const isSel = workoutFrequency === item.label
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        setWorkoutFrequency(item.label)
                        setActiveSheet(null)
                      }}
                      style={[s.sheetOptionBtn, isSel && s.sheetOptionBtnActive]}
                    >
                      <Text style={s.sheetOptionText}>{item.emoji}  {item.label}</Text>
                      {isSel && <Ionicons name="checkmark" size={16} color={MINT_SECONDARY} />}
                    </Pressable>
                  )
                })}
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  )
}

// --- Dynamic Styles ---

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MINT,
    overflow: 'hidden',
  },

  // Glowing soft green highlights
  blurGlow1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
  },
  blurGlow2: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    filter: Platform.OS === 'web' ? 'blur(120px)' : undefined,
  },

  // Navbar header
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  progressIndicatorContainer: {
    alignItems: 'center',
    gap: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(74, 222, 128, 0.22)',
  },
  dotActive: {
    backgroundColor: MINT_SECONDARY,
    width: 14,
  },
  stepText: {
    fontSize: 9,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Scrolling view
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  cardStack: {
    gap: 10,
    width: '100%',
  },

  // Avatar personal badge style (Screen 1)
  avatarBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    position: 'relative',
    alignSelf: 'center',
    width: 64,
  },
  avatarGlowOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlowInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MINT_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  sparkleDot1: {
    position: 'absolute',
    top: 8,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: MINT_SECONDARY,
  },
  sparkleDot2: {
    position: 'absolute',
    bottom: 8,
    left: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MINT_SECONDARY,
  },

  // Header Titles
  headerTexts: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
    maxWidth: 290,
  },

  // Base frosted glassmorphism card
  glassCard: {
    backgroundColor: MINT_BG_GLASS,
    borderWidth: 1.5,
    borderColor: MINT_BORDER_GLASS,
    borderRadius: 24,
    padding: 11,
    overflow: 'hidden',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  // Input layouts
  inputWrapper: {
    gap: 4,
    width: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TEXT_SECONDARY,
  },
  textInputBox: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Gender pills
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1.2,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: MINT_SECONDARY,
    borderColor: MINT_SECONDARY,
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 3,
  },
  genderBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  genderBtnTextActive: {
    color: '#FFF',
  },

  // Date wheel picker styles
  birthdayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ageBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  ageBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MINT_SECONDARY,
  },
  dateWheelContainer: {
    flexDirection: 'row',
    height: 102, // Exactly 3 rows of height 34
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  dateWheelHighlightOverlay: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderWidth: 1.2,
    borderColor: 'rgba(74, 222, 128, 0.20)',
  },
  dateWheelColumn: {
    flex: 1,
    height: '100%',
  },
  dateRowItem: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRowText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  dateRowTextActive: {
    color: MINT_SECONDARY,
    fontWeight: '900',
    fontSize: 15.5,
  },

  // Button triggers
  continueBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: MINT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  continueBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFF',
  },

  // Screen 2 Body Metrics styling
  bodyMetricsGlowOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyMetricsGlowInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.20)',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  horizontalDividerLeft: {
    position: 'absolute',
    left: -20,
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(74, 222, 128, 0.25)',
  },
  horizontalDividerRight: {
    position: 'absolute',
    right: -20,
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(74, 222, 128, 0.25)',
  },
  sparkleCheckIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 99,
  },

  // Slider simulator layout
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  metricToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 2.5,
  },
  metricToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  metricToggleBtnActive: {
    backgroundColor: MINT_SECONDARY,
  },
  metricToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: TEXT_SECONDARY,
  },
  metricToggleBtnTextActive: {
    color: '#FFF',
  },
  sliderBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  sliderArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderMiddleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  sliderSubText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },
  sliderActiveTextChip: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.20)',
  },
  sliderActiveText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  metricsResultBoldText: {
    fontSize: 16,
    fontWeight: '900',
    color: MINT_SECONDARY,
    textAlign: 'center',
    marginTop: 2,
  },
  goalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  goalBadgeRowText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MINT_SECONDARY,
  },

  // Screen 3 list cards
  glassCardBtn: {
    backgroundColor: MINT_BG_GLASS,
    borderWidth: 1.5,
    borderColor: MINT_BORDER_GLASS,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBoxRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  cardBtnTexts: {
    gap: 2,
  },
  cardBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  cardBtnVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: MINT_SECONDARY,
  },

  // Screen 4 AI Plan Loading styling
  brainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    position: 'relative',
    alignSelf: 'center',
    width: 120,
  },
  brainGlowCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  brainInnerWhiteCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 3,
  },
  brainPulsingBackgroundGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },

  // Checklists rows
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotActive: {
    backgroundColor: MINT_SECONDARY,
    borderColor: MINT_SECONDARY,
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  checkDotInnerInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  checkItemText: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  checkItemTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
  },

  // Results grids (Screen 4 Phase 2)
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  resultMetricBlock: {
    width: (SW - 60) / 2, // Splits nicely into a dynamic 2x2 grid
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  resultBlockVal: {
    fontSize: 17,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  resultBlockLabel: {
    fontSize: 10.5,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    marginTop: 4,
  },

  // Complete Onboarding button
  completeBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: MINT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 12,
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },

  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom sheets overlays & cards
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetInner: {
    paddingHorizontal: 24,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  sheetOptionBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionBtnActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.20)',
  },
  sheetOptionText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },

  // MetricScrollPicker styles
  pickerOuter: {
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 2,
    overflow: 'hidden',
  },
  pickerIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    width: 50,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1.2,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    zIndex: 1,
  },
  pickerItemText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    zIndex: 2,
  },
  pickerItemTextActive: {
    fontSize: 15,
    color: MINT_SECONDARY,
    fontWeight: '900',
    zIndex: 2,
  },
  pickerItemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MINT_SECONDARY,
    marginTop: 2,
    zIndex: 2,
  },

  // Fixed action footer styles
  fixedFooter: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: BG_MINT,
    borderTopWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.10)',
  },
  continueBtnFixed: {
    height: 52,
    borderRadius: 16,
    backgroundColor: MINT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnTextFixed: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFF',
  },
  completeBtnFixed: {
    height: 54,
    borderRadius: 18,
    backgroundColor: MINT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  completeBtnTextFixed: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
})
