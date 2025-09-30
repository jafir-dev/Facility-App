import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Request notification permission
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('User granted permission for notifications');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('User granted provisional permission for notifications');
      } else {
        debugPrint('User declined or has not accepted permission for notifications');
        return;
      }

      // Initialize local notifications
      const AndroidInitializationSettings initializationSettingsAndroid =
          AndroidInitializationSettings('@mipmap/ic_launcher');

      final DarwinInitializationSettings initializationSettingsIOS =
          DarwinInitializationSettings(
        requestSoundPermission: false,
        requestBadgePermission: false,
        requestAlertPermission: false,
        onDidReceiveLocalNotification: _onDidReceiveLocalNotification,
      );

      final InitializationSettings initializationSettings = InitializationSettings(
        android: initializationSettingsAndroid,
        iOS: initializationSettingsIOS,
      );

      await _localNotifications.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse: _onNotificationResponse,
      );

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Handle notification opened from background
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

      // Get FCM token
      String? token = await _messaging.getToken();
      if (token != null) {
        debugPrint('FCM Token: $token');
        await _saveTokenToBackend(token);
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint('FCM Token refreshed: $newToken');
        _saveTokenToBackend(newToken);
      });

      _isInitialized = true;
      debugPrint('Notification service initialized successfully');
    } catch (e) {
      debugPrint('Error initializing notification service: $e');
    }
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('Got a message whilst in the foreground!');
    debugPrint('Message data: ${message.data}');

    if (message.notification != null) {
      debugPrint('Message also contained a notification: ${message.notification}');

      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        await _localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              'high_importance_channel',
              'High Importance Notifications',
              channelDescription: 'This channel is used for important notifications.',
              importance: Importance.max,
              priority: Priority.high,
              showWhen: true,
              color: Colors.blue,
              icon: '@mipmap/ic_launcher',
            ),
            iOS: const DarwinNotificationDetails(
              presentAlert: true,
              presentBadge: true,
              presentSound: true,
            ),
          ),
          payload: message.data['ticketId']?.toString() ?? '',
        );
      }
    }
  }

  Future<void> _handleMessageOpenedApp(RemoteMessage message) async {
    debugPrint('Message clicked!');
    debugPrint('Message data: ${message.data}');

    // TODO: Navigate to ticket detail page
    // if (message.data['ticketId'] != null) {
    //   final ticketId = message.data['ticketId'];
    //   // Navigate to ticket detail page
    // }
  }

  Future<void> _saveTokenToBackend(String token) async {
    // TODO: Implement saving token to backend
    debugPrint('Saving token to backend: $token');
  }

  Future<void> showTestNotification() async {
    if (!_isInitialized) {
      debugPrint('Notification service not initialized');
      return;
    }

    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'test_channel',
      'Test Notifications',
      channelDescription: 'Channel for test notifications',
      importance: Importance.max,
      priority: Priority.high,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      0,
      'Test Notification',
      'This is a test notification from the app',
      platformDetails,
    );
  }

  Future<void> _onDidReceiveLocalNotification(
    int id,
    String? title,
    String? body,
    String? payload,
  ) async {
    // Handle iOS local notification
    debugPrint('Received local notification: $title - $body');
  }

  void _onNotificationResponse(NotificationResponse notificationResponse) {
    debugPrint('Notification tapped with payload: ${notificationResponse.payload}');

    // TODO: Handle notification tap
    // if (notificationResponse.payload != null) {
    //   final ticketId = notificationResponse.payload;
    //   // Navigate to ticket detail page
    // }
  }

  static Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
    // Handle background messages
    debugPrint('Handling a background message: ${message.messageId}');
  }

  Future<String?> getToken() async {
    return await _messaging.getToken();
  }

  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
    debugPrint('Subscribed to topic: $topic');
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
    debugPrint('Unsubscribed from topic: $topic');
  }

  Future<void> deleteToken() async {
    await _messaging.deleteToken();
    debugPrint('FCM token deleted');
  }
}