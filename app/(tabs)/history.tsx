import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { getProfile, useAuth } from '@/lib/auth';

import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

import type { Role } from '@/lib/profile';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);

  const [studentRecords, setStudentRecords] =
    useState<AttendanceRecord[]>([]);

  const [teacherEvents, setTeacherEvents] =
    useState<TeacherEventAttendance[]>([]);

  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get the logged-in user's profile
      const profile = await getProfile(user.id);

      const currentRole: Role =
        profile?.role === 'teacher'
          ? 'teacher'
          : 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        // Teacher: load events created by this teacher
        const events =
          await getTeacherEventAttendance(user.id);

        setTeacherEvents(events);
        setStudentRecords([]);
      } else {
        // Student: load the student's own attendance
        const records =
          await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error(
        'Error loading attendance history:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.subtitle}>
          Loading attendance...
        </Text>
      </View>
    );
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Attendance History
      </Text>

      {role === 'teacher' ? (
        <TeacherHistory events={teacherEvents} />
      ) : (
        <StudentHistory records={studentRecords} />
      )}
    </View>
  );
}

/* =========================================================
   STUDENT HISTORY
   ========================================================= */

function StudentHistory({
  records,
}: {
  records: AttendanceRecord[];
}) {
  if (records.length === 0) {
    return (
      <Text style={styles.subtitle}>
        No records yet. Scan a QR code to register your
        attendance.
      </Text>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.eventTitle}>
            {item.eventTitle}
          </Text>

          <Text style={styles.eventMeta}>
            Event ID: {item.eventId}
          </Text>

          <Text style={styles.eventMeta}>
            Scanned: {formatDate(item.scannedAt)}
          </Text>
        </View>
      )}
    />
  );
}

/* =========================================================
   TEACHER HISTORY
   ========================================================= */

function TeacherHistory({
  events,
}: {
  events: TeacherEventAttendance[];
}) {
  if (events.length === 0) {
    return (
      <Text style={styles.subtitle}>
        You have not created any events yet.
      </Text>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.eventId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>
                {item.title}
              </Text>

              <Text style={styles.eventMeta}>
                Code: {item.eventCode}
              </Text>

              {item.startTime && (
                <Text style={styles.eventMeta}>
                  Start: {formatDate(item.startTime)}
                </Text>
              )}

              {item.endTime && (
                <Text style={styles.eventMeta}>
                  End: {formatDate(item.endTime)}
                </Text>
              )}
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>
                {item.attendeeCount}
              </Text>

              <Text style={styles.countLabel}>
                attended
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.attendeesTitle}>
            Students
          </Text>

          {item.attendees.length === 0 ? (
            <Text style={styles.noAttendance}>
              No students have scanned this event yet.
            </Text>
          ) : (
            item.attendees.map((attendee) => (
              <View
                key={`${item.eventId}-${attendee.studentId}-${attendee.scannedAt}`}
                style={styles.attendeeRow}
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentId}>
                    {shortId(attendee.studentId)}
                  </Text>

                  <Text style={styles.eventMeta}>
                    {formatDate(attendee.scannedAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    />
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function shortId(id: string) {
  return id ? '...' + id.slice(-8) : 'unknown';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
  },

  list: {
    paddingBottom: 24,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,

    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,

    elevation: 3,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  eventInfo: {
    flex: 1,
    paddingRight: 12,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 70,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#DFF5E3',
  },

  countNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#188038',
  },

  countLabel: {
    fontSize: 11,
    color: '#188038',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 14,
  },

  attendeesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  attendeeRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  studentInfo: {
    flex: 1,
  },

  studentId: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  noAttendance: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});