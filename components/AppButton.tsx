import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type AppButtonProps = {
  title: string;
  onPress?: (() => void) | (() => Promise<unknown>) | (() => void | Promise<unknown>);
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary' | 'secondary';
  disabled?: boolean;
};

export default function AppButton({
  title,
  onPress,
  icon,
  theme = 'primary',
  disabled = false,
}: AppButtonProps) {
  const isPrimary = theme === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        isPrimary ? styles.primaryFill : styles.secondaryFill,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={isPrimary ? COLORS.textOnPrimary : COLORS.primary}
          />
        ) : null}

        <Text style={[
          styles.label,
          isPrimary && styles.primaryLabel,
        ]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  primaryFill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  secondaryFill: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  disabled: {
    opacity: 0.6,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  primaryLabel: {
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});
