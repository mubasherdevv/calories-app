import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { AlertModal } from '@/components/ui/AppModal'
import TextInputField from '@/components/ui/TextInputField'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { logoutRevenueCat } from '@/lib/purchases'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { adjustBrightness } from '@/lib/utils'
import {
  ACCENT,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useProfile } from '@/hooks/useProfile'
import { useProfileGoals, useUpdateProfileGoals } from '@/hooks/useFoodLogs'
import { useToast } from '@/contexts/ToastContext'
import Svg, { Circle } from 'react-native-svg'

const { width: SW } = Dimensions.get('window')

// Palette matching premium mint theme
const BG_MINT = '#F5FFF6'
const MINT_PRIMARY = '#4ADE80'
const MINT_SECONDARY = '#22C55E'

interface CircularProgressProps {
  value: string
  label: string
  percentage: number
  color: string
}

function GoalCircularProgress({ value, label, percentage, color }: CircularProgressProps) {
  const size = 74
  const strokeWidth = 5.5
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <View style={s.circleContainer}>
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.04)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center Text overlay */}
      <View style={s.circleOverlayTextContainer}>
        <Text style={s.circleValueText}>{value}</Text>
        <Text style={s.circleLabelText}>{label}</Text>
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()
  const { isPremium } = useSubscription()
  const { data: profile } = useProfile()
  const { data: goals } = useProfileGoals()
  const { mutate: updateGoals, isPending: isUpdating } = useUpdateProfileGoals()

  // ─── Local Goal States ───
  const [calTarget, setCalTarget] = useState('1850')
  const [protTarget, setProtTarget] = useState('138')
  const [carbTarget, setCarbTarget] = useState('210')
  const [fatTarget, setFatTarget] = useState('52')

  // Modal editor visibility
  const [editGoalsModal, setEditGoalsModal] = useState(false)
  const [signOutModal, setSignOutModal] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  // Hydrate local states once values load
  useEffect(() => {
    if (goals) {
      setCalTarget(String(goals.calorieGoal ?? 1850))
      setProtTarget(String(goals.proteinGoal ?? 138))
      setCarbTarget(String(goals.carbsGoal ?? 210))
      setFatTarget(String(goals.fatGoal ?? 52))
    }
  }, [goals])

  const handleSaveTargets = () => {
    const c = parseInt(calTarget) || 1850
    const p = parseInt(protTarget) || 138
    const carb = parseInt(carbTarget) || 210
    const f = parseInt(fatTarget) || 52

    updateGoals(
      {
        calorieGoal: c,
        proteinGoal: p,
        carbsGoal: carb,
        fatGoal: f,
      },
      {
        onSuccess: () => {
          showToast('Targets updated!', 'success')
          setEditGoalsModal(false)
        },
        onError: () => {
          showToast('Failed to save targets.', 'error')
        },
      }
    )
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      track('logout')
      await logoutRevenueCat()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (e: any) {
      setErrorModal(e?.message ?? 'Sign out failed. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Profile Header Section ─── */}
      <View style={s.headerRow}>
        <View style={s.avatarContainer}>
          <Image
            source={require('../../assets/avatar.png')}
            style={s.avatar}
          />
          <View style={s.verifiedDot}>
            <Ionicons name="checkmark-circle" size={14} color="#FFF" />
          </View>
        </View>

        <View style={s.headerInfo}>
          <View style={s.nameBadgeRow}>
            <Text style={s.nameText}>{profile?.fullName ?? 'MUbadh Dev'}</Text>
            <Ionicons name="checkmark-circle" size={16} color={MINT_SECONDARY} style={{ marginLeft: 4 }} />
          </View>
          <Text style={s.emailText} numberOfLines={1} ellipsizeMode="tail">
            {profile?.email ?? 'seoworking009@gmail.com'}
          </Text>
          <View style={s.streakPill}>
            <Text style={s.streakPillText}>🔥 {goals?.streakCount ?? 1} Day Streak</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [s.settingsShortcutCard, pressed && { opacity: 0.82 }]}
        >
          <Ionicons name="settings-outline" size={18} color="#444" />
        </Pressable>
      </View>

      {/* ─── Pro Account Promo Card ─── */}
      <Pressable onPress={() => router.push('/upgrade')} style={s.upgradePromoCard}>
        <LinearGradient
          colors={[MINT_PRIMARY, adjustBrightness(MINT_PRIMARY, -16)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.upgradeLeftIcon}>
          <Ionicons name="sparkles" size={16} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.upgradeTitleText}>Upgrade to Cal AI Pro</Text>
          <Text style={s.upgradeSubtext}>Unlock unlimited scanning, macros advice, and AI coaching.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
      </Pressable>

      {/* ─── Your Progress This Week Strip ─── */}
      <View style={s.sectionHeader}>
        <Ionicons name="trending-up" size={18} color={MINT_SECONDARY} style={{ marginRight: 6 }} />
        <Text style={s.sectionTitleText}>Your Progress This Week</Text>
      </View>

      <Card style={s.progressStripCard}>
        {/* Calories Logged */}
        <View style={s.progressStatCol}>
          <View style={[s.statIconCircle, { backgroundColor: 'rgba(74, 222, 128, 0.12)' }]}>
            <Ionicons name="flame" size={15} color={MINT_SECONDARY} />
          </View>
          <Text style={s.statValueText}>12,400</Text>
          <Text style={s.statLabelText}>Calories Logged</Text>
        </View>

        {/* Meals Tracked */}
        <View style={s.progressStatCol}>
          <View style={[s.statIconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.12)' }]}>
            <Ionicons name="restaurant" size={15} color="#60A5FA" />
          </View>
          <Text style={s.statValueText}>43</Text>
          <Text style={s.statLabelText}>Meals Tracked</Text>
        </View>

        {/* Foods Scanned */}
        <View style={s.progressStatCol}>
          <View style={[s.statIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
            <Ionicons name="scan" size={15} color="#A855F7" />
          </View>
          <Text style={s.statValueText}>27</Text>
          <Text style={s.statLabelText}>Foods Scanned</Text>
        </View>

        {/* Water Avg */}
        <View style={s.progressStatCol}>
          <View style={[s.statIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <Ionicons name="water" size={15} color="#3B82F6" />
          </View>
          <Text style={s.statValueText}>2.3 L</Text>
          <Text style={s.statLabelText}>Water Avg</Text>
        </View>
      </Card>

      {/* ─── Nutritional Goals Section ─── */}
      <View style={s.sectionHeaderBetween}>
        <View style={s.sectionHeader}>
          <Ionicons name="disc-outline" size={18} color={MINT_SECONDARY} style={{ marginRight: 6 }} />
          <Text style={s.sectionTitleText}>Nutritional Goals</Text>
        </View>
        <Pressable onPress={() => setEditGoalsModal(true)} hitSlop={8}>
          <Text style={s.sectionHeaderLinkText}>Edit Goals</Text>
        </Pressable>
      </View>

      <Card style={s.goalsCard}>
        <View style={s.goals2x2Grid}>
          {/* Calorie Goal */}
          <View style={s.goalMetricTileCircular}>
            <Text style={s.goalTileLabelCircular}>Calories Goal</Text>
            <GoalCircularProgress
              value={calTarget}
              label="kcal"
              percentage={60}
              color={MINT_SECONDARY}
            />
          </View>

          {/* Protein Target */}
          <View style={s.goalMetricTileCircular}>
            <Text style={s.goalTileLabelCircular}>Protein Target</Text>
            <GoalCircularProgress
              value={protTarget}
              label="grams"
              percentage={48}
              color="#60A5FA"
            />
          </View>

          {/* Carbs Target */}
          <View style={s.goalMetricTileCircular}>
            <Text style={s.goalTileLabelCircular}>Carbs Target</Text>
            <GoalCircularProgress
              value={carbTarget}
              label="grams"
              percentage={70}
              color="#F59E0B"
            />
          </View>

          {/* Fats Target */}
          <View style={s.goalMetricTileCircular}>
            <Text style={s.goalTileLabelCircular}>Fats Target</Text>
            <GoalCircularProgress
              value={fatTarget}
              label="grams"
              percentage={55}
              color="#A855F7"
            />
          </View>
        </View>
      </Card>

      {/* ─── Quick Actions Section ─── */}
      <View style={s.sectionHeader}>
        <Ionicons name="grid-outline" size={17} color={MINT_SECONDARY} style={{ marginRight: 6 }} />
        <Text style={s.sectionTitleText}>Quick Actions</Text>
      </View>

      <Card style={s.quickActionsCard}>
        {/* My Progress */}
        <Pressable onPress={() => router.push('/explore')} style={s.actionTileBtn}>
          <View style={[s.actionIconCircle, { backgroundColor: 'rgba(74, 222, 128, 0.08)' }]}>
            <Ionicons name="bar-chart" size={17} color={MINT_SECONDARY} />
          </View>
          <Text style={s.actionTileText}>My Progress</Text>
        </Pressable>

        {/* Achievements */}
        <Pressable style={s.actionTileBtn}>
          <View style={[s.actionIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
            <Ionicons name="trophy" size={17} color="#F59E0B" />
          </View>
          <Text style={s.actionTileText}>Achievements</Text>
        </Pressable>

        {/* Upgrade Pro */}
        <Pressable onPress={() => router.push('/upgrade')} style={s.actionTileBtn}>
          <View style={[s.actionIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.08)' }]}>
            <Ionicons name="ribbon" size={17} color="#A855F7" />
          </View>
          <Text style={s.actionTileText}>Upgrade Pro</Text>
        </Pressable>

        {/* Settings */}
        <Pressable onPress={() => router.push('/settings')} style={s.actionTileBtn}>
          <View style={[s.actionIconCircle, { backgroundColor: 'rgba(107, 114, 128, 0.08)' }]}>
            <Ionicons name="settings" size={17} color="#6B7280" />
          </View>
          <Text style={s.actionTileText}>Settings</Text>
        </Pressable>
      </Card>

      {/* ─── Sign Out Button ─── */}
      <Pressable
        onPress={() => setSignOutModal(true)}
        disabled={signingOut}
        style={({ pressed }) => [s.signOutBtn, (pressed || signingOut) && { opacity: 0.80 }]}
      >
        <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
        <Text style={s.signOutBtnText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
      </Pressable>

      {/* ─── Targets Editing Modal ─── */}
      <Modal
        visible={editGoalsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditGoalsModal(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEditGoalsModal(false)} />
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Update Nutritional Targets</Text>
              <Pressable onPress={() => setEditGoalsModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#666" />
              </Pressable>
            </View>

            <View style={s.modalContent}>
              <TextInputField
                label="Calories Goal (kcal)"
                value={calTarget}
                onChangeText={setCalTarget}
                keyboardType="number-pad"
              />
              <TextInputField
                label="Protein Target (g)"
                value={protTarget}
                onChangeText={setProtTarget}
                keyboardType="number-pad"
              />
              <TextInputField
                label="Carbs Target (g)"
                value={carbTarget}
                onChangeText={setCarbTarget}
                keyboardType="number-pad"
              />
              <TextInputField
                label="Fats Target (g)"
                value={fatTarget}
                onChangeText={setFatTarget}
                keyboardType="number-pad"
              />

              <Pressable
                onPress={handleSaveTargets}
                disabled={isUpdating}
                style={({ pressed }) => [
                  s.modalSaveBtn,
                  pressed && { opacity: 0.88 },
                  isUpdating && { opacity: 0.6 }
                ]}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.modalSaveBtnText}>Save Targets</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Alert Modal */}
      <AlertModal
        visible={signOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setSignOutModal(false) },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: () => {
              setSignOutModal(false)
              handleSignOut()
            },
          },
        ]}
        onDismiss={() => setSignOutModal(false)}
      />

      {/* Error Alert Modal */}
      <AlertModal
        visible={!!errorModal}
        title="Error"
        message={errorModal ?? ''}
        buttons={[{ text: 'OK', onPress: () => setErrorModal(null) }]}
        onDismiss={() => setErrorModal(null)}
      />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_MINT },
  container: { paddingHorizontal: 20, gap: 18 },

  // Header row elements
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: 66,
    height: 66,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: MINT_SECONDARY,
    borderWidth: 2,
    borderColor: BG_MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  emailText: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    marginTop: 4,
  },
  streakPillText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '800',
  },
  settingsShortcutCard: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  // Upgrade promo banner card
  upgradePromoCard: {
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  upgradeLeftIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitleText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '900',
  },
  upgradeSubtext: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },

  // Sections Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: -4,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: -4,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderLinkText: {
    fontSize: 11.5,
    color: MINT_SECONDARY,
    fontWeight: '900',
  },

  // Stats Progress Strip Card
  progressStripCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  progressStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValueText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  statLabelText: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Goals Card Grid
  goalsCard: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  goals2x2Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  goalMetricTileCircular: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goalTileLabelCircular: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    fontWeight: '800',
    textAlign: 'center',
  },
  circleContainer: {
    width: 74,
    height: 74,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  circleOverlayTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  circleValueText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  circleLabelText: {
    fontSize: 8.5,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    marginTop: -2,
  },

  // Quick Action Buttons
  quickActionsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionTileBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },

  // Soft red Sign out
  signOutBtn: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#EF4444',
  },

  // Modal Editing Layout styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: MINT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: MINT_SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
})
