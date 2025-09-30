import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/ticket.dart';
import 'package:mobile/features/tickets/presentation/widgets/ticket_card.dart';

void main() {
  group('TicketCard Widget Tests', () {
    testWidgets('TicketCard displays ticket information correctly', (WidgetTester tester) async {
      final ticket = Ticket(
        id: 'ticket-123',
        title: 'Leaking faucet',
        description: 'The kitchen faucet is leaking and needs to be fixed',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        mediaUrls: ['https://example.com/image1.jpg'],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TicketCard(
              ticket: ticket,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Leaking faucet'), findsOneWidget);
      expect(find.text('The kitchen faucet is leaking and needs to be fixed'), findsOneWidget);
      expect(find.text('Apartment 101'), findsOneWidget);
      expect(find.text('1 photo'), findsOneWidget);
      expect(find.text('New'), findsOneWidget);
    });

    testWidgets('TicketCard calls onTap when tapped', (WidgetTester tester) async {
      var tapCount = 0;

      final ticket = Ticket(
        id: 'ticket-123',
        title: 'Test ticket',
        description: 'Test description',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Test Property',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TicketCard(
              ticket: ticket,
              onTap: () {
                tapCount++;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.byType(InkWell));
      await tester.pump();

      expect(tapCount, 1);
    });

    testWidgets('TicketCard displays different status badges correctly', (WidgetTester tester) async {
      final statuses = [
        TicketStatus.new_,
        TicketStatus.assigned,
        TicketStatus.inProgress,
        TicketStatus.completed,
      ];

      for (final status in statuses) {
        final ticket = Ticket(
          id: 'ticket-${status.name}',
          title: 'Test ticket',
          description: 'Test description',
          status: status,
          propertyId: 'prop-456',
          propertyName: 'Test Property',
          createdAt: DateTime.now(),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TicketCard(
                ticket: ticket,
                onTap: () {},
              ),
            ),
          ),
        );

        expect(find.text(status.displayName), findsOneWidget);
      }
    });

    testWidgets('TicketCard handles long descriptions with truncation', (WidgetTester tester) async {
      final longDescription = 'This is a very long description that should be truncated when displayed in the ticket card. It contains multiple sentences and should be properly handled by the Text widget with maxLines property.';

      final ticket = Ticket(
        id: 'ticket-123',
        title: 'Long description ticket',
        description: longDescription,
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TicketCard(
              ticket: ticket,
              onTap: () {},
            ),
          ),
        ),
      );

      final textFinder = find.text(longDescription);
      expect(textFinder, findsOneWidget);

      final textWidget = tester.widget<Text>(textFinder);
      expect(textWidget.maxLines, 2);
      expect(textWidget.overflow, TextOverflow.ellipsis);
    });

    testWidgets('TicketCard displays date in correct format', (WidgetTester tester) async {
      final testDate = DateTime.parse('2024-01-15T10:30:00.000Z');

      final ticket = Ticket(
        id: 'ticket-123',
        title: 'Date test ticket',
        description: 'Testing date display',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: testDate,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TicketCard(
              ticket: ticket,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Jan 15, 2024'), findsOneWidget);
    });
  });
}