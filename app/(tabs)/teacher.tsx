
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { createEvent } from '@/lib/events';
import {
  getCurrentUserRole,
  type Role,
} from '@/lib/profile';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date): string {
  const pad = (n: number) =>
    String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00`;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) =>
    String(n).padStart(2, '0');

  const month = date.toLocaleString('en-US', {
    month: 'short',
  });

  return `${month} ${pad(
    date.getDate()
  )}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random =
        (Math.random() * 16) | 0;

      const value =
        character === 'x'
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

const QUICK_END_OPTIONS = [
  {
    label: '+30 min',
    ms: 30 * 60 * 1000,
  },
  {
    label: '+1 hour',
    ms: 60 * 60 * 1000,
  },
  {
    label: '+2 hours',
    ms: 2 * 60 * 60 * 1000,
  },
];

type EditTarget = 'start' | 'end';

interface PickerFieldProps {
  value: string;
  icon: string;
  onPress: () => void;
}

function PickerField({
  value,
  icon,
  onPress,
}: PickerFieldProps) {
  return (
    <Pressable
      style={styles.pickerField}
      onPress={onPress}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={COLORS.primary}
      />

      <Text style={styles.pickerFieldText}>
        {value}
      </Text>
    </Pressable>
  );
}

export default function TeacherScreen() {
  const [role, setRole] =
    useState<Role | null>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const [title, setTitle] = useState('');
  const [eventCode, setEventCode] = useState('');

  const [startDate, setStartDate] =
    useState(() => new Date());

  const [endDate, setEndDate] =
    useState(
      () =>
        new Date(
          Date.now() +
            60 * 60 * 1000
        )
    );

  const [editTarget, setEditTarget] =
    useState<EditTarget | null>(null);

  const [editingPart, setEditingPart] =
    useState<'date' | 'time'>('date');

  const [payload, setPayload] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [createdEventId, setCreatedEventId] =
    useState<string | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const isAndroid =
    Platform.OS === 'android';

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const checkRole = async () => {
        setRoleLoading(true);

        const currentRole =
          await getCurrentUserRole();

        if (!active) {
          return;
        }

        setRole(currentRole);
        setRoleLoading(false);
      };

      checkRole();

      return () => {
        active = false;
      };
    }, [])
  );

  const openPicker = (
    target: EditTarget
  ) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) {
      return;
    }

    if (
      event.type === 'dismissed' ||
      !selected
    ) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current =
      editTarget === 'start'
        ? startDate
        : endDate;

    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );

    next.setHours(
      selected.getHours(),
      selected.getMinutes(),
      0,
      0
    );

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (
      isAndroid &&
      editingPart === 'date'
    ) {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (
    ms: number
  ) => {
    setMessage(null);

    setEndDate(
      new Date(
        startDate.getTime() + ms
      )
    );
  };

  const handleCreateEvent = async () => {
    setMessage(null);

    const cleanEventCode =
      eventCode.trim();

    const cleanTitle =
      title.trim();

    if (
      !cleanEventCode ||
      !cleanTitle
    ) {
      setMessage(
        'Event title and code are required.'
      );
      return;
    }

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      setMessage(
        'End time must be after start time.'
      );
      return;
    }

    const generatedEventId =
      generateUUID();

    const eventStart =
      toLocalISO(startDate);

    const eventEnd =
      toLocalISO(endDate);

    const event = {
      eventId: generatedEventId,
      title: cleanTitle,
      start: eventStart,
      end: eventEnd,
    };

    try {
      setIsCreating(true);

      const result =
        await createEvent(event);

      if (result.error) {
        throw new Error(
          result.error
        );
      }

      const qrPayload =
        buildQRPayload(event);

      setPayload(qrPayload);

      setCreatedEventId(
        generatedEventId
      );

      setMessage(
        'Event saved successfully! Scan the QR with the Scan tab.'
      );
    } catch (error: unknown) {
      console.error(
        'Failed to create event:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create event.'
      );

      setPayload(null);
      setCreatedEventId(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNew = () => {
    setTitle('');
    setEventCode('');

    const newStart =
      new Date();

    const newEnd =
      new Date(
        newStart.getTime() +
          60 * 60 * 1000
      );

    setStartDate(newStart);
    setEndDate(newEnd);

    setPayload(null);
    setCreatedEventId(null);
    setMessage(null);
  };

  if (roleLoading) {
    return (
      <View style={styles.lockScreen}>
        <Ionicons
          name="shield-checkmark-outline"
          size={56}
          color={COLORS.primary}
        />

        <Text style={styles.lockTitle}>
          Checking your account...
        </Text>

        <Text style={styles.lockMessage}>
          Please wait while we verify
          your account.
        </Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.lockScreen}>
        <Ionicons
          name="lock-closed-outline"
          size={56}
          color={COLORS.primary}
        />

        <Text style={styles.lockTitle}>
          Teachers Only
        </Text>

        <Text style={styles.lockMessage}>
          Only teacher accounts can
          create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Create Event QR
      </Text>

      <Text style={styles.subtitle}>
        Fill in the event details, then
        scan the generated QR with the
        Scan tab.
      </Text>

      <Text style={styles.label}>
        Event Title
      </Text>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Founders Day Assembly"
        placeholderTextColor={
          COLORS.textSecondary
        }
      />

      <Text style={styles.label}>
        Event Code
      </Text>

      <TextInput
        style={styles.input}
        value={eventCode}
        onChangeText={setEventCode}
        placeholder="e.g. FD2026"
        placeholderTextColor={
          COLORS.textSecondary
        }
        autoCapitalize="characters"
      />

      <Text style={styles.helperText}>
        Enter a short code for your
        reference. The database event ID
        is generated automatically.
      </Text>

      <Text style={styles.label}>
        Start
      </Text>

      <PickerField
        value={formatDateTime(
          startDate
        )}
        icon="calendar-outline"
        onPress={() =>
          openPicker('start')
        }
      />

      <Text style={styles.label}>
        End
      </Text>

      <PickerField
        value={formatDateTime(
          endDate
        )}
        icon="time-outline"
        onPress={() =>
          openPicker('end')
        }
      />

      <Text style={styles.quickLabel}>
        Quick end time
      </Text>

      <View style={styles.quickRow}>
        {QUICK_END_OPTIONS.map(
          (option) => (
            <Pressable
              key={option.label}
              style={
                styles.quickButton
              }
              onPress={() =>
                handleQuickEnd(
                  option.ms
                )
              }
            >
              <Text
                style={
                  styles.quickButtonText
                }
              >
                {option.label}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {editTarget && (
        <DateTimePicker
          value={
            editTarget === 'start'
              ? startDate
              : endDate
          }
          mode={
            isAndroid
              ? editingPart === 'date'
                ? 'date'
                : 'time'
              : 'datetime'
          }
          display={
            isAndroid
              ? 'default'
              : 'spinner'
          }
          onChange={
            onPickerChange
          }
        />
      )}

      <View
        style={
          styles.buttonContainer
        }
      >
        <AppButton
          title={
            isCreating
              ? 'Creating Event...'
              : 'Create Event & QR'
          }
          onPress={
            handleCreateEvent
          }
          disabled={isCreating}
        />
      </View>

      {message && (
        <View
          style={
            styles.messageBox
          }
        >
          <Text
            style={
              styles.messageText
            }
          >
            {message}
          </Text>
        </View>
      )}

      {payload && (
        <View
          style={styles.qrSection}
        >
          <Text style={styles.qrTitle}>
            Event QR Code
          </Text>

          <Text
            style={styles.qrSubtitle}
          >
            Show this QR code to students
            so they can scan it.
          </Text>

          <View
            style={
              styles.qrContainer
            }
          >
            <QRCode
              value={payload}
              size={240}
              backgroundColor="white"
              color="black"
            />
          </View>

          <View
            style={
              styles.eventInfo
            }
          >
            <Text
              style={
                styles.infoLabel
              }
            >
              Event
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {title.trim()}
            </Text>

            <Text
              style={
                styles.infoLabel
              }
            >
              Event Code
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {eventCode.trim()}
            </Text>

            <Text
              style={
                styles.infoLabel
              }
            >
              Start
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {formatDateTime(
                startDate
              )}
            </Text>

            <Text
              style={
                styles.infoLabel
              }
            >
              End
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {formatDateTime(
                endDate
              )}
            </Text>

            {createdEventId && (
              <>
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Database Event ID
                </Text>

                <Text
                  style={
                    styles.eventIdText
                  }
                >
                  {createdEventId}
                </Text>
              </>
            )}
          </View>

          <View
            style={
              styles.buttonContainer
            }
          >
            <AppButton
              title="Create Another Event"
              onPress={
                handleCreateNew
              }
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  lockTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  lockMessage: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor:
      COLORS.surface,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },

  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  pickerField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor:
      COLORS.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickerFieldText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 18,
    marginBottom: 8,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  quickButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  quickButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },

  buttonContainer: {
    marginTop: 24,
  },

  messageBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  messageText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  qrSection: {
    marginTop: 30,
    alignItems: 'center',
  },

  qrTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  qrSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },

  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventInfo: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  eventIdText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});