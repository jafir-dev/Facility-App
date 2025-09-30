// This is a basic Flutter widget test for the Facility App
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('SplashScreen displays correctly', (WidgetTester tester) async {
    // Build just the SplashScreen widget
    await tester.pumpWidget(
      MaterialApp(
        home: SplashScreen(),
      ),
    );

    // Verify that splash screen elements are displayed
    expect(find.text('Facility App'), findsOneWidget);
    expect(find.byIcon(Icons.home_repair_service), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
