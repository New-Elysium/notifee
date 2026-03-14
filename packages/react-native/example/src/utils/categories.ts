import {IOSNotificationCategory} from '@psync/notifee';

export const categories: IOSNotificationCategory[] = [
  {
    id: 'quickActions',
    actions: [
      {
        id: 'first_action_reply',
        title: 'Reply, Open & Cancel',
        input: true,
      },
      {
        id: 'second_action_nothing',
        title: 'Nothing',
      },
    ],
  },
];
