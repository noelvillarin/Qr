import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { parseQRPayload } from '@/lib/qr';

export default function ScanScreen() {
  const { user, loading: authLoading } = useAuth();

  const [permission, requestPermission] =
    useCameraPermissions();

  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  /*
   * Reset the scanner whenever this screen becomes active.
   */
  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      setProcessing(false);

      return () => {
        setScanning(false);
      };
    }, [])
  );

  /*
   * Handle a QR code scan.
   */
  const handleScan = async ({
    data,
  }: {
    data: string;
  }) => {
    if (!scanning || processing) {
      return;
    }

    if (!data || !data.trim()) {
      return;
    }

    setScanning(false);
    setProcessing(true);

    try {
      /*
       * Make sure authentication has finished loading.
       */
      if (authLoading) {
        Alert.alert(
          'Please wait',
          'Your account is still loading.'
        );
        return;
      }

      /*
       * Make sure a student is logged in.
       */
      if (!user) {
        Alert.alert(
          'Not logged in',
          'Please log in before scanning an attendance QR code.'
        );
        return;
      }

      /*
       * Validate the QR payload.
       */
      const parsed = parseQRPayload(data.trim());

      if (!parsed) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid attendance QR code.'
        );
        return;
      }

      /*
       * Register attendance using the
       * currently logged-in user's ID.
       */
      const result = await registerAttendance(
        data.trim(),
        user.id
      );

      if (!result.success) {
        Alert.alert(
          'Attendance Not Registered',
          result.message ||
            'Unable to register attendance.'
        );

        return;
      }

      /*
       * Attendance was successfully registered.
       */
      Alert.alert(
        'Attendance Registered',
        result.eventTitle
          ? `Your attendance for "${result.eventTitle}" has been recorded successfully.`
          : 'Your attendance has been recorded successfully.'
      );
    } catch (error) {
      console.error(
        'QR scan error:',
        error
      );

      Alert.alert(
        'Scan Error',
        'Something went wrong while registering your attendance.'
      );
    } finally {
      setProcessing(false);
    }
  };

  /*
   * Allow the student to scan another QR code.
   */
  const handleScanAgain = () => {
    setProcessing(false);
    setScanning(true);
  };

  /*
   * Authentication is loading.
   */
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.infoText}>
          Loading your account...
        </Text>
      </View>
    );
  }

  /*
   * No logged-in user.
   */
  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>
          QR Scanner
        </Text>

        <Text style={styles.infoText}>
          Please log in before scanning an attendance QR code.
        </Text>
      </View>
    );
  }

  /*
   * Camera permission is still being checked.
   */
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.infoText}>
          Checking camera permission...
        </Text>
      </View>
    );
  }

  /*
   * Camera permission was denied.
   */
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>
          Camera Permission Required
        </Text>

        <Text style={styles.infoText}>
          Camera access is required to scan attendance QR codes.
        </Text>

        <Pressable
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>
            Allow Camera
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * Main scanner screen.
   */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          QR Scanner
        </Text>

        <Text style={styles.subtitle}>
          Scan your teacher's attendance QR code
        </Text>
      </View>

      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            scanning && !processing
              ? handleScan
              : undefined
          }
        >
          <View style={styles.overlay}>
            <View style={styles.scanBox}>
              <View
                style={[
                  styles.corner,
                  styles.topLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.topRight,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.bottomLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.bottomRight,
                ]}
              />
            </View>
          </View>
        </CameraView>
      </View>

      {processing ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />

          <Text style={styles.statusText}>
            Registering your attendance...
          </Text>
        </View>
      ) : scanning ? (
        <Text style={styles.instruction}>
          Position the QR code inside the box
        </Text>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.statusText}>
            Scan complete
          </Text>

          <Pressable
            style={styles.button}
            onPress={handleScanAgain}
          >
            <Text style={styles.buttonText}>
              Scan Again
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',

    // FIXED:
    // Your COLORS object has textPrimary,
    // not text.
    color: COLORS.textPrimary,

    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  infoText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  scannerContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 20,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },

  scanBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },

  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },

  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },

  instruction: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  statusContainer: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  resultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  statusText: {
    fontSize: 15,
    fontWeight: '600',

    // FIXED:
    // Use textPrimary instead of text.
    color: COLORS.textPrimary,

    textAlign: 'center',
  },

  button: {
    marginTop: 16,
    minWidth: 160,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});