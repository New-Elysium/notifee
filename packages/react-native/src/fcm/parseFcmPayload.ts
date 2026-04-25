const PREFIX = '[notifee]';

export type ParsedPayload = {
  _v?: number;
  id?: string;
  title?: string;
  body?: string;
  android?: Record<string, unknown>;
  ios?: Record<string, unknown>;
  [key: string]: unknown;
};

export function parseFcmPayload(data: Record<string, string> | undefined): ParsedPayload | null {
  if (!data || typeof data.notifee_options !== 'string') {
    return null;
  }

  let parsed: ParsedPayload;
  try {
    parsed = JSON.parse(data.notifee_options);
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.warn(`${PREFIX} Failed to parse notifee_options: ${detail}. Falling back to raw title/body.`);
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn(`${PREFIX} notifee_options parsed to a non-object value. Falling back to raw title/body.`);
    return null;
  }

  const versionNum = Number(parsed._v);
  if (!Number.isNaN(versionNum) && versionNum > 1) {
    console.warn(
      `${PREFIX} notifee_options version ${versionNum} is newer than supported version 1. Display may be incomplete.`,
    );
  }

  return parsed;
}
