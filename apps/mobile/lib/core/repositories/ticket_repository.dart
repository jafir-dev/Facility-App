import 'package:dio/dio.dart';
import 'package:dartz/dartz.dart';
import '../../models/ticket.dart';
import '../../models/failure.dart';
import 'auth_repository.dart';

class TicketRepository {
  final Dio _dio;
  final AuthRepository _authRepository;

  TicketRepository(this._dio, this._authRepository);

  Future<Either<Failure, Ticket>> createTicket({
    required String title,
    required String description,
    required String propertyId,
    String? imagePath,
  }) async {
    try {
      final token = await _authRepository.getToken();

      FormData formData = FormData.fromMap({
        'title': title,
        'description': description,
        'propertyId': propertyId,
        if (imagePath != null)
          'file': await MultipartFile.fromFile(
            imagePath,
            filename: imagePath.split('/').last,
          ),
      });

      final response = await _dio.post(
        '/tickets',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return Right(Ticket.fromJson(response.data));
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to create ticket',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, List<Ticket>>> getMyTickets({
    int page = 1,
    int limit = 20,
    String? status,
    String? priority,
  }) async {
    try {
      final token = await _authRepository.getToken();

      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (status != null) {
        queryParams['status'] = status;
      }

      if (priority != null) {
        queryParams['priority'] = priority;
      }

      final response = await _dio.get(
        '/tickets/my',
        queryParameters: queryParams,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      final tickets = (response.data['tickets'] as List)
          .map((ticket) => Ticket.fromJson(ticket))
          .toList();

      return Right(tickets);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to fetch tickets',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, Ticket>> getTicketById(String id) async {
    try {
      final token = await _authRepository.getToken();

      final response = await _dio.get(
        '/tickets/$id',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return Right(Ticket.fromJson(response.data));
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to fetch ticket',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, Ticket>> updateTicket({
    required String id,
    String? title,
    String? description,
    TicketStatus? status,
  }) async {
    try {
      final token = await _authRepository.getToken();

      final Map<String, dynamic> data = {};
      if (title != null) data['title'] = title;
      if (description != null) data['description'] = description;
      if (status != null) data['status'] = status.name;

      final response = await _dio.put(
        '/tickets/$id',
        data: data,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return Right(Ticket.fromJson(response.data));
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to update ticket',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, List<Ticket>>> getTicketsByProperty(String propertyId) async {
    try {
      final token = await _authRepository.getToken();

      final response = await _dio.get(
        '/tickets/property/$propertyId',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      final tickets = (response.data as List)
          .map((ticket) => Ticket.fromJson(ticket))
          .toList();

      return Right(tickets);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to fetch tickets',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, void>> deleteTicket(String id) async {
    try {
      final token = await _authRepository.getToken();

      await _dio.delete(
        '/tickets/$id',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return const Right(null);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to delete ticket',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, List<Ticket>>> getTicketsByStatus(TicketStatus status) async {
    try {
      final token = await _authRepository.getToken();

      final response = await _dio.get(
        '/tickets/status/${status.name}',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      final tickets = (response.data as List)
          .map((ticket) => Ticket.fromJson(ticket))
          .toList();

      return Right(tickets);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to fetch tickets',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }
}