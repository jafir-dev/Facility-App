import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../lib/features/tickets/widgets/technician_ticket_card.dart';
import '../lib/features/tickets/widgets/ticket_status_badge.dart';
import '../lib/features/tickets/widgets/ticket_priority_badge.dart';
import '../lib/models/ticket.dart';

void main() {
  group('Technician Ticket Card Widget Tests', () {
    late Ticket testTicket;

    setUp(() {
      testTicket = Ticket(
        id: 'ticket123',
        title: 'Leaky Faucet',
        description: 'Kitchen faucet is leaking',
        status: 'New',
        priority: 'Medium',
        propertyName: '123 Main St',
        tenantName: 'Jane Smith',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      );
    });

    testWidgets('should display ticket information correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TechnicianTicketCard(ticket: testTicket),
            ),
          ),
        ),
      );

      // Check if ticket title is displayed
      expect(find.text('Leaky Faucet'), findsOneWidget);

      // Check if property name is displayed
      expect(find.text('123 Main St'), findsOneWidget);

      // Check if tenant name is displayed
      expect(find.text('Jane Smith'), findsOneWidget);

      // Check if status badge is displayed
      expect(find.byType(TicketStatusBadge), findsOneWidget);

      // Check if action buttons are present for new ticket
      expect(find.text('Start Work'), findsOneWidget);
      expect(find.text('View Details'), findsOneWidget);
    });

    testWidgets('should show Complete Work button for InProgress tickets', (WidgetTester tester) async {
      final inProgressTicket = Ticket(
        id: 'ticket123',
        title: 'Leaky Faucet',
        description: 'Kitchen faucet is leaking',
        status: 'InProgress',
        priority: 'Medium',
        propertyName: '123 Main St',
        tenantName: 'Jane Smith',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TechnicianTicketCard(ticket: inProgressTicket),
            ),
          ),
        ),
      );

      expect(find.text('Complete Work'), findsOneWidget);
      expect(find.text('Start Work'), findsNothing);
    });

    testWidgets('should show priority badge for high priority tickets', (WidgetTester tester) async {
      final highPriorityTicket = Ticket(
        id: 'ticket123',
        title: 'Leaky Faucet',
        description: 'Kitchen faucet is leaking',
        status: 'New',
        priority: 'High',
        propertyName: '123 Main St',
        tenantName: 'Jane Smith',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: TechnicianTicketCard(ticket: highPriorityTicket),
            ),
          ),
        ),
      );

      expect(find.byType(TicketPriorityBadge), findsOneWidget);
    });
  });

  group('Ticket Status Badge Tests', () {
    testWidgets('should display correct status colors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                TicketStatusBadge(status: 'New'),
                TicketStatusBadge(status: 'InProgress'),
                TicketStatusBadge(status: 'Completed'),
              ],
            ),
          ),
        ),
      );

      expect(find.text('New'), findsOneWidget);
      expect(find.text('InProgress'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
    });
  });

  group('Ticket Priority Badge Tests', () {
    testWidgets('should display correct priority badges', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                TicketPriorityBadge(priority: 'Low'),
                TicketPriorityBadge(priority: 'Medium'),
                TicketPriorityBadge(priority: 'High'),
                TicketPriorityBadge(priority: 'Critical'),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Low'), findsOneWidget);
      expect(find.text('Medium'), findsOneWidget);
      expect(find.text('High'), findsOneWidget);
      expect(find.text('Critical'), findsOneWidget);
    });
  });
}