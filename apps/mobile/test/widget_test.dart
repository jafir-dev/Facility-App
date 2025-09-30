// This is a basic Flutter widget test for the Facility App
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App should initialize with ProviderScope', (WidgetTester tester) async {
    // Build our app with ProviderScope for Riverpod
    await tester.pumpWidget(
      const ProviderScope(
        child: MyApp(),
      ),
    );

    // Verify that the app builds without ProviderScope errors
    expect(find.byType(MaterialApp), findsOneWidget);
  });

  testWidgets('SplashScreen displays correctly', (WidgetTester tester) async {
    // Build just the SplashScreen widget
    await tester.pumpWidget(
      MaterialApp(
        home: SplashScreen(),
      ),
    );

    // Verify that splash screen elements are displayed
    expect(find.text('Zariya Technician'), findsOneWidget);
    expect(find.byIcon(Icons.build), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}