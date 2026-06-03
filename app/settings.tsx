import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BlurView } from 'expo-blur'
import { Modal, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = Array.from({ length: 60 }, (_, i) => 2010 - i)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import TextInputField from '@/components/ui/TextInputField'
import { AlertModal } from '@/components/ui/AppModal'
import { useProfile } from '@/hooks/useProfile'
import { useAIConfig, useSaveAIConfig } from '@/hooks/useAIConfig'
import { useGoals, useSaveGoals } from '@/hooks/useGoals'
import { usePersonalStats, useSavePersonalStats } from '@/hooks/usePersonalStats'
import { supabase } from '@/lib/supabase'
import {
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/lib/theme'

const SETTINGS_KEY = 'app_settings'
const BG_MINT = '#F5FFF6'
const MINT_SECONDARY = '#22C55E'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { data: profile } = useProfile()

  const [pushNotifications, setPushNotifications] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return
      try {
        const saved = JSON.parse(raw)
        if (saved.pushNotifications !== undefined) setPushNotifications(saved.pushNotifications)
      } catch { /* ignored */ }
    })
  }, [])

  const handleToggle = async (val: boolean) => {
    setPushNotifications(val)
    try {
      const saved = { pushNotifications: val }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(saved))
    } catch { /* ignored */ }
  }

  // ─── Goals & Targets Modal State ───
  const { data: userGoals } = useGoals()
  const { mutateAsync: saveUserGoals } = useSaveGoals()
  const [goalsModal, setGoalsModal] = useState(false)
  const [caloriesGoal, setCaloriesGoal] = useState('2000')
  const [proteinGoal, setProteinGoal] = useState('130')
  const [carbsGoal, setCarbsGoal] = useState('220')
  const [fatsGoal, setFatsGoal] = useState('65')
  const [isSavingGoals, setIsSavingGoals] = useState(false)

  const openGoalsModal = () => {
    if (userGoals) {
      setCaloriesGoal(userGoals.calories.toString())
      setProteinGoal(userGoals.protein.toString())
      setCarbsGoal(userGoals.carbs.toString())
      setFatsGoal(userGoals.fats.toString())
    }
    setGoalsModal(true)
  }

  const handleSaveGoals = async () => {
    setIsSavingGoals(true)
    await saveUserGoals({
      calories: Number(caloriesGoal) || 2000,
      protein: Number(proteinGoal) || 130,
      carbs: Number(carbsGoal) || 220,
      fats: Number(fatsGoal) || 65,
    })
    setIsSavingGoals(false)
    setGoalsModal(false)
  }

  // ─── Personal Stats Modal State ───
  const { data: personalStats } = usePersonalStats()
  const { mutateAsync: savePersonalStats } = useSavePersonalStats()
  const [statsModal, setStatsModal] = useState(false)
  const [ageStat, setAgeStat] = useState('25')
  const [genderStat, setGenderStat] = useState<'male'|'female'|'other'>('male')
  const [weightStat, setWeightStat] = useState('75')
  const [heightStat, setHeightStat] = useState('175')
  const [goalStat, setGoalStat] = useState<'weight_loss'|'maintain'|'muscle_gain'>('weight_loss')
  const [isSavingStats, setIsSavingStats] = useState(false)

  const openStatsModal = () => {
    if (personalStats) {
      setAgeStat(personalStats.age)
      setGenderStat(personalStats.gender)
      setWeightStat(personalStats.weight)
      setHeightStat(personalStats.height)
      setGoalStat(personalStats.goal)
    }
    setStatsModal(true)
  }

  const handleSaveStats = async () => {
    setIsSavingStats(true)
    await savePersonalStats({
      age: ageStat,
      gender: genderStat,
      weight: weightStat,
      height: heightStat,
      goal: goalStat,
    })
    setIsSavingStats(false)
    setStatsModal(false)
  }

  // ─── AI Configuration Modal State ───
  const { data: aiConfigData } = useAIConfig()
  const { mutateAsync: saveAIConfig } = useSaveAIConfig()
  const [aiModal, setAiModal] = useState(false)
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'custom'>('gemini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiModelName, setAiModelName] = useState('')
  const [isSavingAi, setIsSavingAi] = useState(false)
  const [isTestingAi, setIsTestingAi] = useState(false)

  const openAiModal = () => {
    if (aiConfigData) {
      setAiProvider(aiConfigData.provider)
      setAiApiKey(aiConfigData.apiKey)
      setAiBaseUrl(aiConfigData.baseUrl)
      setAiModelName(aiConfigData.modelName)
    }
    setAiModal(true)
  }

  const handleTestAi = async () => {
    if (!aiApiKey) {
      alert("Please enter an API Key first.")
      return
    }
    setIsTestingAi(true)
    try {
      if (aiProvider === 'openai' || aiProvider === 'custom') {
        const baseUrl = aiBaseUrl || 'https://api.openai.com/v1'
        const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`
          },
          body: JSON.stringify({
            model: aiModelName || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say pong' }]
          })
        })
        if (!res.ok) throw new Error(`API Error: ${res.status}`)
        alert("Connection successful!")
      } else {
        const model = aiModelName || 'gemini-1.5-flash'
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say pong" }] }]
          })
        })
        if (!res.ok) throw new Error(`API Error: ${res.status}`)
        alert("Connection successful!")
      }
    } catch (e: any) {
      alert(`Connection failed: ${e.message}`)
    } finally {
      setIsTestingAi(false)
    }
  }

  const handleSaveAi = async () => {
    setIsSavingAi(true)
    await saveAIConfig({
      provider: aiProvider,
      apiKey: aiApiKey,
      baseUrl: aiBaseUrl,
      modelName: aiModelName,
    })
    setIsSavingAi(false)
    setAiModal(false)
  }

  // ─── Edit Profile Modal State ───
  const queryClient = useQueryClient()
  const [editProfileModal, setEditProfileModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Custom Birthday Wheel State
  const [selectedDay, setSelectedDay] = useState(15)
  const [selectedMonth, setSelectedMonth] = useState('May')
  const [selectedYear, setSelectedYear] = useState(1998)
  const dayScrollRef = useRef<ScrollView>(null)
  const monthScrollRef = useRef<ScrollView>(null)
  const yearScrollRef = useRef<ScrollView>(null)

  // Calculate age
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

  const openEditProfile = () => {
    setFullName(profile?.fullName || '')
    
    const bd = profile?.birthdate
    if (bd && bd.includes('-')) {
      const [y, m, d] = bd.split('-')
      setSelectedYear(parseInt(y) || 1998)
      setSelectedMonth(MONTHS[parseInt(m) - 1] || 'May')
      setSelectedDay(parseInt(d) || 15)
    } else {
      setSelectedYear(1998)
      setSelectedMonth('May')
      setSelectedDay(15)
    }
    
    setEditProfileModal(true)
    
    setTimeout(() => {
      const mIdx = bd && bd.includes('-') ? parseInt(bd.split('-')[1]) - 1 : 4
      const dIdx = bd && bd.includes('-') ? parseInt(bd.split('-')[2]) - 1 : 14
      const yIdx = bd && bd.includes('-') ? 2010 - parseInt(bd.split('-')[0]) : 12
      monthScrollRef.current?.scrollTo({ y: Math.max(0, mIdx) * 34, animated: false })
      dayScrollRef.current?.scrollTo({ y: Math.max(0, dIdx) * 34, animated: false })
      yearScrollRef.current?.scrollTo({ y: Math.max(0, yIdx) * 34, animated: false })
    }, 150)
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const mIdx = MONTHS.indexOf(selectedMonth) + 1
      const birthdate = `${selectedYear}-${String(mIdx).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        // Mock save for unauthenticated / template use
        queryClient.setQueryData(['profile'], (old: any) => ({
          ...old,
          fullName,
          birthdate,
        }))
        setEditProfileModal(false)
        setIsSavingProfile(false)
        return
      }

      // Update auth user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: fullName, birthdate }
      })
      if (authErr) throw authErr

      // Also update display_name in profiles table
      await supabase.from('profiles').update({ display_name: fullName }).eq('id', user.id)

      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditProfileModal(false)
    } catch (e: any) {
      alert(e.message || 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ─── Change Password Modal State ───
  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const openChangePassword = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangePasswordModal(true)
  }

  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) return alert('Please fill in all fields')
    if (newPassword !== confirmPassword) return alert('New passwords do not match')

    setIsSavingPassword(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user email')

      // Verify old password by trying to sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })
      if (signInErr) throw new Error('Incorrect old password')

      // Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateErr) throw updateErr

      alert('Password changed successfully')
      setChangePasswordModal(false)
    } catch (e: any) {
      alert(e.message || 'Failed to change password')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <View style={s.root}>
      {/* ─── Premium Header ─── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={14}>
          <Ionicons name="chevron-back" size={20} color="#333" />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* ─── ACCOUNT SECTION ─── */}
        <Text style={s.categoryTitle}>Account</Text>
        <Card compact style={s.groupCard}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
          
          <SettingsRow
            icon="person"
            iconColor="#4CAF50"
            label="Edit Profile"
            onPress={openEditProfile}
          />
          <SettingsRow
            icon="mail"
            iconColor="#4CAF50"
            label="Email"
            value={profile?.email || ''}
            onPress={() => {}}
          />
          <SettingsRow
            icon="lock-closed"
            iconColor="#FF9800"
            label="Change Password"
            onPress={openChangePassword}
          />
          <SettingsRow
            icon="body"
            iconColor="#F43F5E"
            label="Personal Stats"
            onPress={openStatsModal}
          />
          <SettingsRow
            icon="disc"
            iconColor="#FF9800"
            label="Goals & Targets"
            onPress={openGoalsModal}
            last
          />
        </Card>

        {/* ─── PREFERENCES SECTION ─── */}
        <Text style={s.categoryTitle}>Preferences</Text>
        <Card compact style={s.groupCard}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}

          <SettingsRow
            icon="bar-chart"
            iconColor="#6B7280"
            label="Units"
            value="Metric (kg, cm)"
            onPress={() => {}}
          />
          <SettingsRow
            icon="hardware-chip"
            iconColor="#8B5CF6"
            label="AI Configuration"
            onPress={openAiModal}
          />
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
              <Ionicons name="notifications" size={17} color="#3B82F6" />
            </View>
            <Text style={s.rowLabel}>Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={(v) => handleToggle(v)}
              trackColor={{ false: 'rgba(0,0,0,0.08)', true: `${MINT_SECONDARY}55` }}
              thumbColor={pushNotifications ? MINT_SECONDARY : '#f4f4f5'}
            />
          </View>
        </Card>

        {/* ─── DATA & PRIVACY SECTION ─── */}
        <Text style={s.categoryTitle}>Data & Privacy</Text>
        <Card compact style={s.groupCard}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}

          <SettingsRow
            icon="shield-checkmark"
            iconColor="#3B82F6"
            label="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
          <SettingsRow
            icon="document-text"
            iconColor="#6B7280"
            label="Terms of Service"
            onPress={() => router.push('/terms')}
          />
          <SettingsRow
            icon="trash"
            iconColor="#EF4444"
            label="Delete Account"
            onPress={() => {}}
            last
          />
        </Card>

        {/* ─── SUPPORT SECTION ─── */}
        <Text style={s.categoryTitle}>Support</Text>
        <Card compact style={s.groupCard}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}

          <SettingsRow
            icon="headset"
            iconColor="#6B7280"
            label="Contact Support"
            onPress={() => router.push('/support')}
          />
          <SettingsRow
            icon="star"
            iconColor="#FF9800"
            label="Rate App"
            onPress={() => {}}
          />
          <SettingsRow
            icon="share-social"
            iconColor="#4CAF50"
            label="Share App"
            onPress={() => {}}
            last
          />
        </Card>

        {/* ─── ABOUT SECTION ─── */}
        <Text style={s.categoryTitle}>About</Text>
        <Card compact style={s.groupCard}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}

          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(107, 114, 128, 0.08)' }]}>
              <Ionicons name="information-circle" size={17} color="#6B7280" />
            </View>
            <Text style={s.rowLabel}>App Version</Text>
            <Text style={s.rowVal}>1.0.0</Text>
          </View>
        </Card>
      </ScrollView>

      {/* ─── EDIT PROFILE MODAL ─── */}
      <Modal visible={editProfileModal} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditProfileModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            <View style={s.modalBody}>
              <TextInputField
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
              />
              <View style={{ marginTop: 24, marginBottom: 8 }}>
                <View style={s.birthdayLabelRow}>
                  <Text style={s.datePickerLabel}>BIRTHDATE</Text>
                  <View style={s.ageBadge}>
                    <Text style={s.ageBadgeText}>Age: {calculatedAge} years</Text>
                  </View>
                </View>

                <View style={s.dateWheelContainer}>
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
                        const idx = Math.max(0, Math.round(y / 34))
                        if (DAYS[idx]) setSelectedDay(DAYS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {DAYS.map((day) => (
                        <Pressable
                          key={`d-${day}`}
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
                        const idx = Math.max(0, Math.round(y / 34))
                        if (MONTHS[idx]) setSelectedMonth(MONTHS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {MONTHS.map((m, idx) => (
                        <Pressable
                          key={`m-${m}`}
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
                        const idx = Math.max(0, Math.round(y / 34))
                        if (YEARS[idx]) setSelectedYear(YEARS[idx])
                      }}
                    >
                      <View style={{ height: 34 }} />
                      {YEARS.map((y, idx) => (
                        <Pressable
                          key={`y-${y}`}
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

              <Pressable
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isSavingProfile && { opacity: 0.6 }
                ]}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save Profile</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── GOALS & TARGETS MODAL ─── */}
      <Modal visible={goalsModal} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Update Nutritional Targets</Text>
              <Pressable onPress={() => setGoalsModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <View style={s.modalBody}>
              <TextInputField
                label="CALORIES GOAL (KCAL)"
                value={caloriesGoal}
                onChangeText={setCaloriesGoal}
                keyboardType="numeric"
              />
              <TextInputField
                label="PROTEIN TARGET (G)"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                keyboardType="numeric"
              />
              <TextInputField
                label="CARBS TARGET (G)"
                value={carbsGoal}
                onChangeText={setCarbsGoal}
                keyboardType="numeric"
              />
              <TextInputField
                label="FATS TARGET (G)"
                value={fatsGoal}
                onChangeText={setFatsGoal}
                keyboardType="numeric"
              />
              <Pressable
                onPress={handleSaveGoals}
                disabled={isSavingGoals}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isSavingGoals && { opacity: 0.6 }
                ]}
              >
                {isSavingGoals ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save Targets</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── PERSONAL STATS MODAL ─── */}
      <Modal visible={statsModal} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Personal Stats</Text>
              <Pressable onPress={() => setStatsModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              
              <Text style={s.datePickerLabel}>Goal</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {(['weight_loss', 'maintain', 'muscle_gain'] as const).map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setGoalStat(g)}
                    style={[
                      s.datePickerButton, 
                      { flex: 1, height: 42, paddingHorizontal: 0, justifyContent: 'center' },
                      goalStat === g && { borderColor: '#F43F5E', backgroundColor: 'rgba(244, 63, 94, 0.1)' }
                    ]}
                  >
                    <Text style={[s.datePickerText, { fontSize: 11, textTransform: 'capitalize' }, goalStat === g && { color: '#F43F5E' }]}>
                      {g.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.datePickerLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['male', 'female', 'other'] as const).map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setGenderStat(g)}
                    style={[
                      s.datePickerButton, 
                      { flex: 1, height: 42, paddingHorizontal: 0, justifyContent: 'center' },
                      genderStat === g && { borderColor: '#F43F5E', backgroundColor: 'rgba(244, 63, 94, 0.1)' }
                    ]}
                  >
                    <Text style={[s.datePickerText, { fontSize: 13, textTransform: 'capitalize' }, genderStat === g && { color: '#F43F5E' }]}>{g}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInputField
                label="AGE"
                value={ageStat}
                onChangeText={setAgeStat}
                keyboardType="numeric"
              />
              <TextInputField
                label="WEIGHT (KG)"
                value={weightStat}
                onChangeText={setWeightStat}
                keyboardType="numeric"
              />
              <TextInputField
                label="HEIGHT (CM)"
                value={heightStat}
                onChangeText={setHeightStat}
                keyboardType="numeric"
              />

              <View style={{ height: 16 }} />
              <Pressable
                onPress={handleSaveStats}
                disabled={isSavingStats}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isSavingStats && { opacity: 0.6 }
                ]}
              >
                {isSavingStats ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save Stats</Text>
                )}
              </Pressable>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── AI CONFIGURATION MODAL ─── */}
      <Modal visible={aiModal} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>AI Configuration</Text>
              <Pressable onPress={() => setAiModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              
              <Text style={s.datePickerLabel}>Provider</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['gemini', 'openai', 'custom'] as const).map(p => (
                  <Pressable
                    key={p}
                    onPress={() => setAiProvider(p)}
                    style={[
                      s.datePickerButton, 
                      { flex: 1, height: 42, paddingHorizontal: 0, justifyContent: 'center' },
                      aiProvider === p && { borderColor: MINT_SECONDARY, backgroundColor: 'rgba(74, 222, 128, 0.1)' }
                    ]}
                  >
                    <Text style={[s.datePickerText, { fontSize: 13, textTransform: 'capitalize' }, aiProvider === p && { color: MINT_SECONDARY }]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInputField
                label="API KEY"
                value={aiApiKey}
                onChangeText={setAiApiKey}
                placeholder="sk-..."
                secureTextEntry
              />
              
              <TextInputField
                label="MODEL NAME"
                value={aiModelName}
                onChangeText={setAiModelName}
                placeholder="e.g. gpt-4o-mini"
              />

              {(aiProvider === 'openai' || aiProvider === 'custom') && (
                <TextInputField
                  label="BASE URL (OPTIONAL)"
                  value={aiBaseUrl}
                  onChangeText={setAiBaseUrl}
                  placeholder="https://api.openai.com/v1"
                />
              )}
              
              <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
                <Pressable onPress={handleTestAi} disabled={isTestingAi} style={{ padding: 10, paddingHorizontal: 16, backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: 10 }}>
                  {isTestingAi ? (
                    <ActivityIndicator size="small" color={MINT_SECONDARY} />
                  ) : (
                    <Text style={{ color: MINT_SECONDARY, fontWeight: '800', fontSize: 13 }}>Test Connection</Text>
                  )}
                </Pressable>
              </View>
              
              <Pressable
                onPress={handleSaveAi}
                disabled={isSavingAi}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isSavingAi && { opacity: 0.6 }
                ]}
              >
                {isSavingAi ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save AI Settings</Text>
                )}
              </Pressable>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── ERROR/ALERT MODAL ─── */}
      <Modal visible={changePasswordModal} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setChangePasswordModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            <View style={s.modalBody}>
              <TextInputField
                label="Old Password"
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Enter old password"
                secureTextEntry
              />
              <TextInputField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
              <TextInputField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />

              <Pressable
                onPress={handleSavePassword}
                disabled={isSavingPassword}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isSavingPassword && { opacity: 0.6 }
                ]}
              >
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save Password</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Settings Row Helper Component ───
interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  label: string
  value?: string
  onPress: () => void
  last?: boolean
}

function SettingsRow({ icon, iconColor, label, value, onPress, last }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        !last && s.rowDivider,
        pressed && { backgroundColor: 'rgba(0,0,0,0.02)' }
      ]}
    >
      <View style={[s.iconBox, { backgroundColor: `${iconColor}14` }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>

      <Text style={s.rowLabel}>{label}</Text>

      {value ? <Text style={s.rowVal} numberOfLines={1}>{value}</Text> : null}

      <Ionicons name="chevron-forward" size={16} color="#BBB" />
    </Pressable>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_MINT },
  
  // Premium Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: BG_MINT,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 222, 128, 0.10)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  body: { padding: 20, gap: 10 },

  categoryTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },

  // Grouped Frosted Cards
  groupCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
  },

  // Rows Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  rowVal: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginRight: 2,
    fontWeight: '600',
    maxWidth: 150,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalSaveBtn: {
    backgroundColor: MINT_SECONDARY,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
    color: '#22C55E',
  },
  dateWheelContainer: {
    flexDirection: 'row',
    height: 102,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
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
    color: '#9CA3AF',
  },
  dateRowTextActive: {
    color: '#22C55E',
    fontWeight: '900',
    fontSize: 15.5,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  datePickerText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
})
