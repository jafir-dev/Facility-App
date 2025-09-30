// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

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
}
