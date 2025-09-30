import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../models/user.dart';
import '../../models/failure.dart';
import 'package:dartz/dartz.dart';

class AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;

  AuthRepository(this._dio, this._secureStorage) {
    _dio.interceptors.add(AuthInterceptor(this));
  }

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user';

  Future<Either<Failure, User>> signIn(String email, String password) async {
    try {
      final response = await _dio.post(
        '/auth/signin',
        data: {
          'email': email,
          'password': password,
        },
      );

      final token = response.data['token'];
      final userJson = response.data['user'];

      await _secureStorage.write(key: _accessTokenKey, value: token);
      await _secureStorage.write(key: _userKey, value: userJson.toString());

      final user = User.fromJson(userJson);
      return Right(user);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to sign in',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, User>> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/signup',
        data: {
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
        },
      );

      final token = response.data['token'];
      final userJson = response.data['user'];

      await _secureStorage.write(key: _accessTokenKey, value: token);
      await _secureStorage.write(key: _userKey, value: userJson.toString());

      final user = User.fromJson(userJson);
      return Right(user);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to sign up',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      final token = await getToken();
      if (token == null) {
        return Left(Failure('No token found'));
      }

      final response = await _dio.get(
        '/auth/me',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      final user = User.fromJson(response.data);
      return Right(user);
    } on DioException catch (e) {
      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to get user',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<void> signOut() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<User?> getStoredUser() async {
    final userString = await _secureStorage.read(key: _userKey);
    if (userString != null) {
      try {
        return User.fromString(userString);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Future<Either<Failure, String>> refreshToken() async {
    return _refreshTokenWithRetry(maxRetries: 3);
  }

  Future<Either<Failure, String>> _refreshTokenWithRetry({
    required int maxRetries,
    int attempt = 0,
    Duration delay = const Duration(seconds: 1),
  }) async {
    try {
      final refreshToken = await getRefreshToken();
      if (refreshToken == null) {
        return Left(Failure('No refresh token found'));
      }

      final response = await _dio.post(
        '/auth/refresh',
        data: {
          'refreshToken': refreshToken,
        },
        options: Options(
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      final newToken = response.data['token'];
      final newRefreshToken = response.data['refreshToken'];

      await _secureStorage.write(key: _accessTokenKey, value: newToken);
      if (newRefreshToken != null) {
        await _secureStorage.write(key: _refreshTokenKey, value: newRefreshToken);
      }

      return Right(newToken);
    } on DioException catch (e) {
      if (attempt < maxRetries && _isRetryableError(e)) {
        await Future.delayed(delay * (attempt + 1)); // Exponential backoff
        return _refreshTokenWithRetry(
          maxRetries: maxRetries,
          attempt: attempt + 1,
          delay: delay,
        );
      }

      // If refresh token is invalid, clear stored tokens
      if (e.response?.statusCode == 401) {
        await clearTokens();
      }

      return Left(Failure(
        e.response?.data['message'] ?? 'Failed to refresh token',
        code: e.response?.statusCode?.toString(),
      ));
    } catch (e) {
      if (attempt < maxRetries) {
        await Future.delayed(delay * (attempt + 1));
        return _refreshTokenWithRetry(
          maxRetries: maxRetries,
          attempt: attempt + 1,
          delay: delay,
        );
      }
      return Left(Failure(e.toString()));
    }
  }

  bool _isRetryableError(DioException e) {
    final statusCode = e.response?.statusCode;
    // Retry on network errors and server errors (5xx)
    return statusCode == null || statusCode >= 500 ||
           e.type == DioExceptionType.connectionTimeout ||
           e.type == DioExceptionType.sendTimeout ||
           e.type == DioExceptionType.receiveTimeout;
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null;
  }
}

class AuthInterceptor extends Interceptor {
  final AuthRepository _authRepository;

  AuthInterceptor(this._authRepository);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _authRepository.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 &&
        err.requestOptions.headers['Authorization'] != null) {
      try {
        final refreshResult = await _authRepository.refreshToken();
        refreshResult.fold(
          (failure) {
            // Token refresh failed, proceed with original error
            handler.next(err);
          },
          (newToken) {
            // Token refreshed, retry original request
            final originalRequest = err.requestOptions;
            originalRequest.headers['Authorization'] = 'Bearer $newToken';
            handler.resolve(Response(
              requestOptions: originalRequest,
              data: err.response?.data,
              statusCode: err.response?.statusCode,
            ));
          },
        );
      } catch (e) {
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
}