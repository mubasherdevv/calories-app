import React, { useState, useEffect } from 'react'
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

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { useProfile } from '@/hooks/useProfile'
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

  const [darkMode, setDarkMode] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return
      try {
        const saved = JSON.parse(raw)
        if (saved.darkMode !== undefined) setDarkMode(saved.darkMode)
        if (saved.pushNotifications !== undefined) setPushNotifications(saved.pushNotifications)
      } catch { /* ignored */ }
    })
  }, [])

  const handleToggle = async (key: 'darkMode' | 'pushNotifications', val: boolean) => {
    if (key === 'darkMode') setDarkMode(val)
    if (key === 'pushNotifications') setPushNotifications(val)

    try {
      const saved = { darkMode, pushNotifications, [key]: val }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(saved))
    } catch { /* ignored */ }
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
            onPress={() => router.push('/profile')}
          />
          <SettingsRow
            icon="mail"
            iconColor="#4CAF50"
            label="Email"
            value={profile?.email ?? 'seoworking009@gmail.com'}
            onPress={() => {}}
          />
          <SettingsRow
            icon="lock-closed"
            iconColor="#FF9800"
            label="Change Password"
            onPress={() => {}}
          />
          <SettingsRow
            icon="disc"
            iconColor="#FF9800"
            label="Goals & Targets"
            onPress={() => router.push('/profile')}
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
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(107, 114, 128, 0.08)' }]}>
              <Ionicons name="moon" size={17} color="#6B7280" />
            </View>
            <Text style={s.rowLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={(v) => handleToggle('darkMode', v)}
              trackColor={{ false: 'rgba(0,0,0,0.08)', true: `${MINT_SECONDARY}55` }}
              thumbColor={darkMode ? MINT_SECONDARY : '#f4f4f5'}
            />
          </View>
          <SettingsRow
            icon="globe"
            iconColor="#4CAF50"
            label="Language"
            value="English"
            onPress={() => {}}
          />
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
              <Ionicons name="notifications" size={17} color="#3B82F6" />
            </View>
            <Text style={s.rowLabel}>Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={(v) => handleToggle('pushNotifications', v)}
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
})
