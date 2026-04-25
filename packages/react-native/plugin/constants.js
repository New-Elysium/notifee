const DEFAULT_IOS_DEPLOYMENT_TARGET = '15.1';
const DEFAULT_APP_VERSION = '1.0.0';
const DEFAULT_IOS_BUILD_NUMBER = '1';
const DEFAULT_BACKGROUND_MODES = ['remote-notification'];
const DEFAULT_EXTENSION_NAME = 'NotifeeNotificationService';
const DEFAULT_NOTIFICATION_SERVICE_FILE = 'NotificationService.m';
const IOS_SOUNDS_DIR = 'NotifeeSounds';
const PACKAGE_NAME = '@psync/notifee';
const RES_PATH = 'android/app/src/main/res';
const USER_ACTIVITY_TYPES = ['INSendMessageIntent'];
const VALID_IOS_SOUND_EXTENSIONS = ['.wav', '.aif', '.aiff', '.caf'];

const SMALL_ICON_SIZES = [
  { name: 'drawable-mdpi', size: 24 },
  { name: 'drawable-hdpi', size: 36 },
  { name: 'drawable-xhdpi', size: 48 },
  { name: 'drawable-xxhdpi', size: 72 },
  { name: 'drawable-xxxhdpi', size: 96 },
];

const LARGE_ICON_SIZES = [{ name: 'drawable-xxxhdpi', size: 256 }];

module.exports = {
  DEFAULT_APP_VERSION,
  DEFAULT_BACKGROUND_MODES,
  DEFAULT_EXTENSION_NAME,
  DEFAULT_IOS_BUILD_NUMBER,
  DEFAULT_IOS_DEPLOYMENT_TARGET,
  DEFAULT_NOTIFICATION_SERVICE_FILE,
  IOS_SOUNDS_DIR,
  LARGE_ICON_SIZES,
  PACKAGE_NAME,
  RES_PATH,
  SMALL_ICON_SIZES,
  USER_ACTIVITY_TYPES,
  VALID_IOS_SOUND_EXTENSIONS,
};
