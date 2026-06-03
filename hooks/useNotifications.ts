import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isAndroidExpoGo = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isAndroidExpoGo && Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useNotifications() {
  const [notification, setNotification] = useState<any>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!Notifications) return;
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    notification,
  };
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return;
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });
  }

  if (Device.isDevice) {
    const existingStatus = (await Notifications.getPermissionsAsync()) as any;
    let finalStatus = existingStatus.granted ? 'granted' : 'un-granted';
    if (!existingStatus.granted) {
      const request = (await Notifications.requestPermissionsAsync()) as any;
      finalStatus = request.granted ? 'granted' : 'un-granted';
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get permissions for push notification!');
      return;
    }
    // Note: getExpoPushTokenAsync() was removed here to prevent crashes in Expo Go.
    // Local notifications don't require a remote push token.
  } else {
    console.log('Must use physical device for Push Notifications');
  }
}

export async function scheduleDailyReminders(breakfastTime: Date, lunchTime: Date, dinnerTime: Date) {
  if (!Notifications) {
    console.log('Push notifications are not supported in Expo Go on Android or Web.');
    return;
  }
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // Breakfast reminder (9:00 AM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 Time for Breakfast!',
      body: 'Start your day right. Log your breakfast to stay on track!',
      sound: true,
    },
    trigger: {
      hour: breakfastTime.getHours(),
      minute: breakfastTime.getMinutes(),
      repeats: true,
    } as any,
  });

  // Lunch reminder (1:30 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🥗 Lunch Time!',
      body: 'Keep the momentum going. What did you have for lunch?',
      sound: true,
    },
    trigger: {
      hour: lunchTime.getHours(),
      minute: lunchTime.getMinutes(),
      repeats: true,
    } as any,
  });

  // Dinner reminder (7:30 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ Dinner Time!',
      body: 'Finish strong! Log your dinner and check your daily macros.',
      sound: true,
    },
    trigger: {
      hour: dinnerTime.getHours(),
      minute: dinnerTime.getMinutes(),
      repeats: true,
    } as any,
  });
}

export async function cancelAllReminders() {
  if (!Notifications) return;
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
