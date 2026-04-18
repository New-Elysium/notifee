import { Notification } from '../types/Notification';
import { NotificationAndroid, AndroidStyle } from '../types/NotificationAndroid';
import { NotificationIOS } from '../types/NotificationIOS';
import { isAndroid, isIOS } from '../utils';
import type { FcmConfig, FcmRemoteMessage } from './types';
import type { ParsedPayload } from './parseFcmPayload';

const PREFIX = '[notifee]';
const RESERVED_DATA_KEYS = new Set(['notifee_options', 'notifee_data']);
const VALID_INTERRUPTION_LEVELS = new Set(['active', 'critical', 'passive', 'timeSensitive']);

const STYLE_TYPE_MAP: Record<string, AndroidStyle | undefined> = {
  BIG_TEXT: AndroidStyle.BIGTEXT,
  BIG_PICTURE: AndroidStyle.BIGPICTURE,
};

export function reconstructNotification(
  parsed: ParsedPayload | null,
  remoteMessage: FcmRemoteMessage,
  config: FcmConfig,
): Notification {
  const data = rebuildData(remoteMessage.data);

  const title =
    parsed?.title ?? remoteMessage.notification?.title ?? remoteMessage.data?.title ?? '';
  const body = parsed?.body ?? remoteMessage.notification?.body ?? remoteMessage.data?.body ?? '';

  const notification: Notification = {
    id:
      ((parsed as Record<string, unknown> | null)?.id as string | undefined) ??
      remoteMessage.messageId,
    title,
    body,
  };

  if (Object.keys(data).length > 0) {
    notification.data = data;
  }

  if (isAndroid && (parsed?.android || config.defaultChannelId || config.defaultPressAction)) {
    notification.android = buildAndroidConfig(parsed?.android, config);
  }

  if (isIOS && parsed?.ios) {
    notification.ios = buildIosConfig(parsed.ios);
  }

  return notification;
}

function rebuildData(rawData: Record<string, string> | undefined): Record<string, string> {
  if (!rawData) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (!RESERVED_DATA_KEYS.has(key)) {
      result[key] = value;
    }
  }

  const notifeeDataRaw = rawData.notifee_data;
  if (typeof notifeeDataRaw === 'string') {
    try {
      const notifeeData = JSON.parse(notifeeDataRaw) as Record<string, string> | null;
      if (notifeeData && typeof notifeeData === 'object' && !Array.isArray(notifeeData)) {
        Object.assign(result, notifeeData);
      }
    } catch {
      console.warn(`${PREFIX} Failed to parse notifee_data. Using top-level data keys only.`);
    }
  }

  for (const key of RESERVED_DATA_KEYS) {
    delete result[key];
  }

  return result;
}

function buildAndroidConfig(
  raw: Record<string, unknown> | undefined,
  config: FcmConfig,
): NotificationAndroid {
  const android: NotificationAndroid = {};

  const channelId = raw?.channelId ?? config.defaultChannelId;
  if (typeof channelId === 'string') {
    android.channelId = channelId;
  }

  const pressAction = raw?.pressAction ?? config.defaultPressAction;
  if (pressAction && typeof pressAction === 'object') {
    android.pressAction = pressAction as NotificationAndroid['pressAction'];
  }

  if (typeof raw?.smallIcon === 'string') android.smallIcon = raw.smallIcon;
  if (typeof raw?.largeIcon === 'string') android.largeIcon = raw.largeIcon;
  if (typeof raw?.color === 'string') android.color = raw.color;

  if (Array.isArray(raw?.actions)) {
    android.actions = raw.actions as NotificationAndroid['actions'];
  }

  if (raw?.style && typeof raw.style === 'object') {
    const style = raw.style as { type?: string; text?: string; picture?: string };
    if (typeof style.type === 'string') {
      const mappedType = STYLE_TYPE_MAP[style.type];
      if (mappedType === AndroidStyle.BIGTEXT && typeof style.text === 'string') {
        android.style = { type: AndroidStyle.BIGTEXT, text: style.text };
      } else if (mappedType === AndroidStyle.BIGPICTURE && typeof style.picture === 'string') {
        android.style = { type: AndroidStyle.BIGPICTURE, picture: style.picture };
      } else if (mappedType === undefined) {
        console.warn(`${PREFIX} Unknown android.style.type '${style.type}'. Style ignored.`);
      } else {
        const field = mappedType === AndroidStyle.BIGTEXT ? 'text' : 'picture';
        console.warn(
          `${PREFIX} android.style.type '${style.type}' present but required '${field}' field missing or not a string. Style ignored.`,
        );
      }
    }
  }

  return android;
}

function buildIosConfig(raw: Record<string, unknown>): NotificationIOS {
  const ios: NotificationIOS = {};

  if (typeof raw.sound === 'string') ios.sound = raw.sound;
  if (typeof raw.categoryId === 'string') ios.categoryId = raw.categoryId;
  if (typeof raw.threadId === 'string') ios.threadId = raw.threadId;

  if (typeof raw.interruptionLevel === 'string') {
    if (VALID_INTERRUPTION_LEVELS.has(raw.interruptionLevel)) {
      ios.interruptionLevel = raw.interruptionLevel as NotificationIOS['interruptionLevel'];
    } else {
      console.warn(`${PREFIX} Unknown ios.interruptionLevel '${raw.interruptionLevel}'. Ignored.`);
    }
  }

  if (Array.isArray(raw.attachments)) {
    ios.attachments = (raw.attachments as Array<unknown>)
      .filter((att): att is Record<string, unknown> => {
        if (att == null || typeof att !== 'object') {
          return false;
        }

        const attachment = att as Record<string, unknown>;
        if (typeof attachment.url !== 'string' || attachment.url.length === 0) {
          console.warn(`${PREFIX} ios.attachments entry has missing or empty url. Skipped.`);
          return false;
        }

        return true;
      })
      .map(att => {
        const mapped: { id?: string; url: string } = { url: att.url as string };
        if (typeof att.identifier === 'string') {
          mapped.id = att.identifier;
        }
        return mapped;
      });
  }

  return ios;
}
