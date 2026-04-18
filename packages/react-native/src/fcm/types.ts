export type FcmRemoteMessage = {
  messageId?: string;
  data?: Record<string, string>;
  notification?: {
    title?: string;
    body?: string;
  };
};

export type FcmConfig = {
  defaultChannelId?: string;
  defaultPressAction?: { id: string; launchActivity?: string };
  fallbackBehavior?: 'display' | 'ignore';
  ios?: {
    suppressForegroundBanner?: boolean;
  };
};
