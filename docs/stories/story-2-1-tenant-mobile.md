# Story: Tenant Mobile App - Core Features

**Story ID**: Story 2-1
**Branch**: `feature/story-2-1`
**Dependencies**: Stories 1-1, 1-2, 1-3, 1-4
**Parallel-safe**: true
**Module**: Mobile tenant application
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** Tenant, **I want** to create a new maintenance ticket with a description and a single photo, **so that** I can report a property issue.

## Acceptance Criteria
1. A logged-in Tenant can access a "New Ticket" form
2. The form allows for a text description and one photo upload
3. A new ticket is created in the database with a "New" status
4. The Tenant can view a list of their submitted tickets
5. The Tenant can view ticket details and status updates
6. Push notifications for ticket status changes
7. Offline support for ticket creation

## Technical Implementation Details

### App Structure

```
apps/mobile/lib/
├── features/
│   ├── auth/
│   ├── tickets/
│   ├── properties/
│   └── profile/
├── core/
│   ├── services/
│   ├── repositories/
│   └── widgets/
├── models/
└── main.dart
```

### Core Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.4.9
  flutter_secure_storage: ^9.0.0
  dio: ^5.3.2
  flutter_bloc: ^8.1.3
  equatable: ^2.0.5
  image_picker: ^1.0.4
  intl: ^0.18.1
  flutter_local_notifications: ^16.1.0
  firebase_messaging: ^14.6.4
  connectivity_plus: ^5.0.1
  cached_network_image: ^3.3.0
```

### Authentication State Management

```dart
// apps/mobile/lib/features/auth/auth_provider.dart
class AuthProvider extends StateNotifier<AuthState> {
  AuthProvider(this.authRepository) : super(const AuthState.initial());

  final AuthRepository authRepository;

  Future<void> signIn(String email, String password) async {
    state = const AuthState.loading();
    final result = await authRepository.signIn(email, password);
    state = result.fold(
      (failure) => AuthState.error(failure.message),
      (user) => AuthState.authenticated(user),
    );
  }

  Future<void> signOut() async {
    await authRepository.signOut();
    state = const AuthState.unauthenticated();
  }
}
```

### Ticket Creation Form

```dart
// apps/mobile/lib/features/tickets/presentation/create_ticket_page.dart
class CreateTicketPage extends ConsumerStatefulWidget {
  const CreateTicketPage({super.key});

  @override
  ConsumerState<CreateTicketPage> createState() => _CreateTicketPageState();
}

class _CreateTicketPageState extends ConsumerState<CreateTicketPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  File? _selectedImage;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera);

    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final ticketRepository = ref.read(ticketRepositoryProvider);

      await ticketRepository.createTicket(
        title: _titleController.text,
        description: _descriptionController.text,
        propertyId: ref.watch(selectedPropertyProvider)!.id,
        imageFile: _selectedImage,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket created successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Maintenance Request'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 5,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a description';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            if (_selectedImage != null)
              Column(
                children: [
                  const Text('Selected Image:'),
                  const SizedBox(height: 8),
                  Image.file(
                    _selectedImage!,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedImage = null;
                      });
                    },
                    child: const Text('Remove Image'),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _pickImage,
              child: const Text('Add Photo'),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _submitTicket,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Submit Ticket'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Ticket Repository

```dart
// apps/mobile/lib/core/repositories/ticket_repository.dart
class TicketRepository {
  final Dio _dio;
  final AuthRepository _authRepository;

  TicketRepository(this._dio, this._authRepository);

  Future<Either<Failure, Ticket>> createTicket({
    required String title,
    required String description,
    required String propertyId,
    File? imageFile,
  }) async {
    try {
      final token = await _authRepository.getToken();

      FormData formData = FormData.fromMap({
        'title': title,
        'description': description,
        'propertyId': propertyId,
        if (imageFile != null)
          'file': await MultipartFile.fromFile(
            imageFile.path,
            filename: imageFile.path.split('/').last,
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
      return Left(Failure(e.response?.data['message'] ?? 'Failed to create ticket'));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }

  Future<Either<Failure, List<Ticket>>> getMyTickets() async {
    try {
      final token = await _authRepository.getToken();

      final response = await _dio.get(
        '/tickets/my',
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
      return Left(Failure(e.response?.data['message'] ?? 'Failed to fetch tickets'));
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }
}
```

### Ticket List Widget

```dart
// apps/mobile/lib/features/tickets/presentation/ticket_list_page.dart
class TicketListPage extends ConsumerWidget {
  const TicketListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(myTicketsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateTicketPage(),
                ),
              );
            },
          ),
        ],
      ),
      body: ticketsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (tickets) {
          if (tickets.isEmpty) {
            return const Center(child: Text('No tickets found'));
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(myTicketsProvider.future),
            child: ListView.builder(
              itemCount: tickets.length,
              itemBuilder: (context, index) {
                final ticket = tickets[index];
                return TicketCard(ticket: ticket);
              },
            ),
          );
        },
      ),
    );
  }
}

class TicketCard extends StatelessWidget {
  final Ticket ticket;

  const TicketCard({super.key, required this.ticket});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        title: Text(ticket.title),
        subtitle: Text(ticket.description),
        trailing: TicketStatusBadge(status: ticket.status),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TicketDetailPage(ticketId: ticket.id),
            ),
          );
        },
      ),
    );
  }
}
```

### Push Notification Handler

```dart
// apps/mobile/lib/core/services/notification_service.dart
class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    } else {
      print('User declined or has not accepted permission');
    }

    // Initialize local notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestSoundPermission: false,
          requestBadgePermission: false,
          requestAlertPermission: false,
        );

    final InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _localNotifications.initialize(initializationSettings);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        _localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              'channel_id',
              'channel_name',
              channelDescription: 'channel_description',
              color: Colors.blue,
              icon: '@mipmap/ic_launcher',
            ),
            iOS: const DarwinNotificationDetails(),
          ),
        );
      }
    });

    // Get FCM token
    String? token = await _messaging.getToken();
    print('FCM Token: $token');

    // Save token to backend
    if (token != null) {
      await _saveTokenToBackend(token);
    }
  }

  Future<void> _saveTokenToBackend(String token) async {
    // Implement saving token to backend
  }
}
```

### Models

```dart
// apps/mobile/lib/models/ticket.dart
enum TicketStatus {
  new_('New'),
  assigned('Assigned'),
  inProgress('In Progress'),
  pendingQuoteApproval('Pending Quote Approval'),
  approved('Approved'),
  completed('Completed'),
  declined('Declined');

  const TicketStatus(this.displayName);
  final String displayName;
}

class Ticket {
  final String id;
  final String title;
  final String description;
  final TicketStatus status;
  final String propertyId;
  final String propertyName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<String> mediaUrls;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.propertyId,
    required this.propertyName,
    required this.createdAt,
    this.updatedAt,
    this.mediaUrls = const [],
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: TicketStatus.values.firstWhere(
        (status) => status.name == json['status'],
        orElse: () => TicketStatus.new_,
      ),
      propertyId: json['propertyId'],
      propertyName: json['propertyName'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
      mediaUrls: List<String>.from(json['mediaUrls'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.name,
      'propertyId': propertyId,
      'propertyName': propertyName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'mediaUrls': mediaUrls,
    };
  }
}
```

## Success Metrics
- ✅ Tenant can successfully create a new ticket with photo
- ✅ Ticket list displays all user's tickets
- ✅ Ticket details show accurate status and information
- ✅ Push notifications are received for status changes
- ✅ App works offline for ticket creation
- ✅ Images are uploaded and displayed correctly
- ✅ Authentication state is maintained properly
- ✅ App performs well on low-end devices

## Notes for Developers
- Use Riverpod for state management
- Implement proper error handling and user feedback
- Add loading states for all async operations
- Include proper accessibility features
- Test on both iOS and Android devices
- Implement dark mode support
- Add proper logging for debugging
- Consider adding ticket search and filtering
- Implement pull-to-refresh functionality
- Add unit and widget tests for all components