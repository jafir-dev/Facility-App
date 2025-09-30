import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/user.dart';

void main() {
  group('User Model Tests', () {
    test('User.fromJson creates correct User object', () {
      final json = {
        'id': 'user-123',
        'email': 'john.doe@example.com',
        'firstName': 'John',
        'lastName': 'Doe',
        'phoneNumber': '+1234567890',
        'profileImageUrl': 'https://example.com/profile.jpg',
        'propertyIds': ['prop-1', 'prop-2'],
        'createdAt': '2024-01-15T10:30:00.000Z',
        'updatedAt': '2024-01-16T11:00:00.000Z',
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'john.doe@example.com');
      expect(user.firstName, 'John');
      expect(user.lastName, 'Doe');
      expect(user.phoneNumber, '+1234567890');
      expect(user.profileImageUrl, 'https://example.com/profile.jpg');
      expect(user.propertyIds, ['prop-1', 'prop-2']);
      expect(user.createdAt, DateTime.parse('2024-01-15T10:30:00.000Z'));
      expect(user.updatedAt, DateTime.parse('2024-01-16T11:00:00.000Z'));
    });

    test('User.fromJson handles optional fields', () {
      final json = {
        'id': 'user-123',
        'email': 'jane.smith@example.com',
        'firstName': 'Jane',
        'lastName': 'Smith',
        'propertyIds': [],
        'createdAt': '2024-01-15T10:30:00.000Z',
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'jane.smith@example.com');
      expect(user.firstName, 'Jane');
      expect(user.lastName, 'Smith');
      expect(user.phoneNumber, isNull);
      expect(user.profileImageUrl, isNull);
      expect(user.propertyIds, isEmpty);
      expect(user.createdAt, DateTime.parse('2024-01-15T10:30:00.000Z'));
      expect(user.updatedAt, isNull);
    });

    test('User.fullName returns correct full name', () {
      final user = User(
        id: 'user-123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        propertyIds: [],
        createdAt: DateTime.now(),
      );

      expect(user.fullName, 'John Doe');
    });

    test('User.copyWith creates new User with updated values', () {
      final originalUser = User(
        id: 'user-123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        propertyIds: ['prop-1'],
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
      );

      final updatedUser = originalUser.copyWith(
        email: 'john.new@example.com',
        firstName: 'Jonathan',
      );

      expect(updatedUser.id, originalUser.id);
      expect(updatedUser.email, 'john.new@example.com');
      expect(updatedUser.firstName, 'Jonathan');
      expect(updatedUser.lastName, originalUser.lastName);
      expect(updatedUser.propertyIds, originalUser.propertyIds);
      expect(updatedUser.createdAt, originalUser.createdAt);
    });

    test('User equality works correctly', () {
      final createdAt = DateTime.parse('2024-01-15T10:30:00.000Z');
      final propertyIds = ['prop-1'];
      final user1 = User(
        id: 'user-123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        propertyIds: propertyIds,
        createdAt: createdAt,
      );

      final user2 = User(
        id: 'user-123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        propertyIds: propertyIds,
        createdAt: createdAt,
      );

      final user3 = User(
        id: 'user-456',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        propertyIds: ['prop-2'],
        createdAt: DateTime.parse('2024-01-16T10:30:00.000Z'),
      );

      expect(user1 == user2, isTrue);
      expect(user1 == user3, isFalse);
    });

    test('User.fromString creates User from JSON string', () {
      final jsonString = '{"id":"user-123","email":"john.doe@example.com","firstName":"John","lastName":"Doe","propertyIds":[],"createdAt":"2024-01-15T10:30:00.000Z"}';

      final user = User.fromString(jsonString);

      expect(user.id, 'user-123');
      expect(user.email, 'john.doe@example.com');
      expect(user.firstName, 'John');
      expect(user.lastName, 'Doe');
      expect(user.propertyIds, isEmpty);
      expect(user.createdAt, DateTime.parse('2024-01-15T10:30:00.000Z'));
    });
  });
}