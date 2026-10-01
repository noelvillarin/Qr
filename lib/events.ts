import { getCurrentUserRole } from './profiles';
import { supabase } from './supabase';

/* =========================================================
   TYPES
   ========================================================= */

export type EventInput = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  eventCode?: string;
};

export type EventLookup = {
  id: string;
  title: string;
};

/* =========================================================
   CREATE EVENT
   ========================================================= */

export async function createEvent(
  event: EventInput
): Promise<{ error: string | null }> {
  /* -------------------------------------------------------
     1. Get currently logged-in user
     ------------------------------------------------------- */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      error: userError.message,
    };
  }

  if (!user) {
    return {
      error: 'You must be logged in to create an event.',
    };
  }

  /* -------------------------------------------------------
     2. Check user role
     ------------------------------------------------------- */

  const role = await getCurrentUserRole();

  if (role !== 'teacher') {
    return {
      error: 'Only teacher accounts can create events.',
    };
  }

  /* -------------------------------------------------------
     3. Validate event title
     ------------------------------------------------------- */

  const cleanTitle = event.title.trim();

  if (!cleanTitle) {
    return {
      error: 'Event title is required.',
    };
  }

  /* -------------------------------------------------------
     4. Validate event ID
     ------------------------------------------------------- */

  if (!event.eventId.trim()) {
    return {
      error: 'Event ID is required.',
    };
  }

  /* -------------------------------------------------------
     5. Insert event into Supabase
     ------------------------------------------------------- */

  const { error } = await supabase
    .from('events')
    .insert({
      id: event.eventId.trim(),
      event_code:
        event.eventCode?.trim() || event.eventId.trim(),
      title: cleanTitle,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user.id,
    });

  /* -------------------------------------------------------
     6. Return database error
     ------------------------------------------------------- */

  if (error) {
    console.error('Error creating event:', error);

    return {
      error: error.message,
    };
  }

  /* -------------------------------------------------------
     7. Success
     ------------------------------------------------------- */

  return {
    error: null,
  };
}

/* =========================================================
   GET EVENT BY CODE
   ========================================================= */

export async function getEventByCode(
  eventCode: string
): Promise<EventLookup | null> {
  const cleanEventCode = eventCode.trim();

  if (!cleanEventCode) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_code', cleanEventCode)
    .maybeSingle();

  if (error) {
    console.error(
      'Error finding event by code:',
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return data;
}