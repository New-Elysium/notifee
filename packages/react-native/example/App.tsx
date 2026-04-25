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
} from '@psync/notifee';

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

  const incrementBadge = async () => {
    if (!(await ensurePermission())) return;
    if (Platform.OS === 'android') {
      Alert.alert('Android', 'Badge count is iOS-only');
      return;
    }
    const nextCount = badgeCount + 1;
    await notifee.setBadgeCount(nextCount);
    setBadgeCount(nextCount);
  };

  const decrementBadge = async () => {
    if (Platform.OS === 'android') return;
    const nextCount = Math.max(0, badgeCount - 1);
    await notifee.setBadgeCount(nextCount);
    setBadgeCount(nextCount);
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
