import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StyleSheet,
  StatusBar,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  TriggerType,
  AuthorizationStatus,
  AndroidVisibility,
  AndroidCategory,
  IOSNotificationInterruptionLevel,
  AndroidBadgeIconType,
  AndroidGroupAlertBehavior,
  AndroidColor,
  AndroidDefaults,
  RepeatFrequency,
  AlarmType,
  TimeUnit,
} from '@psync/notifee';
import type { FcmRemoteMessage } from '@psync/notifee';

// ============================================================================
// COLORS
// ============================================================================

const Colors = {
  dark: {
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceBorder: '#2A2A3E',
    primary: '#6366F1',
    success: '#10B981',
    danger: '#EF4444',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
  },
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceBorder: '#E0E0E0',
    primary: '#6366F1',
    success: '#10B981',
    danger: '#EF4444',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
  },
};

// ============================================================================
// GLOBAL BACKGROUND HANDLERS
// ============================================================================

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { pressAction, input, notification } = detail;
  console.log(`[Background] Event: ${EventType[type]}`);

  if (type === EventType.ACTION_PRESS) {
    if (pressAction?.id === 'reply' && input) {
      console.log('[Background] User replied:', input);
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
    } else if (pressAction?.id === 'like') {
      console.log('[Background] User liked');
    } else if (pressAction?.id === 'decline_call') {
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
    } else if (pressAction?.id === 'answer_call') {
      console.log('[Background] Call answered');
    }
  }
});

notifee.registerForegroundService(async notification => {
  console.log('[ForegroundService] Started:', notification.id);
  let progress = 0;

  const interval = setInterval(async () => {
    progress += 10;
    await notifee.displayNotification({
      id: notification.id,
      android: {
        ...notification.android,
        progress: { max: 100, current: progress, indeterminate: false },
      },
    });

    if (progress >= 100) {
      clearInterval(interval);
      console.log('[ForegroundService] Finished');
      await notifee.cancelNotification(notification.id || '');
    }
  }, 1000);

  return new Promise(resolve => {});
});

// ============================================================================
// UI COMPONENTS
// ============================================================================

function SectionHeader({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle?: string;
  colors: typeof Colors.dark;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      )}
      <View
        style={[styles.sectionDivider, { backgroundColor: colors.primary }]}
      />
    </View>
  );
}

function TestButton({
  onPress,
  icon,
  title,
  subTitle,
  disabled = false,
  variant = 'default',
  colors,
}: {
  onPress: () => void;
  icon: string;
  title: string;
  subTitle: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  colors: typeof Colors.dark;
}) {
  const backgroundColor =
    variant === 'danger' ? `${colors.danger}20` : colors.surface;
  const borderColor =
    variant === 'danger' ? colors.danger : colors.surfaceBorder;

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
      style={[
        styles.testButton,
        { backgroundColor, borderColor, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Text style={styles.testButtonIcon}>{icon}</Text>
      <View style={styles.testButtonContent}>
        <Text style={[styles.testButtonTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text
          style={[styles.testButtonSubtitle, { color: colors.textSecondary }]}
        >
          {subTitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function NotificationDemo() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [fcmConfigSet, setFcmConfigSet] = useState(false);
  const [notificationConfigSet, setNotificationConfigSet] = useState(false);
  const [settingsText, setSettingsText] = useState('');
  const [lastGroupId, setLastGroupId] = useState<string | null>(null);

  const colors = isDarkMode ? Colors.dark : Colors.light;

  useEffect(() => {
    initializeApp();
    const unsubscribe = notifee.onForegroundEvent(handleForegroundEvent);
    return () => unsubscribe();
  }, []);

  const initializeApp = async () => {
    try {
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: Platform.OS === 'ios',
      });
      setPermissionGranted(
        settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
      );

      if (Platform.OS === 'ios') {
        const count = await notifee.getBadgeCount();
        setBadgeCount(count);
      }

      if (Platform.OS === 'android') {
        await createDefaultChannels();
      }
    } catch (error) {
      console.error('[App] Init error:', error);
    }
  };

  const handleForegroundEvent = async ({
    type,
    detail,
  }: {
    type: number;
    detail: any;
  }) => {
    const { pressAction, input } = detail;
    console.log(`[Foreground] Event: ${EventType[type]}`);

    if (type === EventType.ACTION_PRESS) {
      if (pressAction?.id === 'reply' && input !== undefined) {
        Alert.alert('💬 Reply Received', `Your reply: ${input || '(empty)'}`);
      } else if (pressAction?.id === 'like') {
        Alert.alert('👍 Liked!', 'You liked this content.');
      } else if (pressAction?.id === 'answer_call') {
        Alert.alert('📞 Call Answered', 'Connecting to video chat...');
      } else if (pressAction?.id === 'decline_call') {
        Alert.alert('📵 Call Declined', 'Call has been dismissed.');
      }
    }
  };

  const createDefaultChannels = async () => {
    try {
      await notifee.createChannel({
        id: 'high-priority',
        name: 'High Priority',
        importance: AndroidImportance.HIGH,
        description: 'Important notifications',
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
      });

      await notifee.createChannel({
        id: 'default',
        name: 'Default',
        importance: AndroidImportance.DEFAULT,
        description: 'Standard notifications',
      });

      await notifee.createChannel({
        id: 'foreground-service',
        name: 'Background Tasks',
        importance: AndroidImportance.LOW,
        description: 'Ongoing background tasks',
        sound: 'none',
      });
    } catch (error) {
      console.error('[App] Channel creation error:', error);
    }
  };

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permissionGranted === false) {
      Alert.alert(
        'Permission Required',
        'Notification permission is required for this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => notifee.openNotificationSettings(),
          },
        ],
      );
      return false;
    }
    return true;
  }, [permissionGranted]);

  // ============================================================================
  // NOTIFICATION FUNCTIONS
  // ============================================================================

  const sendBasicNotification = async () => {
    if (!(await ensurePermission())) return;
    await notifee.displayNotification({
      title: 'Basic Notification',
      body: `Test notification at ${new Date().toLocaleTimeString()}`,
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  };

  const sendWithActions = async () => {
    if (!(await ensurePermission())) return;
    await notifee.displayNotification({
      id: `actions-${Date.now()}`,
      title: 'New Match! 💕',
      body: 'Someone is interested in your profile',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.SOCIAL,
        pressAction: { id: 'default' },
        actions: [
          { title: '👍 Like', pressAction: { id: 'like' } },
          {
            title: '💬 Message',
            pressAction: { id: 'reply', launchActivity: 'default' },
            input: true,
          },
        ],
      },
      ios: { categoryId: 'message', sound: 'default' },
    });
  };

  const sendBigPicture = async () => {
    if (!(await ensurePermission())) return;
    await notifee.displayNotification({
      id: `bigpicture-${Date.now()}`,
      title: '📸 New Photo',
      body: 'Alex shared a new profile picture',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        style: {
          type: AndroidStyle.BIGPICTURE,
          picture: 'https://picsum.photos/id/1015/800/400',
          contentTitle: 'New Profile Photo',
          contentText: 'Alex updated their profile picture',
        },
        pressAction: { id: 'default' },
      },
      ios: {
        attachments: [
          {
            url: 'https://picsum.photos/id/1015/400/400.jpg',
            thumbnailHidden: false,
          },
        ],
        sound: 'default',
      },
    });
  };

  const sendInboxStyle = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'ios') {
      Alert.alert('iOS', 'Inbox style is Android-only');
      return;
    }
    await notifee.displayNotification({
      id: `inbox-${Date.now()}`,
      title: '3 New Messages 💬',
      body: 'Tap to view all messages',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        style: {
          type: AndroidStyle.INBOX,
          title: '3 New Messages',
          lines: [
            'Sarah (INFJ): Hey, are you free tomorrow?',
            "Mike (ESTP): Let's meet at 3 PM",
            'Emma (ENFP): Check out this link! 👉',
          ],
        },
        pressAction: { id: 'default' },
      },
    });
  };

  const sendBigTextStyle = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'ios') {
      Alert.alert('iOS', 'BigText style is Android-only');
      return;
    }
    await notifee.displayNotification({
      id: `bigtext-${Date.now()}`,
      title: 'Community Guidelines Update',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        style: {
          type: AndroidStyle.BIGTEXT,
          text: 'To ensure our platform remains a safe space for everyone, we have updated our community guidelines. These changes focus on video intros and messaging etiquette.',
        },
        pressAction: { id: 'default' },
      },
    });
  };

  const sendProgressNotification = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'ios') {
      Alert.alert('iOS', 'Progress bar is Android-only');
      return;
    }
    const notificationId = `progress-${Date.now()}`;

    await notifee.displayNotification({
      id: notificationId,
      title: '📤 Uploading Video...',
      body: 'Please wait while we process your video',
      android: {
        channelId: 'foreground-service',
        smallIcon: 'ic_launcher',
        progress: { max: 100, current: 0, indeterminate: false },
        ongoing: true,
        pressAction: { id: 'default' },
      },
    });

    let progress = 0;
    const interval = setInterval(async () => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        await notifee.displayNotification({
          id: notificationId,
          title: '✅ Upload Complete!',
          body: 'Your video is ready to share',
          android: {
            channelId: 'high-priority',
            smallIcon: 'ic_launcher',
            ongoing: false,
            autoCancel: true,
            progress: { max: 100, current: 100, indeterminate: false },
          },
        });
        setTimeout(() => notifee.cancelNotification(notificationId), 3000);
      } else {
        await notifee.displayNotification({
          id: notificationId,
          android: {
            progress: {
              max: 100,
              current: Math.round(progress),
              indeterminate: false,
            },
          },
        });
      }
    }, 1000);
  };

  const sendFullScreenIntent = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'ios') {
      Alert.alert('iOS', 'Full-screen intent is Android-only');
      return;
    }
    await notifee.displayNotification({
      id: 'fullscreen-call',
      title: '📞 Incoming Video Call',
      body: 'Emma (ENFP) is calling you',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        fullScreenIntent: { launchActivity: 'default' },
        category: AndroidCategory.CALL,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: { id: 'default' },
        actions: [
          { title: '📵 Decline', pressAction: { id: 'decline_call' } },
          {
            title: '📞 Answer',
            pressAction: { id: 'answer_call', launchActivity: 'default' },
          },
        ],
      },
    });
  };

  const listChannels = async () => {
    if (Platform.OS === 'android') {
      const channels = await notifee.getChannels();
      Alert.alert(
        'Channels',
        channels.length > 0
          ? channels.map(c => `${c.id}: ${c.name}`).join('\n')
          : 'No channels found',
      );
    } else {
      Alert.alert('iOS', 'Channels are Android-only');
    }
  };

  const sendiOSCommunication = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'android') {
      Alert.alert('Android', 'Communication info is iOS-only');
      return;
    }
    await notifee.displayNotification({
      id: `comm-${Date.now()}`,
      title: 'New Message from Emma',
      body: 'Are we still on for coffee later?',
      ios: {
        categoryId: 'message',
        sound: 'default',
        interruptionLevel: IOSNotificationInterruptionLevel.ACTIVE,
      },
    });
  };

  const sendTimeSensitive = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'android') {
      Alert.alert('Android', 'Time-sensitive is iOS-only');
      return;
    }
    await notifee.displayNotification({
      id: `timesensitive-${Date.now()}`,
      title: '⏰ Match Expiring!',
      body: 'Your match with Alex expires in 1 hour. Send a message!',
      ios: {
        interruptionLevel: IOSNotificationInterruptionLevel.TIME_SENSITIVE,
        sound: 'default',
      },
    });
  };

  const sendiOSAttachment = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'android') {
      Alert.alert('Android', 'Rich attachments are iOS-only');
      return;
    }
    await notifee.displayNotification({
      id: `attachment-${Date.now()}`,
      title: '📸 New Video Intro',
      body: "Check out Sarah's new profile video",
      ios: {
        attachments: [
          {
            url: 'https://picsum.photos/id/1025/400/400.jpg',
            thumbnailHidden: false,
          },
        ],
        sound: 'default',
      },
    });
  };

  // ============================================================================
  // BADGE COUNT HELPERS
  // ============================================================================

  const incrementBadge = async () => {
    if (Platform.OS === 'android') {
      Alert.alert('iOS Only', 'Badge increment is iOS-only');
      return;
    }
    try {
      await notifee.incrementBadgeCount(1);
      const count = await notifee.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('[App] incrementBadgeCount error:', error);
    }
  };

  const decrementBadge = async () => {
    if (Platform.OS === 'android') {
      Alert.alert('iOS Only', 'Badge decrement is iOS-only');
      return;
    }
    try {
      await notifee.decrementBadgeCount(1);
      const count = await notifee.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('[App] decrementBadgeCount error:', error);
    }
  };

  const resetBadge = async () => {
    if (Platform.OS === 'android') return;
    try {
      await notifee.setBadgeCount(0);
      setBadgeCount(0);
    } catch (error) {
      console.error('[App] setBadgeCount error:', error);
    }
  };

  const startForegroundServiceDemo = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'ios') {
      Alert.alert('iOS', 'Foreground service is Android-only');
      return;
    }
    const notificationId = 'foreground-demo';

    await notifee.displayNotification({
      id: notificationId,
      title: '🏃‍♂️ Background Task Running',
      body: 'Processing your data...',
      android: {
        channelId: 'foreground-service',
        smallIcon: 'ic_launcher',
        asForegroundService: true,
        importance: AndroidImportance.LOW,
        progress: { max: 100, current: 0, indeterminate: true },
        ongoing: true,
        autoCancel: false,
        pressAction: { id: 'default' },
      },
    });

    setTimeout(async () => {
      await notifee.displayNotification({
        id: notificationId,
        title: '✅ Task Complete',
        body: 'Background processing finished',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          ongoing: false,
          autoCancel: true,
          progress: { max: 100, current: 100, indeterminate: false },
        },
      });
      setTimeout(() => notifee.cancelNotification(notificationId), 2000);
    }, 10000);
  };

  const stopForegroundService = async () => {
    if (Platform.OS === 'android') {
      await notifee.stopForegroundService();
    }
  };

  const scheduleTriggerNotification = async (secondsFromNow: number = 5) => {
    if (!(await ensurePermission())) return;
    const triggerId = `trigger-${Date.now()}`;

    await notifee.createTriggerNotification(
      {
        id: triggerId,
        title: '⏰ Scheduled Notification',
        body: `This notification was scheduled ${secondsFromNow} seconds ago`,
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
        ios: {
          sound: 'default',
          interruptionLevel: IOSNotificationInterruptionLevel.ACTIVE,
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + secondsFromNow * 1000,
      },
    );

    Alert.alert(
      'Scheduled',
      `Notification will fire in ${secondsFromNow} seconds.\n\nPut the app in background to test!`,
    );
  };

  const cancelAllTriggers = async () => {
    const triggerIds = await notifee.getTriggerNotificationIds();
    if (triggerIds.length === 0) {
      Alert.alert(
        'No Triggers',
        'There are no pending scheduled notifications.',
      );
      return;
    }
    for (const id of triggerIds) {
      await notifee.cancelTriggerNotification(id);
    }
    Alert.alert(
      'Cancelled',
      `Cancelled ${triggerIds.length} scheduled notification(s).`,
    );
  };

  const sendCustomNotification = async () => {
    if (!customMessage.trim()) {
      Alert.alert('Error', 'Please enter a custom message');
      return;
    }
    if (!(await ensurePermission())) return;

    await notifee.displayNotification({
      id: `custom-${Date.now()}`,
      title: 'Custom Notification',
      body: customMessage,
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });

    setCustomMessage('');
    setModalVisible(false);
  };

  const clearAllNotifications = async () => {
    await notifee.cancelAllNotifications();
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
      setBadgeCount(0);
    }
    Alert.alert('Cleared', 'All notifications have been cancelled.');
  };

  // ============================================================================
  // CONFIGURATION & SETTINGS
  // ============================================================================

  const fetchNotificationSettings = async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      setSettingsText(JSON.stringify(settings, null, 2));
      Alert.alert('Notification Settings', JSON.stringify(settings, null, 2).slice(0, 800));
    } catch (error) {
      console.error('[App] getNotificationSettings error:', error);
      Alert.alert('Error', 'Failed to get notification settings');
    }
  };

  const configureNotificationConfig = async () => {
    try {
      await notifee.setNotificationConfig({
        ios: { interceptRemoteNotifications: false },
      });
      setNotificationConfigSet(true);
      Alert.alert('Notification Config', 'Set interceptRemoteNotifications to false\n(Firebase Messaging will handle remote taps)');
    } catch (error) {
      console.error('[App] setNotificationConfig error:', error);
      Alert.alert('Error', 'Failed to set notification config');
    }
  };

  const checkInitialNotification = async () => {
    try {
      const initial = await notifee.getInitialNotification();
      if (initial) {
        Alert.alert('Initial Notification', JSON.stringify(initial, null, 2).slice(0, 800));
      } else {
        Alert.alert('Initial Notification', 'App was not opened by a notification');
      }
    } catch (error) {
      console.error('[App] getInitialNotification error:', error);
    }
  };

  // ============================================================================
  // FCM / REMOTE MESSAGE HELPERS
  // ============================================================================

  const configureFcmDefaults = async () => {
    try {
      await notifee.setFcmConfig({
        defaultChannelId: 'default',
        defaultPressAction: { id: 'default', launchActivity: 'default' },
        fallbackBehavior: 'display',
      });
      setFcmConfigSet(true);
      Alert.alert('FCM Config', 'Default FCM config applied');
    } catch (error) {
      console.error('[App] setFcmConfig error:', error);
      Alert.alert('Error', 'Failed to set FCM config');
    }
  };

  const simulateFcmMessage = async () => {
    if (!(await ensurePermission())) return;
    try {
      const remoteMessage: FcmRemoteMessage = {
        messageId: `fcm-${Date.now()}`,
        data: {
          title: 'FCM Message Title',
          body: 'This was handled via handleFcmMessage()',
          channelId: 'default',
        },
        notification: {
          title: 'FCM Message Title',
          body: 'This was handled via handleFcmMessage()',
        },
      };
      const id = await notifee.handleFcmMessage(remoteMessage);
      Alert.alert('FCM Simulated', `Notification created with id: ${id}`);
    } catch (error) {
      console.error('[App] handleFcmMessage error:', error);
      Alert.alert('Error', 'Failed to handle FCM message');
    }
  };

  // ============================================================================
  // CHANNEL MANAGEMENT
  // ============================================================================

  const createTestChannelGroup = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Channel groups are Android-only');
      return;
    }
    try {
      const groupId = await notifee.createChannelGroup({
        id: 'test-group',
        name: 'Test Group',
      });
      setLastGroupId(groupId);
      Alert.alert('Channel Group', `Created: ${groupId}`);
    } catch (error) {
      console.error('[App] createChannelGroup error:', error);
    }
  };

  const listChannelGroups = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Channel groups are Android-only');
      return;
    }
    try {
      const groups = await notifee.getChannelGroups();
      Alert.alert(
        'Channel Groups',
        groups.length > 0 ? groups.map(g => `${g.id}: ${g.name}`).join('\n') : 'No channel groups found',
      );
    } catch (error) {
      console.error('[App] getChannelGroups error:', error);
    }
  };

  const checkChannelStatus = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Channel status is Android-only');
      return;
    }
    try {
      const created = await notifee.isChannelCreated('default');
      const blocked = await notifee.isChannelBlocked('default');
      Alert.alert('Channel: default', `Created: ${created}\nBlocked: ${blocked}`);
    } catch (error) {
      console.error('[App] channel status error:', error);
    }
  };

  const deleteTestChannelGroup = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.deleteChannelGroup('test-group');
      setLastGroupId(null);
      Alert.alert('Deleted', 'Channel group "test-group" deleted');
    } catch (error) {
      console.error('[App] deleteChannelGroup error:', error);
    }
  };

  const deleteTestChannel = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.deleteChannel('high-priority');
      Alert.alert('Deleted', 'Channel "high-priority" deleted');
    } catch (error) {
      console.error('[App] deleteChannel error:', error);
    }
  };

  // ============================================================================
  // POWER MANAGER & BATTERY OPTIMIZATION
  // ============================================================================

  const checkPowerManager = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Power manager is Android-only');
      return;
    }
    try {
      const info = await notifee.getPowerManagerInfo();
      Alert.alert(
        'Power Manager Info',
        `Manufacturer: ${info.manufacturer}\nModel: ${info.model || 'N/A'}\nVersion: ${info.version || 'N/A'}\nActivity: ${info.activity || 'N/A (none)'}`,
      );
    } catch (error) {
      console.error('[App] getPowerManagerInfo error:', error);
    }
  };

  const openPowerManager = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Power manager is Android-only');
      return;
    }
    try {
      await notifee.openPowerManagerSettings();
      Alert.alert('Settings', 'Opened power manager settings');
    } catch (error) {
      console.error('[App] openPowerManagerSettings error:', error);
    }
  };

  const checkBatteryOptimization = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Battery optimization is Android-only');
      return;
    }
    try {
      const enabled = await notifee.isBatteryOptimizationEnabled();
      Alert.alert('Battery Optimization', enabled ? 'Enabled - app may be restricted' : 'Disabled - no restrictions');
    } catch (error) {
      console.error('[App] isBatteryOptimizationEnabled error:', error);
    }
  };

  const openBatteryOptimization = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Battery optimization is Android-only');
      return;
    }
    try {
      await notifee.openBatteryOptimizationSettings();
    } catch (error) {
      console.error('[App] openBatteryOptimizationSettings error:', error);
    }
  };

  const openAlarmSettings = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Alarm permission settings are Android-only');
      return;
    }
    try {
      await notifee.openAlarmPermissionSettings();
      Alert.alert('Settings', 'Opened alarm permission settings');
    } catch (error) {
      console.error('[App] openAlarmPermissionSettings error:', error);
    }
  };

  // ============================================================================
  // QUERY APIs
  // ============================================================================

  const listDisplayedNotifications = async () => {
    try {
      const notifications = await notifee.getDisplayedNotifications();
      Alert.alert(
        `Displayed (${notifications.length})`,
        notifications.length > 0
          ? notifications.map(n => `${n.id}: ${n.notification.title}`).slice(0, 10).join('\n')
          : 'No displayed notifications',
      );
    } catch (error) {
      console.error('[App] getDisplayedNotifications error:', error);
    }
  };

  const listTriggerNotifications = async () => {
    try {
      const triggers = await notifee.getTriggerNotifications();
      Alert.alert(
        `Triggers (${triggers.length})`,
        triggers.length > 0
          ? triggers.map(t => `${t.notification.id}: ${t.notification.title}`).slice(0, 10).join('\n')
          : 'No trigger notifications',
      );
    } catch (error) {
      console.error('[App] getTriggerNotifications error:', error);
    }
  };

  const cancelDisplayedAll = async () => {
    try {
      await notifee.cancelDisplayedNotifications();
      Alert.alert('Cancelled', 'All displayed notifications cancelled');
    } catch (error) {
      console.error('[App] cancelDisplayedNotifications error:', error);
    }
  };

  const cancelTriggersAll = async () => {
    try {
      await notifee.cancelTriggerNotifications();
      Alert.alert('Cancelled', 'All trigger notifications cancelled');
    } catch (error) {
      console.error('[App] cancelTriggerNotifications error:', error);
    }
  };

  // ============================================================================
  // ADVANCED TRIGGERS
  // ============================================================================

  const scheduleIntervalNotification = async () => {
    if (!(await ensurePermission())) return;
    const triggerId = `interval-${Date.now()}`;

    await notifee.createTriggerNotification(
      {
        id: triggerId,
        title: 'Interval Notification',
        body: 'This repeats every 15 minutes',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
        ios: { sound: 'default' },
      },
      {
        type: TriggerType.INTERVAL,
        interval: 15,
        timeUnit: TimeUnit.MINUTES,
      },
    );

    Alert.alert('Scheduled', 'Interval trigger set for every 15 minutes');
  };

  const scheduleAlarmManagerTrigger = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'AlarmManager triggers are Android-only');
      return;
    }
    const triggerId = `alarm-${Date.now()}`;

    await notifee.createTriggerNotification(
      {
        id: triggerId,
        title: 'AlarmManager Trigger',
        body: 'Scheduled with SET_EXACT_AND_ALLOW_WHILE_IDLE',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 60000,
        alarmManager: {
          type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        },
      },
    );

    Alert.alert('Scheduled', 'AlarmManager trigger set for 60 seconds');
  };

  // ============================================================================
  // ANDROID ADVANCED STYLES
  // ============================================================================

  const sendMessagingStyle = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Messaging style is Android-only');
      return;
    }
    await notifee.displayNotification({
      id: `messaging-${Date.now()}`,
      title: 'New Messages',
      body: 'You have new messages',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        style: {
          type: AndroidStyle.MESSAGING,
          person: {
            name: 'Sarah',
            icon: 'https://i.pravatar.cc/150?u=sarah',
          },
          messages: [
            { text: 'Hey! Are you free?', timestamp: Date.now() - 60000 },
            { text: 'Want to grab coffee?', timestamp: Date.now() - 30000 },
          ],
        },
        pressAction: { id: 'default' },
      },
    });
  };

  const sendGroupedNotification = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Grouped notifications are Android-only');
      return;
    }
    const groupId = 'group-social';

    await notifee.displayNotification({
      id: `group-child-1`,
      title: 'Sarah liked your photo',
      body: 'Sarah liked your photo',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        groupId,
        groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
        pressAction: { id: 'default' },
      },
    });

    await notifee.displayNotification({
      id: `group-child-2`,
      title: 'Mike commented',
      body: 'Mike: "Nice shot!"',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        groupId,
        groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
        pressAction: { id: 'default' },
      },
    });

    await notifee.displayNotification({
      id: `group-summary`,
      title: '2 new interactions',
      body: 'Sarah and Mike',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        groupId,
        groupAlertBehavior: AndroidGroupAlertBehavior.ALL,
        style: { type: AndroidStyle.INBOX, title: 'Social Updates', lines: ['Sarah liked your photo', 'Mike commented'] },
      },
    });

    Alert.alert('Grouped', 'Created 2 children + 1 summary notification');
  };

  const sendStyledNotification = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Styled notifications are Android-only');
      return;
    }
    await notifee.displayNotification({
      id: `styled-${Date.now()}`,
      title: 'Styled Notification',
      body: 'Custom color, large icon, lights, vibration',
      android: {
        channelId: 'high-priority',
        smallIcon: 'ic_launcher',
        color: AndroidColor.BLUE,
        largeIcon: 'https://i.pravatar.cc/150?u=styled',
        badgeIconType: AndroidBadgeIconType.SMALL,
        defaults: [AndroidDefaults.SOUND, AndroidDefaults.VIBRATE],
        vibrationPattern: [300, 500, 300, 500],
        showTimestamp: true,
        onlyAlertOnce: true,
        pressAction: { id: 'default' },
      },
    });
  };

  const sendLocalOnlyNotification = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Local only is Android-only');
      return;
    }
    await notifee.displayNotification({
      id: `local-${Date.now()}`,
      title: 'Local Only',
      body: 'This notification will not show on other devices',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        localOnly: true,
        pressAction: { id: 'default' },
      },
    });
  };

  const hideDrawer = () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'hideNotificationDrawer is Android-only');
      return;
    }
    notifee.hideNotificationDrawer();
    Alert.alert('Drawer', 'Notification drawer hidden');
  };

  // ============================================================================
  // iOS CATEGORIES
  // ============================================================================

  const setupIOSCategories = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'Notification categories are iOS-only');
      return;
    }
    try {
      await notifee.setNotificationCategories([
        {
          id: 'message',
          actions: [
            { id: 'reply', title: 'Reply', input: true },
            { id: 'like', title: 'Like', foreground: true },
          ],
        },
        {
          id: 'call',
          actions: [
            { id: 'answer_call', title: 'Answer', foreground: true },
            { id: 'decline_call', title: 'Decline', destructive: true },
          ],
        },
      ]);
      Alert.alert('Categories', 'Set message and call categories');
    } catch (error) {
      console.error('[App] setNotificationCategories error:', error);
    }
  };

  const getIOSCategories = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'Notification categories are iOS-only');
      return;
    }
    try {
      const categories = await notifee.getNotificationCategories();
      Alert.alert(
        `Categories (${categories.length})`,
        categories.length > 0 ? categories.map(c => c.id).join('\n') : 'No categories set',
      );
    } catch (error) {
      console.error('[App] getNotificationCategories error:', error);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>
            Notifee Lab
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Notification Testing Suite
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsDarkMode(!isDarkMode)}
          style={[styles.themeToggle, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.themeToggleText}>{isDarkMode ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {permissionGranted !== null && (
          <View
            style={[
              styles.permissionBanner,
              {
                backgroundColor: permissionGranted
                  ? `${colors.success}20`
                  : `${colors.danger}20`,
                borderColor: permissionGranted ? colors.success : colors.danger,
              },
            ]}
          >
            <Text
              style={[
                styles.permissionText,
                { color: permissionGranted ? colors.success : colors.danger },
              ]}
            >
              {permissionGranted
                ? '✅ Notifications Enabled'
                : '❌ Notifications Disabled'}
            </Text>
          </View>
        )}

        {Platform.OS === 'ios' && (
          <View
            style={[
              styles.badgeContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.badgeInfo}>
              <Text style={[styles.badgeLabel, { color: colors.text }]}>
                🔴 Badge Count
              </Text>
              <Text style={[styles.badgeValue, { color: colors.primary }]}>
                {badgeCount}
              </Text>
            </View>
            <View style={styles.badgeButtons}>
              <TouchableOpacity
                onPress={resetBadge}
                style={[styles.badgeButton, { backgroundColor: colors.textMuted }]}
              >
                <Text style={styles.badgeButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={decrementBadge}
                style={[styles.badgeButton, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.badgeButtonText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={incrementBadge}
                style={[
                  styles.badgeButton,
                  { backgroundColor: colors.success },
                ]}
              >
                <Text style={styles.badgeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SectionHeader title="Basic Notifications" colors={colors} />
        <TestButton
          onPress={sendBasicNotification}
          icon="🔔"
          title="Basic Notification"
          subTitle="Simple notification with title and body"
          colors={colors}
        />
        <TestButton
          onPress={() => setModalVisible(true)}
          icon="✏️"
          title="Custom Message"
          subTitle="Send notification with custom text"
          colors={colors}
        />

        <SectionHeader title="Cross-Platform Features" colors={colors} />
        <TestButton
          onPress={sendWithActions}
          icon="🔘"
          title="Notification with Actions"
          subTitle="Buttons and reply input (Android)"
          colors={colors}
        />
        <TestButton
          onPress={sendBigPicture}
          icon="🖼️"
          title="Big Picture"
          subTitle="Large image attachment"
          colors={colors}
        />

        <SectionHeader
          title="Android Native"
          subtitle={
            Platform.OS === 'ios' ? '(Not available on iOS)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={sendInboxStyle}
          icon="📬"
          title="Inbox Style"
          subTitle="Multi-line message list"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendBigTextStyle}
          icon="📄"
          title="BigText Style"
          subTitle="Expandable long text"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendProgressNotification}
          icon="📊"
          title="Progress Bar"
          subTitle="Download/upload status indicator"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendFullScreenIntent}
          icon="📲"
          title="Full-Screen Intent"
          subTitle="Incoming call style notification"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={listChannels}
          icon="📋"
          title="List Channels"
          subTitle="View all Android notification channels"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />

        <SectionHeader
          title="iOS Native"
          subtitle={
            Platform.OS === 'android' ? '(Not available on Android)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={sendiOSCommunication}
          icon="💬"
          title="Communication Info"
          subTitle="Avatar and conversation info"
          disabled={Platform.OS === 'android'}
          colors={colors}
        />
        <TestButton
          onPress={sendTimeSensitive}
          icon="🚨"
          title="Time Sensitive"
          subTitle="Bypasses Focus/Do Not Disturb"
          disabled={Platform.OS === 'android'}
          colors={colors}
        />
        <TestButton
          onPress={sendiOSAttachment}
          icon="📸"
          title="Rich Attachment"
          subTitle="Image/video attachments"
          disabled={Platform.OS === 'android'}
          colors={colors}
        />

        <SectionHeader title="Background & Services" colors={colors} />
        <TestButton
          onPress={startForegroundServiceDemo}
          icon="🏃‍♂️"
          title="Foreground Service"
          subTitle="Run task while app is backgrounded (Android)"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={stopForegroundService}
          icon="⏹️"
          title="Stop Foreground Service"
          subTitle="Stop the running foreground task"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={() => scheduleTriggerNotification(5)}
          icon="⏱️"
          title="Schedule (5 seconds)"
          subTitle="Fire in 5 seconds - test in background"
          colors={colors}
        />
        <TestButton
          onPress={() => scheduleTriggerNotification(30)}
          icon="⏰"
          title="Schedule (30 seconds)"
          subTitle="Fire in 30 seconds - test in background"
          colors={colors}
        />
        <TestButton
          onPress={cancelAllTriggers}
          icon="🗑️"
          title="Cancel All Scheduled"
          subTitle="Remove all pending triggers"
          colors={colors}
        />

        <SectionHeader title="Configuration & Settings" colors={colors} />
        <TestButton
          onPress={fetchNotificationSettings}
          icon="⚙️"
          title="Get Notification Settings"
          subTitle="Fetch current permission & settings"
          colors={colors}
        />
        <TestButton
          onPress={configureNotificationConfig}
          icon="🔧"
          title="Set Notification Config"
          subTitle="Disable iOS remote notification interception"
          disabled={notificationConfigSet}
          colors={colors}
        />
        <TestButton
          onPress={checkInitialNotification}
          icon="🚀"
          title="Get Initial Notification"
          subTitle="Check if app was opened by a notification"
          colors={colors}
        />

        <SectionHeader
          title="FCM / Remote Messages"
          colors={colors}
        />
        <TestButton
          onPress={configureFcmDefaults}
          icon="📡"
          title="Set FCM Config"
          subTitle="Configure default channel and fallback behavior"
          disabled={fcmConfigSet}
          colors={colors}
        />
        <TestButton
          onPress={simulateFcmMessage}
          icon="📨"
          title="Simulate FCM Message"
          subTitle="Test handleFcmMessage with a mock payload"
          colors={colors}
        />

        <SectionHeader
          title="Channel Management"
          subtitle={
            Platform.OS === 'ios' ? '(Not available on iOS)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={createTestChannelGroup}
          icon="📁"
          title="Create Channel Group"
          subTitle="Create a test channel group"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={listChannelGroups}
          icon="📂"
          title="List Channel Groups"
          subTitle="View all channel groups"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={checkChannelStatus}
          icon="🔍"
          title="Check Channel Status"
          subTitle="Is default channel created / blocked?"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={deleteTestChannelGroup}
          icon="🗑️"
          title="Delete Channel Group"
          subTitle="Remove the test-group channel group"
          disabled={Platform.OS === 'ios'}
          variant="danger"
          colors={colors}
        />
        <TestButton
          onPress={deleteTestChannel}
          icon="🗑️"
          title="Delete High-Priority Channel"
          subTitle="Remove the high-priority channel"
          disabled={Platform.OS === 'ios'}
          variant="danger"
          colors={colors}
        />

        <SectionHeader
          title="Power Manager & Battery"
          subtitle={
            Platform.OS === 'ios' ? '(Not available on iOS)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={checkPowerManager}
          icon="🔋"
          title="Power Manager Info"
          subTitle="Get device manufacturer & power settings"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={openPowerManager}
          icon="⚡"
          title="Open Power Manager Settings"
          subTitle="Navigate to device-specific power settings"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={checkBatteryOptimization}
          icon="🔋"
          title="Check Battery Optimization"
          subTitle="See if the app is battery-optimized"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={openBatteryOptimization}
          icon="🔌"
          title="Open Battery Optimization Settings"
          subTitle="Navigate to battery optimization settings"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={openAlarmSettings}
          icon="⏰"
          title="Open Alarm Permission Settings"
          subTitle="Android 12+ alarm special access"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />

        <SectionHeader title="Query & Cancel APIs" colors={colors} />
        <TestButton
          onPress={listDisplayedNotifications}
          icon="📋"
          title="List Displayed Notifications"
          subTitle="Get all currently displayed notifications"
          colors={colors}
        />
        <TestButton
          onPress={listTriggerNotifications}
          icon="📋"
          title="List Trigger Notifications"
          subTitle="Get all pending scheduled notifications"
          colors={colors}
        />
        <TestButton
          onPress={cancelDisplayedAll}
          icon="❌"
          title="Cancel Displayed Notifications"
          subTitle="Cancel all currently displayed notifications"
          variant="danger"
          colors={colors}
        />
        <TestButton
          onPress={cancelTriggersAll}
          icon="❌"
          title="Cancel Trigger Notifications"
          subTitle="Cancel all pending trigger notifications"
          variant="danger"
          colors={colors}
        />
        {Platform.OS === 'android' && (
          <TestButton
            onPress={hideDrawer}
            icon="🙈"
            title="Hide Notification Drawer"
            subTitle="Programmatically hide the notification shade"
            colors={colors}
          />
        )}

        <SectionHeader title="Advanced Triggers" colors={colors} />
        <TestButton
          onPress={scheduleIntervalNotification}
          icon="🔁"
          title="Schedule Interval Trigger"
          subTitle="Repeats every 15 minutes"
          colors={colors}
        />
        <TestButton
          onPress={scheduleAlarmManagerTrigger}
          icon="⏰"
          title="Schedule AlarmManager Trigger"
          subTitle="Exact alarm in 60 seconds (Android)"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />

        <SectionHeader
          title="Android Advanced Styles"
          subtitle={
            Platform.OS === 'ios' ? '(Not available on iOS)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={sendMessagingStyle}
          icon="💬"
          title="Messaging Style"
          subTitle="Conversation-style notification with messages"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendGroupedNotification}
          icon="🗂️"
          title="Grouped Notifications"
          subTitle="Summary + child notifications with groupAlertBehavior"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendStyledNotification}
          icon="🎨"
          title="Styled Notification"
          subTitle="Color, largeIcon, vibration, lights, badgeIconType"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />
        <TestButton
          onPress={sendLocalOnlyNotification}
          icon="📍"
          title="Local Only Notification"
          subTitle="Won't show on linked devices"
          disabled={Platform.OS === 'ios'}
          colors={colors}
        />

        <SectionHeader
          title="iOS Categories"
          subtitle={
            Platform.OS === 'android' ? '(Not available on Android)' : undefined
          }
          colors={colors}
        />
        <TestButton
          onPress={setupIOSCategories}
          icon="🏷️"
          title="Set Categories"
          subTitle="Register message & call action categories"
          disabled={Platform.OS === 'android'}
          colors={colors}
        />
        <TestButton
          onPress={getIOSCategories}
          icon="📋"
          title="Get Categories"
          subTitle="List registered iOS notification categories"
          disabled={Platform.OS === 'android'}
          colors={colors}
        />

        <SectionHeader title="Danger Zone" colors={colors} />
        <TestButton
          onPress={clearAllNotifications}
          icon="💥"
          title="Clear All Notifications"
          subTitle="Cancel all displayed notifications"
          variant="danger"
          colors={colors}
        />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Custom Notification
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfaceBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Enter your message..."
              placeholderTextColor={colors.textMuted}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.surfaceBorder },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={sendCustomNotification}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerContent: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleText: { fontSize: 22 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  permissionBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionText: { fontSize: 14, fontWeight: '600' },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeLabel: { fontSize: 16, fontWeight: '600' },
  badgeValue: { fontSize: 24, fontWeight: '700' },
  badgeButtons: { flexDirection: 'row', gap: 12 },
  badgeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  sectionHeader: { marginTop: 20, marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  sectionDivider: { height: 3, width: 40, borderRadius: 2, marginTop: 8 },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  testButtonIcon: { fontSize: 28, marginRight: 14 },
  testButtonContent: { flex: 1 },
  testButtonTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  testButtonSubtitle: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});
