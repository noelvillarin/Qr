// lib/qr.ts

export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

/**
 * Build the QR payload used by the Teacher screen.
 */
export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) {
    payload.title = event.title;
  }

  if (event.start) {
    payload.start = event.start;
  }

  if (event.end) {
    payload.end = event.end;
  }

  return JSON.stringify(payload);
}

/**
 * Result returned when parsing a QR code.
 */
export type ParseQRResult =
  | {
      ok: true;
      payload: QRPayload;
    }
  | {
      ok: false;
      message: string;
    };

/**
 * Parse and validate a scanned QR code.
 */
export function parseQRPayload(raw: string): ParseQRResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: 'Invalid QR code.',
    };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null
  ) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  const data = parsed as {
    v?: unknown;
    event?: unknown;
    title?: unknown;
    start?: unknown;
    end?: unknown;
  };

  if (data.v !== 1) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  if (
    typeof data.event !== 'string' ||
    !data.event.trim()
  ) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  const payload: QRPayload = {
    v: 1,
    event: data.event.trim(),
  };

  if (
    typeof data.title === 'string' &&
    data.title.trim()
  ) {
    payload.title = data.title;
  }

  if (
    typeof data.start === 'string' &&
    data.start.trim()
  ) {
    payload.start = data.start;
  }

  if (
    typeof data.end === 'string' &&
    data.end.trim()
  ) {
    payload.end = data.end;
  }

  return {
    ok: true,
    payload,
  };
}
