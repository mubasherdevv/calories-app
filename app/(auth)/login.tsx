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
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import {
  ACCENT,
  ERROR,
  ERROR_DIM,
} from '@/lib/theme'
import { useToast } from '@/contexts/ToastContext'

WebBrowser.maybeCompleteAuthSession()

const { width: SW } = Dimensions.get('window')
const DEV_ALLOW_SKIP = __DEV__

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<RNTextInput>(null)
  const passwordRef = useRef<RNTextInput>(null)

  // Password validation: at least 8 characters, containing both letters and numbers
  const hasMinLength = password.length >= 8
  const hasLettersAndNumbers = /[A-Za-z]/.test(password) && /\d/.test(password)
  const isPasswordValid = hasMinLength && hasLettersAndNumbers

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Enter a valid email address')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Please enter your full name')
        return
      }
      if (!isPasswordValid) {
        setError('Password must satisfy strength requirements')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }

      setLoading(true)
      setError(null)
      track('signup_started')

      const { data, error: err } = await supabase.auth.signUp({
        email: trimmedEmail,
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
      setConfirmPassword('')
    } else {
      setLoading(true)
      setError(null)
      track('login_started')

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (err) {
        setLoading(false)
        setError(err.message)
        return
      }

      const user = data?.user
      if (user && !user.email_confirmed_at) {
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header bar for Navigation and illustration */}
      <View style={[s.headerWrap, { paddingTop: insets.top + 6 }]}>
        {isSignUp ? (
          <Pressable onPress={() => setIsSignUp(false)} style={s.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
          </Pressable>
        ) : (
          <View style={s.backBtnPlaceholder} />
        )}

        <View style={s.illustrationContainer}>
          <Image
            source={
              isSignUp
                ? require('../../assets/signup-illustration.jpg')
                : require('../../assets/login-illustration.jpg')
            }
            style={s.illustration}
            resizeMode="contain"
          />
        </View>

        {!isSignUp ? (
          <Pressable onPress={handleDevSkip} style={s.skipBtn} hitSlop={12}>
            <Text style={s.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={s.skipBtnPlaceholder} />
        )}
      </View>

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Title Area */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.titleWrap}>
            <Text style={s.titleText}>{isSignUp ? 'Create Account' : 'Welcome back! 👋'}</Text>
            <Text style={s.subtitleText}>
              {isSignUp
                ? 'Start your personalized nutrition journey'
                : 'Login to continue your health journey'}
            </Text>
          </Animated.View>

          {/* Form Fields Container */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.fieldsWrap}>
            {/* Full Name (Sign Up only) */}
            {isSignUp && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Full Name</Text>
                <View style={s.inputOuter}>
                  <Ionicons name="person-outline" size={20} color="#888" style={s.fieldIcon} />
                  <RNTextInput
                    value={fullName}
                    onChangeText={(v) => {
                      setFullName(v)
                      setError(null)
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor="#AAAAAA"
                    style={s.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {/* Email Address */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email Address</Text>
              <View style={s.inputOuter}>
                <Ionicons name="mail-outline" size={20} color="#888" style={s.fieldIcon} />
                <RNTextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  placeholder={isSignUp ? 'Enter your email address' : 'Enter your email'}
                  placeholderTextColor="#AAAAAA"
                  style={s.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                {!isSignUp && (
                  <Pressable onPress={() => showToast('Password reset link sent to your email.', 'success')}>
                    <Text style={s.forgotLink}>Forgot Password?</Text>
                  </Pressable>
                )}
              </View>
              <View style={s.inputOuter}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={s.fieldIcon} />
                <RNTextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    setError(null)
                  }}
                  placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  placeholderTextColor="#AAAAAA"
                  style={s.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#888"
                  />
                </Pressable>
              </View>
            </View>

            {/* Password strength check row (Sign Up only) */}
            {isSignUp && (
              <View style={s.strengthRow}>
                <Ionicons
                  name={isPasswordValid ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={16}
                  color={isPasswordValid ? '#4CAF50' : '#888'}
                />
                <Text style={[s.strengthText, isPasswordValid && { color: '#4CAF50' }]}>
                  At least 8 characters with letters and numbers
                </Text>
              </View>
            )}

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={s.inputOuter}>
                  <Ionicons name="lock-closed-outline" size={20} color="#888" style={s.fieldIcon} />
                  <RNTextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v)
                      setError(null)
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor="#AAAAAA"
                    style={s.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#888"
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Error Banner */}
            {error ? <ErrorBanner msg={error} /> : null}

            {/* Primary Action CTA Button (Chevron style matching ref screens) */}
            <Pressable
              onPress={handleAuth}
              disabled={
                loading ||
                !email.trim() ||
                !password.trim() ||
                (isSignUp && (!fullName.trim() || !confirmPassword.trim()))
              }
              style={({ pressed }) => [
                s.btn,
                (loading ||
                  !email.trim() ||
                  !password.trim() ||
                  (isSignUp && (!fullName.trim() || !confirmPassword.trim()))) && {
                  opacity: 0.6,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={s.btnText}>{isSignUp ? 'Create Account' : 'Login'}</Text>
                  <View style={s.btnIconCircle}>
                    <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                  </View>
                </>
              )}
            </Pressable>

            {/* Social logins */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.socialRow}>
              <Pressable
                onPress={() => showToast('Google sign-in placeholder', 'success')}
                style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={s.socialText}>Google</Text>
              </Pressable>

              <Pressable
                onPress={() => showToast('Apple sign-in placeholder', 'success')}
                style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="logo-apple" size={18} color="#000" />
                <Text style={s.socialText}>Apple</Text>
              </Pressable>

              <Pressable
                onPress={() => showToast('Facebook sign-in placeholder', 'success')}
                style={({ pressed }) => [s.socialBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                <Text style={s.socialText}>Facebook</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Footer toggle link */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.footerRow}>
            <Text style={s.footerText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={s.footerLink}>{isSignUp ? 'Login' : 'Sign up'}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[s.errorBox, { backgroundColor: ERROR_DIM, borderColor: `${ERROR}25` }]}
    >
      <Text style={s.errorText}>{msg}</Text>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 180,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECEFEC',
  },
  backBtnPlaceholder: {
    width: 40,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  illustration: {
    width: SW * 0.45,
    height: 130,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  skipBtnPlaceholder: {
    paddingHorizontal: 16,
    width: 50,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
  },
  titleWrap: {
    gap: 4,
  },
  titleText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.8,
  },
  subtitleText: {
    fontSize: 15,
    color: '#777777',
    fontWeight: '500',
  },
  fieldsWrap: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4CAF50',
  },
  inputOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAF9',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECEFEC',
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    paddingHorizontal: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  btn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnIconCircle: {
    position: 'absolute',
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ECEFEC',
  },
  dividerText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    backgroundColor: '#F9FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEFEC',
  },
  socialText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '800',
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: ERROR,
    fontSize: 12.5,
    fontWeight: '700',
  },
})
