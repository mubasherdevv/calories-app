/**
 * Login & Signup Screen — OTP (passwordless email) authentication.
 *
 * Social login placeholders:
 *   Google and Apple buttons are included with placeholder handlers.
 *
 * Toggles seamlessly between Log In (Screen 6) and Sign Up (Screen 7) modes.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput as RNTextInput,
  ScrollView,
  DeviceEventEmitter,
  ImageBackground,
  StatusBar,
} from 'react-native'
import { BlurView } from 'expo-blur'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import {
  ACCENT,
  ACCENT_DIM,
  ACCENT_BORDER,
  SURFACE,
  BORDER,
  ERROR,
  ERROR_DIM,
  TEXT_SECONDARY,
} from '@/lib/theme'
import { APP_SCHEME } from '@/lib/constants'
import { Fonts } from '@/lib/typography'
import { useToast } from '@/contexts/ToastContext'

WebBrowser.maybeCompleteAuthSession()

const DEV_ALLOW_SKIP = __DEV__

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'trashmail.me',
  'maildrop.cc',
  'mailnesia.com',
  'discard.email',
  'throwaway.email',
  'getnada.com',
  'fakeinbox.com',
  'getairmail.com',
  'spam4.me',
  'spamgourmet.com',
  'dispostable.com',
  'filzmail.com',
])

function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  const atIdx = trimmed.lastIndexOf('@')
  if (atIdx === -1) return trimmed
  const local = trimmed.slice(0, atIdx)
  const domain = trimmed.slice(atIdx + 1)
  const cleanLocal = local.split('+')[0]
  const gmailDomains = ['gmail.com', 'googlemail.com']
  const finalLocal = gmailDomains.includes(domain) ? cleanLocal.replace(/\./g, '') : cleanLocal
  return `${finalLocal}@${domain}`
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()

  const [isSignUp, setIsSignUp] = useState(false) // Screen 6 (Login) vs Screen 7 (Signup)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('') // For signup name input
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<RNTextInput>(null)

  const handleAuth = async () => {
    const normalized = normalizeEmail(email)
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      setError('Enter a valid email address')
      return
    }
    const domain = normalized.split('@')[1]
    if (DISPOSABLE_DOMAINS.has(domain)) {
      setError('Temporary email addresses are not allowed.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Please enter your full name')
        setLoading(false)
        return
      }
      track('signup_started')
      const { data, error: err } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            onboarding_completed: false,
          },
        },
      })
      setLoading(false)
      if (err) {
        setError(err.message)
        return
      }
      showToast('Account created! Please check your email to verify.', 'success')
      setIsSignUp(false)
      setPassword('')
    } else {
      track('login_started')
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      })

      if (err) {
        setLoading(false)
        setError(err.message)
        return
      }

      // STRICT EMAIL VERIFICATION GUARD
      const user = data?.user
      if (user && !user.email_confirmed_at) {
        // Sign out immediately to invalidate session and show Toast alert!
        await supabase.auth.signOut()
        setLoading(false)
        showToast('Verify your email first then login', 'error')
        return
      }

      setLoading(false)
      track('login_success')
    }
  }

  const handleDevSkip = () => {
    DeviceEventEmitter.emit('__dev_skip_auth__')
  }

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setLoading(true)
    setError(null)
    try {
      const redirectTo = `${APP_SCHEME}://auth/callback`
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (err) throw err
      if (!data.url) throw new Error('No OAuth URL returned.')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success') {
        const { error: sessionErr } = await supabase.auth.exchangeCodeForSession(result.url)
        if (sessionErr) throw sessionErr
      }
    } catch (e: any) {
      setError(e?.message ?? `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed.`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => handleOAuthLogin('google')
  const handleAppleLogin = () => handleOAuthLogin('apple')

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* Food background image */}
      <ImageBackground
        source={require('../../assets/food-bg.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Back button */}
      <Pressable onPress={() => router.back()} style={[s.backBtn, { top: insets.top + 14 }]} hitSlop={14}>
        <View style={s.backCircle}>
          <Ionicons name="chevron-back" size={20} color="#333" />
        </View>
      </Pressable>

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            s.form,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Title above the card */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.titleWrap}>
            <Text style={s.titleBold}>{isSignUp ? 'Create Account ✨' : 'Welcome Back 👋'}</Text>
            <Text style={s.sub}>
              {isSignUp
                ? 'Join Cal AI today for intelligent eating guidance'
                : 'Log in to continue your journey'}
            </Text>
          </Animated.View>

          {/* Glassmorphism card */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={s.card}>
              <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
              
              <View style={s.stepWrap}>
                {/* Signup Full Name field */}
                {isSignUp && (
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Full Name</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="person-outline" size={18} color="#666" style={s.inputIcon} />
                      <RNTextInput
                        value={fullName}
                        onChangeText={(v) => {
                          setFullName(v)
                          setError(null)
                        }}
                        placeholder="Khadija"
                        placeholderTextColor="#aaa"
                        style={s.input}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                )}

                <View style={s.fieldGroup}>
                  <Text style={s.label}>Email Address</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color="#666" style={s.inputIcon} />
                    <RNTextInput
                      ref={emailRef}
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v)
                        setError(null)
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor="#aaa"
                      style={[s.input, error ? s.inputErr : null]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleAuth}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Password field */}
                <View style={s.fieldGroup}>
                  <Text style={s.label}>Password</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color="#666" style={s.inputIcon} />
                    <RNTextInput
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v)
                        setError(null)
                      }}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#aaa"
                      style={s.input}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handleAuth}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={18} 
                        color="#666" 
                      />
                    </Pressable>
                  </View>
                </View>

                {error ? <ErrorBanner msg={error} /> : null}

                {/* Action button */}
                <Pressable
                  onPress={handleAuth}
                  disabled={loading || !email.trim() || !password.trim() || (isSignUp && !fullName.trim())}
                  style={({ pressed }) => ({
                    opacity: loading || !email.trim() || !password.trim() || (isSignUp && !fullName.trim()) ? 0.5 : pressed ? 0.88 : 1,
                    borderRadius: 999,
                    overflow: 'hidden',
                  })}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#4CAF50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.btnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Divider */}
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or continue with</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* Social buttons */}
                <View style={s.socialRow}>
                  <Pressable
                    onPress={handleGoogleLogin}
                    style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Ionicons name="logo-google" size={17} color="#EA4335" />
                    <Text style={s.socialBtnText}>Google</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAppleLogin}
                    style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Ionicons name="logo-apple" size={17} color="#1A1A1A" />
                    <Text style={s.socialBtnText}>Apple</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Dev skip */}
          {DEV_ALLOW_SKIP && (
            <Pressable
              onPress={handleDevSkip}
              style={({ pressed }) => [s.devSkipBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="play-skip-forward-outline" size={14} color="#888" />
              <Text style={s.devSkipText}>Skip to Home (dev only)</Text>
            </Pressable>
          )}

          {/* Dynamic Bottom log in/sign up toggle link */}
          <View style={s.bottomRow}>
            <Text style={s.bottomText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)} hitSlop={10}>
              <Text style={s.bottomLink}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[s.errorBox, { backgroundColor: ERROR_DIM, borderColor: `${ERROR}33` }]}
    >
      <Text style={{ color: ERROR, fontSize: 12.5, fontWeight: '600' }}>{msg}</Text>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { position: 'absolute', left: 16, zIndex: 20 },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kav: { flex: 1 },
  form: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'flex-end' },

  // Title above card
  titleWrap: { marginBottom: 20, paddingHorizontal: 4 },
  titleBold: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.6, lineHeight: 34 },
  sub: { fontSize: 14, color: '#444', fontWeight: '500', lineHeight: 20, marginTop: 4 },

  // Glassmorphism card
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 22,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
      default: {},
    }),
  },

  // Steps wrapper
  stepWrap: { gap: 14 },

  // Fields
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
    fontFamily: Fonts.regular,
    fontWeight: '600',
  },
  inputErr: {},

  // Buttons
  btn: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Social buttons
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.12)' },
  dividerText: { color: '#555', fontSize: 12, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  socialBtnText: { color: '#1A1A1A', fontSize: 14, fontWeight: '700' },

  // Error
  errorBox: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },

  // Lockout
  lockoutBox: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  lockoutText: { color: '#B45309', fontSize: 13, fontWeight: '600' },

  // OTP
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    color: '#1A1A1A',
    fontSize: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    fontFamily: Fonts.regular,
  },
  otpBoxOn: { color: ACCENT },
  otpMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resendText: { color: ACCENT, fontSize: 13, fontWeight: '700' },

  // Dev skip
  devSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  devSkipText: { fontSize: 12, color: '#666', fontWeight: '500' },

  // Bottom link
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingBottom: 8,
  },
  bottomText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  bottomLink: { fontSize: 13, color: '#FFF', fontWeight: '800', textDecorationLine: 'underline' },
})
