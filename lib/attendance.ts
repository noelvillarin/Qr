import { supabase } from "./supabase";
import { parseQRPayload } from "./qr";
import { getEventByCode } from "./events";
import { getCurrentUserRole } from "./profile";

/* =========================================================
   TYPES
   ========================================================= */

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherAttendee = {
  studentId: string;
  fullName: string;
  email: string;
  scannedAt: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: TeacherAttendee[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

/* =========================================================
   STUDENT — REGISTER ATTENDANCE
   ========================================================= */

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "You must be logged in to register attendance.",
    };
  }

  const role = await getCurrentUserRole();

  if (role !== "student") {
    return {
      success: false,
      message: "Only student accounts can register attendance.",
    };
  }

  if (studentId !== user.id) {
    return {
      success: false,
      message:
        "You can only register attendance for your own account.",
    };
  }

  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  const payload = parsed.payload;
  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && now < start) {
    return {
      success: false,
      message: "Event has not started yet.",
    };
  }

  if (end !== null && now > end) {
    return {
      success: false,
      message: "Event has already ended.",
    };
  }

  const title = payload.title ?? payload.event;

  const foundEvent = await getEventByCode(payload.event);

  let eventId: string;
  let eventTitle: string;

  if (foundEvent) {
    eventId = foundEvent.id;
    eventTitle = foundEvent.title;
  } else {
    const {
      data: newEvent,
      error: insertError,
    } = await supabase
      .from("events")
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select("id, title")
      .single();

    if (insertError || !newEvent) {
      console.error(
        "Error creating event:",
        insertError
      );

      return {
        success: false,
        message: "Could not create event.",
      };
    }

    eventId = newEvent.id;
    eventTitle = newEvent.title;
  }

  const {
    error: attendanceError,
  } = await supabase
    .from("attendance")
    .insert([
      {
        student_id: studentId,
        event_id: eventId,
      },
    ]);

  if (attendanceError) {
    if (attendanceError.code === "23505") {
      return {
        success: false,
        message: "Already registered for this event.",
        eventTitle,
      };
    }

    console.error(
      "Error recording attendance:",
      attendanceError
    );

    return {
      success: false,
      message: attendanceError.message,
      eventTitle,
    };
  }

  return {
    success: true,
    message: "Attendance recorded!",
    eventTitle,
  };
}

/* =========================================================
   STUDENT — ATTENDANCE HISTORY
   ========================================================= */

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Cannot load attendance history: user is not logged in."
    );

    return [];
  }

  const role = await getCurrentUserRole();

  if (role !== "student") {
    console.error(
      "Only student accounts can view attendance history."
    );

    return [];
  }

  if (studentId !== user.id) {
    console.error(
      "A student can only view their own attendance history."
    );

    return [];
  }

  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
        id,
        event_id,
        scanned_at,
        events (
          title
        )
      `
    )
    .eq("student_id", studentId)
    .order("scanned_at", {
      ascending: false,
    });

  if (error || !data) {
    console.error(
      "Error loading attendance history:",
      error
    );

    return [];
  }

  return data.map((record: any) => ({
    id: record.id,
    eventId: record.event_id,
    eventTitle:
      record.events?.title ?? "Unknown Event",
    scannedAt: record.scanned_at,
  }));
}

/* =========================================================
   TEACHER — EVENT ATTENDANCE
   ========================================================= */

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  /* -------------------------------------------------------
     1. Check logged-in user
     ------------------------------------------------------- */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Cannot load teacher attendance: user is not logged in."
    );

    return [];
  }

  /* -------------------------------------------------------
     2. Only teachers can view teacher attendance
     ------------------------------------------------------- */

  const role = await getCurrentUserRole();

  if (role !== "teacher") {
    console.error(
      "Only teacher accounts can view teacher attendance."
    );

    return [];
  }

  /* -------------------------------------------------------
     3. Teacher can only view their own events
     ------------------------------------------------------- */

  if (teacherId !== user.id) {
    console.error(
      "A teacher can only view attendance for their own events."
    );

    return [];
  }

  /* -------------------------------------------------------
     4. Get events created by this teacher
     ------------------------------------------------------- */

  const {
    data: events,
    error: eventError,
  } = await supabase
    .from("events")
    .select(
      "id, event_code, title, start_time, end_time"
    )
    .eq("created_by", teacherId)
    .order("created_at", {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      "Error loading teacher events:",
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  /* -------------------------------------------------------
     5. Get attendance records
     ------------------------------------------------------- */

  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from("attendance")
    .select(
      "student_id, scanned_at, event_id"
    )
    .in("event_id", eventIds)
    .order("scanned_at", {
      ascending: false,
    });

  if (attendanceError || !attendance) {
    console.error(
      "Error loading attendance:",
      attendanceError
    );

    return [];
  }

  /* -------------------------------------------------------
     6. Get student profiles
     ------------------------------------------------------- */

  const studentIds = [
    ...new Set(
      attendance.map(
        (record) => record.student_id
      )
    ),
  ];

  const profilesById: Record<
    string,
    {
      full_name: string | null;
      email: string;
    }
  > = {};

  if (studentIds.length > 0) {
    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);

    if (profileError) {
      console.error(
        "Error loading student profiles:",
        profileError
      );
    } else if (profiles) {
      profiles.forEach((profile) => {
        profilesById[profile.id] = {
          full_name: profile.full_name,
          email: profile.email,
        };
      });
    }
  }

  /* -------------------------------------------------------
     7. Group attendance by event
     ------------------------------------------------------- */

  return events.map((event) => {
    const rows = attendance.filter(
      (record) =>
        record.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,

      attendees: rows.map((record) => {
        const profile =
          profilesById[record.student_id];

        return {
          studentId: record.student_id,
          fullName:
            profile?.full_name?.trim() ||
            "Unknown Student",
          email:
            profile?.email ||
            "No email available",
          scannedAt: record.scanned_at,
        };
      }),
    };
  });
}

/* =========================================================
   TEACHER — EVENT SUMMARY
   ========================================================= */

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Cannot load teacher summary: user is not logged in."
    );

    return [];
  }

  const role = await getCurrentUserRole();

  if (role !== "teacher") {
    console.error(
      "Only teacher accounts can view teacher summaries."
    );

    return [];
  }

  if (teacherId !== user.id) {
    console.error(
      "A teacher can only view their own event summary."
    );

    return [];
  }

  const {
    data: events,
    error: eventError,
  } = await supabase
    .from("events")
    .select(
      "id, event_code, title"
    )
    .eq("created_by", teacherId)
    .order("created_at", {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      "Error loading teacher event summary:",
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  const {
    data: attRows,
    error: attError,
  } = await supabase
    .from("attendance")
    .select("event_id")
    .in("event_id", eventIds);

  if (attError || !attRows) {
    console.error(
      "Error loading attendance counts:",
      attError
    );

    return [];
  }

  const counts: Record<string, number> = {};

  attRows.forEach((row) => {
    counts[row.event_id] =
      (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount:
      counts[event.id] ?? 0,
  }));
}