import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Header title="QR Attendance" />
      </View>

      <View style={styles.bodyContainer}>
        <Text style={styles.mainTitle}>School Event Attendance</Text>

        <Text style={styles.subtitle}>
          Scan QR Codes to record attendance during school activities.
        </Text>

        <View style={styles.buttonsContainer}>
          <AppButton
            title="Scan QR Code"
            onPress={() => router.push('/(tabs)/scan')}
          />

          <AppButton
            title="Attendance History"
            onPress={() => router.push('/(tabs)/history')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  bodyContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'left',
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'left',
    marginBottom: 24,
  },

  buttonsContainer: {
    gap: 12,
  },
});