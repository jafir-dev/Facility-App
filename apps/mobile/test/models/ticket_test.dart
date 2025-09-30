import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/ticket.dart';

void main() {
  group('Ticket Model Tests', () {
    test('Ticket.fromJson creates correct Ticket object', () {
      final json = {
        'id': 'ticket-123',
        'title': 'Leaking faucet',
        'description': 'The kitchen faucet is leaking and needs to be fixed',
        'status': 'new_',
        'propertyId': 'prop-456',
        'propertyName': 'Apartment 101',
        'createdAt': '2024-01-15T10:30:00.000Z',
        'updatedAt': '2024-01-15T11:00:00.000Z',
        'mediaUrls': ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      final ticket = Ticket.fromJson(json);

      expect(ticket.id, 'ticket-123');
      expect(ticket.title, 'Leaking faucet');
      expect(ticket.description, 'The kitchen faucet is leaking and needs to be fixed');
      expect(ticket.status, TicketStatus.new_);
      expect(ticket.propertyId, 'prop-456');
      expect(ticket.propertyName, 'Apartment 101');
      expect(ticket.createdAt, DateTime.parse('2024-01-15T10:30:00.000Z'));
      expect(ticket.updatedAt, DateTime.parse('2024-01-15T11:00:00.000Z'));
      expect(ticket.mediaUrls, ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']);
    });

    test('Ticket.toJson creates correct JSON map', () {
      final ticket = Ticket(
        id: 'ticket-123',
        title: 'Leaking faucet',
        description: 'The kitchen faucet is leaking and needs to be fixed',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        updatedAt: DateTime.parse('2024-01-15T11:00:00.000Z'),
        mediaUrls: ['https://example.com/image1.jpg'],
      );

      final json = ticket.toJson();

      expect(json['id'], 'ticket-123');
      expect(json['title'], 'Leaking faucet');
      expect(json['description'], 'The kitchen faucet is leaking and needs to be fixed');
      expect(json['status'], 'new_');
      expect(json['propertyId'], 'prop-456');
      expect(json['propertyName'], 'Apartment 101');
      expect(json['createdAt'], '2024-01-15T10:30:00.000Z');
      expect(json['updatedAt'], '2024-01-15T11:00:00.000Z');
      expect(json['mediaUrls'], ['https://example.com/image1.jpg']);
    });

    test('TicketStatus fromString returns correct status', () {
      expect(TicketStatus.fromString('new_'), TicketStatus.new_);
      expect(TicketStatus.fromString('assigned'), TicketStatus.assigned);
      expect(TicketStatus.fromString('inProgress'), TicketStatus.inProgress);
      expect(TicketStatus.fromString('pendingQuoteApproval'), TicketStatus.pendingQuoteApproval);
      expect(TicketStatus.fromString('approved'), TicketStatus.approved);
      expect(TicketStatus.fromString('completed'), TicketStatus.completed);
      expect(TicketStatus.fromString('declined'), TicketStatus.declined);
      expect(TicketStatus.fromString('invalid'), TicketStatus.new_); // Default
    });

    test('Ticket copyWith creates new Ticket with updated values', () {
      final originalTicket = Ticket(
        id: 'ticket-123',
        title: 'Leaking faucet',
        description: 'The kitchen faucet is leaking and needs to be fixed',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
      );

      final updatedTicket = originalTicket.copyWith(
        title: 'Updated title',
        status: TicketStatus.assigned,
      );

      expect(updatedTicket.id, originalTicket.id);
      expect(updatedTicket.title, 'Updated title');
      expect(updatedTicket.description, originalTicket.description);
      expect(updatedTicket.status, TicketStatus.assigned);
      expect(updatedTicket.propertyId, originalTicket.propertyId);
      expect(updatedTicket.propertyName, originalTicket.propertyName);
      expect(updatedTicket.createdAt, originalTicket.createdAt);
    });

    test('Ticket equality works correctly', () {
      final ticket1 = Ticket(
        id: 'ticket-123',
        title: 'Leaking faucet',
        description: 'The kitchen faucet is leaking and needs to be fixed',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
      );

      final ticket2 = Ticket(
        id: 'ticket-123',
        title: 'Leaking faucet',
        description: 'The kitchen faucet is leaking and needs to be fixed',
        status: TicketStatus.new_,
        propertyId: 'prop-456',
        propertyName: 'Apartment 101',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
      );

      final ticket3 = Ticket(
        id: 'ticket-456',
        title: 'Different ticket',
        description: 'Different description',
        status: TicketStatus.assigned,
        propertyId: 'prop-789',
        propertyName: 'Apartment 202',
        createdAt: DateTime.parse('2024-01-16T10:30:00.000Z'),
      );

      expect(ticket1 == ticket2, isTrue);
      expect(ticket1 == ticket3, isFalse);
    });
  });
}