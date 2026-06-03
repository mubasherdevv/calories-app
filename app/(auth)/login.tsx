import { useState, useRef } from 'react'
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
  Image,
  StatusBar,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { useToast } from '@/contexts/ToastContext'

WebBrowser.maybeCompleteAuthSession()

const { width: SW, height: SH } = Dimensions.get('window')
const DEV_ALLOW_SKIP = __DEV__

const ACCENT = '#22C55E'
const ACCENT_LIGHT = '#4ADE80'
const ERROR = '#EF4444'
const ERROR_DIM = 'rgba(239, 68, 68, 0.08)'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const emailRef = useRef<RNTextInput>(null)
  const passwordRef = useRef<RNTextInput>(null)

  const hasMinLength = password.length >= 8
  const hasLettersAndNumbers = /[A-Za-z]/.test(password) && /\d/.test(password)
  const isPasswordValid = hasMinLength && hasLettersAndNumbers

  const handleAuth = async () => {
    setEmailError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)
    setGeneralError(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError('Enter a valid email address')
      return
    }
    if (!password) {
      setPasswordError('Password is required')
      return
    }

    if (isSignUp) {
      if (!isPasswordValid) {
        setPasswordError('Password must satisfy strength requirements')
        return
      }
      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match')
        return
      }
      if (!agreeTerms) {
        setGeneralError('Please agree to the Terms & Conditions')
        return
      }

      setLoading(true)
      track('signup_started')

      const { error: err } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedEmail.split('@')[0],
            onboarding_completed: false,
          },
        },
      })

      setLoading(false)
      if (err) {
        setGeneralError(err.message)
        return
      }

      showToast('Account created! Please check your email to verify.', 'success')
      setIsSignUp(false)
      setPassword('')
      setConfirmPassword('')
      setAgreeTerms(false)
    } else {
      setLoading(true)
      track('login_started')

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (err) {
        setLoading(false)
        if (err.message.toLowerCase().includes('credential') || err.message.toLowerCase().includes('invalid')) {
          setGeneralError('Invalid email or password')
          setEmailError(' ')
          setPasswordError(' ')
        } else {
          setGeneralError(err.message)
        }
        return
      }

      const user = data?.user
      if (user && !user.email_confirmed_at) {
        await supabase.auth.signOut()
        setLoading(false)
        setGeneralError('Please verify your email address first.')
        return
      }

      setLoading(false)
      track('login_success')
    }
  }

  const handleDevSkip = () => {
    DeviceEventEmitter.emit('__dev_skip_auth__')
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: isSignUp ? insets.bottom + 24 : insets.bottom + 12 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={isSignUp} // Disable scroll on Login screen
          bounces={isSignUp}
          scrollEventThrottle={16}
        >
          {!isSignUp ? (
            <View style={[s.heroSection, { paddingTop: insets.top + 10 }]}>
              <View style={s.glowBg1} />
              <View style={s.glowBg2} />
              <View style={s.glowBg3} />

              <Pressable
                onPress={() => router.back()}
                style={[s.backBtn, { top: insets.top + 10 }]}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
              </Pressable>

              <Pressable
                onPress={handleDevSkip}
                style={[s.skipBtn, { top: insets.top + 14 }]}
                hitSlop={12}
              >
                <Text style={s.skipText}>Skip</Text>
              </Pressable>

              <Image
                source={require('../../assets/img2.png')}
                style={s.heroImage}
              />
            </View>
          ) : (
            <View style={[s.signUpHeader, { paddingTop: insets.top + 10 }]}>
              <Pressable
                onPress={() => setIsSignUp(false)}
                style={s.signUpBackBtn}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
              </Pressable>
            </View>
          )}

          {/* Form Container */}
          <View style={[s.formContainer, { flex: 1, justifyContent: 'center', paddingBottom: isSignUp ? 80 : 0 }]}>
            {/* Title Section */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.titleSection}>
              <Text style={s.titleText}>{isSignUp ? 'Create Account' : 'Welcome back! 👋'}</Text>
              <Text style={s.subtitleText}>
                {isSignUp
                  ? 'Start your personalized nutrition journey'
                  : 'Login to continue your health journey'}
              </Text>
            </Animated.View>

            {/* Form Fields */}
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={s.formFields}>
              {/* Email */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Email Address</Text>
                <View style={[s.inputContainer, emailError ? { borderColor: '#EF4444' } : null]}>
                  <Ionicons name="mail-outline" size={18} color={emailError ? '#EF4444' : '#999'} />
                  <RNTextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v)
                      setEmailError(null)
                      setGeneralError(null)
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor="#AAAAAA"
                    style={s.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {emailError && emailError.trim() !== '' && (
                  <Text style={s.inputErrorText}>{emailError}</Text>
                )}
              </View>

              {/* Password */}
              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <Text style={s.fieldLabel}>Password</Text>
                  {!isSignUp && (
                    <Pressable onPress={() => showToast('Password reset link sent!', 'success')}>
                      <Text style={s.forgotText}>Forgot Password?</Text>
                    </Pressable>
                  )}
                </View>
                <View style={[s.inputContainer, passwordError ? { borderColor: '#EF4444' } : null]}>
                  <Ionicons name="lock-closed-outline" size={18} color={passwordError ? '#EF4444' : '#999'} />
                  <RNTextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v)
                      setPasswordError(null)
                      setGeneralError(null)
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#AAAAAA"
                    style={s.textInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#999"
                    />
                  </Pressable>
                </View>
                {passwordError && passwordError.trim() !== '' && (
                  <Text style={s.inputErrorText}>{passwordError}</Text>
                )}
              </View>

              {/* Password Strength Indicator (Sign Up) */}
              {isSignUp && (
                <View style={s.strengthIndicator}>
                  <Ionicons
                    name={isPasswordValid ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color={isPasswordValid ? ACCENT : '#999'}
                  />
                  <Text style={[s.strengthText, isPasswordValid && { color: ACCENT }]}>
                    At least 8 characters with letters and numbers
                  </Text>
                </View>
              )}

              {/* Confirm Password (Sign Up) */}
              {isSignUp && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Confirm Password</Text>
                  <View style={[s.inputContainer, confirmPasswordError ? { borderColor: '#EF4444' } : null]}>
                    <Ionicons name="lock-closed-outline" size={18} color={confirmPasswordError ? '#EF4444' : '#999'} />
                    <RNTextInput
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v)
                        setConfirmPasswordError(null)
                        setGeneralError(null)
                      }}
                      placeholder="Confirm your password"
                      placeholderTextColor="#AAAAAA"
                      style={s.textInput}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#999"
                      />
                    </Pressable>
                  </View>
                  {confirmPasswordError && confirmPasswordError.trim() !== '' && (
                    <Text style={s.inputErrorText}>{confirmPasswordError}</Text>
                  )}
                </View>
              )}

              {/* Terms & Conditions (Sign Up) */}
              {isSignUp && (
                <Pressable style={s.termsCheckbox} onPress={() => setAgreeTerms(!agreeTerms)}>
                  <Ionicons
                    name={agreeTerms ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={agreeTerms ? ACCENT : '#999'}
                  />
                  <Text style={s.termsText}>
                    I agree to the{' '}
                    <Text
                      onPress={() => router.push('/terms')}
                      style={s.termsLink}
                    >
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text
                      onPress={() => router.push('/privacy')}
                      style={s.termsLink}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </Pressable>
              )}

              {/* General Error Message */}
              {generalError && (
                <View style={s.generalErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                  <Text style={s.generalErrorText}>{generalError}</Text>
                </View>
              )}

              {/* Submit Button */}
              <Pressable
                onPress={handleAuth}
                disabled={
                  loading ||
                  !email.trim() ||
                  !password.trim() ||
                  (isSignUp && (!confirmPassword.trim() || !agreeTerms))
                }
                style={({ pressed }) => [
                  s.submitBtn,
                  (loading ||
                    !email.trim() ||
                    !password.trim() ||
                    (isSignUp && (!confirmPassword.trim() || !agreeTerms))) && { opacity: 0.6 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={[ACCENT, '#16A34A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Text style={s.btnText}>{isSignUp ? 'Create Account' : 'Login'}</Text>
                      <View style={s.arrowIcon}>
                        <Ionicons name="arrow-forward" size={18} color="#16A34A" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </Pressable>



              {/* Toggle Auth Mode */}
              <View style={s.footer}>
                <Text style={s.footerText}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <Pressable
                  onPress={() => {
                    setIsSignUp(!isSignUp)
                    setEmailError(null)
                    setPasswordError(null)
                    setConfirmPasswordError(null)
                    setGeneralError(null)
                    setPassword('')
                    setConfirmPassword('')
                    setAgreeTerms(false)
                  }}
                >
                  <Text style={s.footerLink}>{isSignUp ? 'Login' : 'Sign up'}</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  signUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 60,
  },
  signUpBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  backBtn: {
    position: 'absolute',
    left: 24,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 20,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  kav: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFF',
  },
  heroSection: {
    height: 270,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  glowBg1: {
    position: 'absolute',
    width: SW * 0.52,
    height: SW * 0.52,
    borderRadius: (SW * 0.52) / 2,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    top: '2%',
    left: '-6%',
  },
  glowBg2: {
    position: 'absolute',
    width: SW * 0.44,
    height: SW * 0.44,
    borderRadius: (SW * 0.44) / 2,
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
    top: '15%',
    right: '-8%',
  },
  glowBg3: {
    position: 'absolute',
    width: SW * 0.40,
    height: SW * 0.40,
    borderRadius: (SW * 0.40) / 2,
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    bottom: '-12%',
    right: '8%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    zIndex: 10,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  titleSection: {
    marginBottom: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#8A8A8A',
  },
  formFields: {
    gap: 10,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  textInput: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 10,
  },
  strengthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '700',
    color: ACCENT,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  arrowIcon: {
    position: 'absolute',
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  inputErrorText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
    paddingLeft: 4,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  generalErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
})