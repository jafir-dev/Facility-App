import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../models/user.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage;

  AuthNotifier(this._storage) : super(AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // TODO: Implement actual API call
      await Future.delayed(const Duration(seconds: 2));

      final user = User(
        id: '1',
        email: email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'technician',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await _storage.write(key: 'auth_token', value: 'fake_token');
      await _storage.write(key: 'user_data', value: user.toJson().toString());

      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
    await _storage.delete(key: 'user_data');
    state = state.copyWith(user: null);
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);

    try {
      final token = await _storage.read(key: 'auth_token');
      final userData = await _storage.read(key: 'user_data');

      if (token != null && userData != null) {
        // TODO: Parse user data properly
        state = state.copyWith(isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(FlutterSecureStorage());
});