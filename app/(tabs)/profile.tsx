import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import {
  getProfile,
  type Profile,
} from '@/lib/profile';

export default function ProfileScreen() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (mounted) {
          setProfile(null);
          setProfileLoading(false);
        }

        return;
      }

      setProfileLoading(true);

      try {
        const data = await getProfile(user.id);

        if (mounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error(
          'Failed to load profile:',
          error
        );

        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);

            try {
              const { error } =
                await signOut();

              if (error) {
                Alert.alert(
                  'Sign Out Failed',
                  error.message
                );

                return;
              }

              router.replace('/login');
            } catch (error) {
              console.error(
                'Sign out error:',
                error
              );

              Alert.alert(
                'Sign Out Failed',
                'Something went wrong while signing out.'
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading account...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>
          My Profile
        </Text>

        <Text style={styles.message}>
          You are not currently logged in.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace('/login')
          }
        >
          <Text style={styles.primaryButtonText}>
            Go to Login
          </Text>
        </Pressable>
      </View>
    );
  }

  if (profileLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  const email =
    profile?.email?.trim() ||
    user.email?.trim() ||
    'No email available';

  const fullName =
    profile?.full_name?.trim() ||
    'No name available';

  const role =
    profile?.role ?? 'student';

  const roleLabel =
    role === 'teacher'
      ? 'Teacher'
      : 'Student';

  const firstLetter =
    fullName !== 'No name available'
      ? fullName.charAt(0).toUpperCase()
      : email.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            My Profile
          </Text>

          <Text style={styles.subtitle}>
            Your account information
          </Text>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstLetter}
            </Text>
          </View>

          {/* Full Name */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>
              Full Name
            </Text>

            <Text style={styles.value}>
              {fullName}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>
              Email
            </Text>

            <Text
              style={styles.value}
              numberOfLines={2}
            >
              {email}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Role */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>
              Role
            </Text>

            <View
              style={[
                styles.roleBadge,
                role === 'teacher'
                  ? styles.teacherBadge
                  : styles.studentBadge,
              ]}
            >
              <Text style={styles.roleText}>
                {roleLabel}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Account ID */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>
              Account ID
            </Text>

            <Text
              style={styles.valueSmall}
              numberOfLines={2}
            >
              {user.id}
            </Text>
          </View>
        </View>

        {/* ACCOUNT CARD */}
        <View style={styles.accountCard}>
          <Text style={styles.accountTitle}>
            Account
          </Text>

          <Text style={styles.accountDescription}>
            Sign out of your{' '}
            {role.toLowerCase()} attendance account.
          </Text>

          {/* SIGN OUT BUTTON */}
          <Pressable
            style={[
              styles.signOutButton,
              signingOut &&
                styles.disabledButton,
            ]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator
                size="small"
                color={COLORS.textOnPrimary}
              />
            ) : (
              <Text style={styles.signOutText}>
                Sign Out
              </Text>
            )}
          </Pressable>
        </View>

        {/* Extra bottom space so button is never
            hidden behind the tab bar */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginBottom: 20,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  infoSection: {
    paddingVertical: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  value: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  valueSmall: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  studentBadge: {
    backgroundColor: COLORS.primary,
  },

  teacherBadge: {
    backgroundColor: COLORS.primary,
  },

  roleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  accountCard: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  accountTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  accountDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  signOutButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButton: {
    marginTop: 20,
    minWidth: 150,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  bottomSpace: {
    height: 30,
  },
});