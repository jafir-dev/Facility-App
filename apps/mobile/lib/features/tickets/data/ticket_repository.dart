import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/ticket.dart';

class TicketRepository {
  final Dio _dio;
  static const int _maxRetries = 3;
  static const Duration _baseDelay = Duration(seconds: 1);

  TicketRepository(this._dio);

  Future<T> _retryWithExponentialBackoff<T>(
    Future<T> Function() operation,
  ) async {
    for (int attempt = 0; attempt < _maxRetries; attempt++) {
      try {
        return await operation();
      } catch (e) {
        if (attempt == _maxRetries - 1) {
          rethrow; // Last attempt, rethrow the error
        }

        // Exponential backoff with jitter
        final delay = _baseDelay * (1 << attempt) +
                     Duration(milliseconds: (100 * attempt).clamp(0, 500));
        await Future.delayed(delay);
      }
    }
    throw Exception('Operation failed after $_maxRetries attempts');
  }

  Future<List<Ticket>> getAssignedTickets(String technicianId) async {
    return _retryWithExponentialBackoff(() async {
      final response = await _dio.get('/api/tickets/assigned/$technicianId');

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => Ticket.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load tickets');
      }
    });
  }

  Future<Ticket> getTicketById(String ticketId) async {
    return _retryWithExponentialBackoff(() async {
      final response = await _dio.get('/api/tickets/$ticketId');

      if (response.statusCode == 200) {
        return Ticket.fromJson(response.data);
      } else {
        throw Exception('Failed to load ticket');
      }
    });
  }

  Future<void> updateTicketStatus({
    required String ticketId,
    required String status,
  }) async {
    return _retryWithExponentialBackoff(() async {
      final response = await _dio.patch(
        '/api/tickets/$ticketId/status',
        data: {'status': status},
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update ticket status');
      }
    });
  }

  Future<void> uploadMedia({
    required String ticketId,
    required String filePath,
    required String context,
  }) async {
    return _retryWithExponentialBackoff(() async {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        'context': context,
      });

      final response = await _dio.post(
        '/api/tickets/$ticketId/media',
        data: formData,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to upload media');
      }
    });
  }
}

final ticketRepositoryProvider = Provider<TicketRepository>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.zariya.app',
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
  ));

  return TicketRepository(dio);
});