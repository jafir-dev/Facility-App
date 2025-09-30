import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Core Services
import 'core/services/notification_service.dart';
import 'core/services/offline_storage_service.dart';

// Features
import 'features/auth/auth_provider.dart';
import 'features/tickets/providers/ticket_provider.dart';
import 'features/tickets/presentation/ticket_list_page.dart';
import 'features/tickets/presentation/create_ticket_page.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/auth/presentation/signup_page.dart';

// Repositories
import 'core/repositories/auth_repository.dart';
import 'core/repositories/ticket_repository.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize services
  final notificationService = NotificationService();
  await notificationService.initialize();

  final offlineStorageService = OfflineStorageService();
  await offlineStorageService.initialize();

  // Set up Dio
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.example.com', // Replace with actual API URL
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
  ));

  final secureStorage = const FlutterSecureStorage();

  // Set up repositories
  final authRepository = AuthRepository(dio, secureStorage);
  final ticketRepository = TicketRepository(dio, authRepository);

  
  runApp(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(authRepository),
        ticketRepositoryProvider.overrideWithValue(ticketRepository),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Facility App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
          fillColor: Colors.grey[100],
        ),
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system,
      home: authState.when(
        initial: () => const SplashScreen(),
        loading: () => const SplashScreen(),
        authenticated: (user) => const MainNavigation(),
        unauthenticated: () => const LoginPage(),
        error: (errorMessage) => ErrorScreen(error: errorMessage),
      ),
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/tickets': (context) => const TicketListPage(),
        '/create-ticket': (context) => const CreateTicketPage(),
      },
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.home_repair_service,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 16),
            Text(
              'Facility App',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

class ErrorScreen extends StatelessWidget {
  final String error;

  const ErrorScreen({super.key, required this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Something went wrong',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                // Restart the app
                Navigator.pushReplacementNamed(context, '/login');
              },
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

class MainNavigation extends ConsumerStatefulWidget {
  const MainNavigation({super.key});

  @override
  ConsumerState<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends ConsumerState<MainNavigation> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const TicketListPage(),
    const Center(child: Text('Properties')),
    const Center(child: Text('Profile')),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_repair_service),
            label: 'Tickets',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.apartment),
            label: 'Properties',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
