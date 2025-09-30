import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/auth_state.dart';
import '../../../core/repositories/auth_repository.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this.authRepository) : super(const AuthState.initial()) {
    _checkAuthStatus();
  }

  final AuthRepository authRepository;

  Future<void> _checkAuthStatus() async {
    state = const AuthState.loading();

    try {
      final isAuthenticated = await authRepository.isAuthenticated();
      if (isAuthenticated) {
        final userResult = await authRepository.getCurrentUser();
        userResult.fold(
          (failure) => state = AuthState.error(failure.message),
          (user) => state = AuthState.authenticated(user),
        );
      } else {
        state = const AuthState.unauthenticated();
      }
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> signIn(String email, String password) async {
    // Input validation
    if (!_isValidEmail(email)) {
      state = const AuthState.error('Please enter a valid email address');
      return;
    }

    if (!_isValidPassword(password)) {
      state = const AuthState.error('Password must be at least 8 characters long');
      return;
    }

    state = const AuthState.loading();

    try {
      final result = await authRepository.signIn(email.trim(), password);
      result.fold(
        (failure) => state = AuthState.error(failure.message),
        (user) => state = AuthState.authenticated(user),
      );
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    // Input validation
    if (!_isValidEmail(email)) {
      state = const AuthState.error('Please enter a valid email address');
      return;
    }

    if (!_isValidPassword(password)) {
      state = const AuthState.error('Password must be at least 8 characters long');
      return;
    }

    if (firstName.trim().isEmpty || lastName.trim().isEmpty) {
      state = const AuthState.error('First name and last name are required');
      return;
    }

    state = const AuthState.loading();

    try {
      final result = await authRepository.signUp(
        email: email.trim(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber?.trim(),
      );
      result.fold(
        (failure) => state = AuthState.error(failure.message),
        (user) => state = AuthState.authenticated(user),
      );
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> signOut() async {
    try {
      await authRepository.signOut();
      state = const AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> refreshUser() async {
    if (state.status == AuthStatus.authenticated) {
      final result = await authRepository.getCurrentUser();
      result.fold(
        (failure) => state = AuthState.error(failure.message),
        (user) => state = AuthState.authenticated(user),
      );
    }
  }

  void clearError() {
    if (state.status == AuthStatus.error) {
      state = const AuthState.initial();
    }
  }

  // Validation helpers
  bool _isValidEmail(String email) {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(email);
  }

  bool _isValidPassword(String password) {
    return password.length >= 8;
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  throw UnimplementedError('AuthRepository must be initialized');
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});