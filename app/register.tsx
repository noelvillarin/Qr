import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  /* =======================================================
     FORM STATE
     ======================================================= */

  const [fullName, setFullName] = useState('');

  const [role, setRole] =
    useState<'student' | 'teacher'>('student');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  /* =======================================================
     SCREEN STATE
     ======================================================= */

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);

  /* =======================================================
     REGISTER
     ======================================================= */

  const handleRegister = async () => {
    setError(null);

    /* -----------------------------------------------------
       Validate required fields
       ----------------------------------------------------- */

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required.');
      return;
    }

    /* -----------------------------------------------------
       Validate password
       ----------------------------------------------------- */

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    /* -----------------------------------------------------
       Start loading
       ----------------------------------------------------- */

    setLoading(true);

    try {
      const {
        data,
        error: authError,
      } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      /* ---------------------------------------------------
         Supabase error
         --------------------------------------------------- */

      if (authError) {
        setError(authError.message);
        return;
      }

      /* ---------------------------------------------------
         Account created and logged in
         --------------------------------------------------- */

      if (data.session) {
        router.replace('/(tabs)');
        return;
      }

      /* ---------------------------------------------------
         Email confirmation required
         --------------------------------------------------- */

      setSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);

      setError(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     SCREEN
     ======================================================= */

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : 20
        }
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
        >
          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HEADER */}

            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            {/* CENTERED TITLE */}

            <Text style={styles.title}>
              Create Account
            </Text>

            {/* CENTERED SUBTITLE */}

            <Text style={styles.subtitle}>
              Register to start recording attendance
            </Text>

            {/* SUCCESS MESSAGE */}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>
                  Check your email!
                </Text>

                <Text style={styles.successText}>
                  We sent a confirmation link to {email}.
                  Click the link to verify your account,
                  then come back and sign in.
                </Text>

                <Link
                  href="/login"
                  style={styles.link}
                >
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <View style={styles.form}>
                {/* FULL NAME */}

                <Text style={styles.label}>
                  Full Name
                </Text>

                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  autoCapitalize="words"
                  editable={!loading}
                />

                {/* ROLE */}

                <Text style={styles.label}>
                  I am a...
                </Text>

                <View style={styles.roleRow}>
                  {/* STUDENT */}

                  <Pressable
                    style={[
                      styles.roleChip,
                      role === 'student' &&
                        styles.roleChipActive,
                    ]}
                    onPress={() =>
                      setRole('student')
                    }
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'student' &&
                          styles.roleChipTextActive,
                      ]}
                    >
                      Student
                    </Text>
                  </Pressable>

                  {/* TEACHER */}

                  <Pressable
                    style={[
                      styles.roleChip,
                      role === 'teacher' &&
                        styles.roleChipActive,
                    ]}
                    onPress={() =>
                      setRole('teacher')
                    }
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'teacher' &&
                          styles.roleChipTextActive,
                      ]}
                    >
                      Teacher
                    </Text>
                  </Pressable>
                </View>

                {/* EMAIL */}

                <Text style={styles.label}>
                  Email
                </Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />

                {/* PASSWORD */}

                <Text style={styles.label}>
                  Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />

                {/* CONFIRM PASSWORD */}

                <Text style={styles.label}>
                  Confirm Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />

                {/* ERROR */}

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* REGISTER BUTTON */}

                <View style={styles.buttonContainer}>
                  {loading ? (
                    <View
                      style={styles.loadingContainer}
                    >
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                      />

                      <Text
                        style={styles.loadingText}
                      >
                        Creating account...
                      </Text>
                    </View>
                  ) : (
                    <AppButton
                      title="Create Account"
                      theme="primary"
                      onPress={handleRegister}
                    />
                  )}
                </View>

                {/* LOGIN LINK */}

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    Already have an account?
                  </Text>

                  <Link
                    href="/login"
                    style={styles.link}
                  >
                    Sign In
                  </Link>
                </View>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  headerContainer: {
    marginBottom: 20,
  },

  /* =======================================================
     CENTERED HEADER
     ======================================================= */

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },

  /* =======================================================
     FORM
     ======================================================= */

  form: {
    width: '100%',
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },

  /* =======================================================
     ROLE
     ======================================================= */

  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },

  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },

  roleChipActive: {
    backgroundColor: COLORS.primary + '14',
    borderColor: COLORS.primary,
  },

  roleChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  roleChipTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* =======================================================
     ERROR
     ======================================================= */

  errorContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },

  /* =======================================================
     BUTTON
     ======================================================= */

  buttonContainer: {
    marginTop: 24,
  },

  loadingContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  /* =======================================================
     LOGIN
     ======================================================= */

  loginContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },

  link: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* =======================================================
     SUCCESS
     ======================================================= */

  successContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },

  successText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
});