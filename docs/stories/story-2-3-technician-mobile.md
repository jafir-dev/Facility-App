# Story: Technician Mobile App

**Story ID**: Story 2-3
**Branch**: `feature/story-2-3`
**Dependencies**: Stories 1-1, 1-2, 1-3
**Parallel-safe**: true
**Module**: Mobile technician application
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** Technician, **I want** to view my assigned tickets and mark them as complete, **so that** I can manage my workload.

## Acceptance Criteria
1. A logged-in Technician can see a list of tickets assigned to them
2. The Technician can update a ticket's status to "In Progress"
3. The Technician can update the ticket's status to "Completed"
4. The Tenant and Supervisor are notified of status changes
5. Offline support for status updates
6. Push notifications for new assignments
7. GPS location tracking for jobs
8. Media upload for work documentation

## Technical Implementation Details

### App Structure

```
apps/mobile/
├── lib/
│   ├── features/
│   │   ├── auth/
│   │   ├── tickets/
│   │   ├── location/
│   │   └── media/
│   ├── core/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── widgets/
│   ├── models/
│   └── main.dart
└── assets/
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
  geolocator: ^10.1.0
  geocoding: ^2.1.0
  permission_handler: ^11.0.1
  workmanager: ^0.5.2
  path_provider: ^2.1.1
```

### Technician Dashboard

```dart
// apps/mobile/lib/features/tickets/presentation/technician_dashboard_page.dart
class TechnicianDashboardPage extends ConsumerStatefulWidget {
  const TechnicianDashboardPage({super.key});

  @override
  ConsumerState<TechnicianDashboardPage> createState() => _TechnicianDashboardPageState();
}

class _TechnicianDashboardPageState extends ConsumerState<TechnicianDashboardPage> {
  final RefreshController _refreshController = RefreshController();

  Future<void> _onRefresh() async {
    await ref.refresh(assignedTicketsProvider.future);
    _refreshController.refreshCompleted();
  }

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(assignedTicketsProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NotificationsPage(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ProfilePage(),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildHeader(user),
          Expanded(
            child: ticketsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text('Error: $error')),
              data: (tickets) {
                if (tickets.isEmpty) {
                  return const Center(child: Text('No assigned tickets'));
                }

                return RefreshIndicator(
                  onRefresh: _onRefresh,
                  child: ListView.builder(
                    itemCount: tickets.length,
                    itemBuilder: (context, index) {
                      final ticket = tickets[index];
                      return TechnicianTicketCard(ticket: ticket);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(User? user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hello, ${user?.firstName ?? ''}!',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You have ${ref.watch(assignedTicketsProvider).value?.length ?? 0} assigned tickets',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}
```

### Technician Ticket Card

```dart
// apps/mobile/lib/features/tickets/presentation/technician_ticket_card.dart
class TechnicianTicketCard extends ConsumerWidget {
  final Ticket ticket;

  const TechnicianTicketCard({super.key, required this.ticket});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TechnicianTicketDetailPage(ticketId: ticket.id),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      ticket.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  TicketStatusBadge(status: ticket.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      ticket.propertyName,
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.person, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    ticket.tenantName,
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const Spacer(),
                  const Icon(Icons.access_time, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    _formatTime(ticket.createdAt),
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              if (ticket.priority != 'Medium') ...[
                const SizedBox(height: 8),
                TicketPriorityBadge(priority: ticket.priority),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  if (ticket.status == 'New')
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _startWork(context, ref, ticket.id),
                        child: const Text('Start Work'),
                      ),
                    )
                  else if (ticket.status == 'InProgress')
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _completeWork(context, ref, ticket.id),
                        child: const Text('Complete Work'),
                      ),
                    ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => TechnicianTicketDetailPage(ticketId: ticket.id),
                          ),
                        );
                      },
                      child: const Text('View Details'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  Future<void> _startWork(BuildContext context, WidgetRef ref, String ticketId) async {
    try {
      await ref.read(ticketRepositoryProvider).updateTicketStatus(
        ticketId: ticketId,
        status: 'InProgress',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Work started successfully!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _completeWork(BuildContext context, WidgetRef ref, String ticketId) async {
    try {
      await ref.read(ticketRepositoryProvider).updateTicketStatus(
        ticketId: ticketId,
        status: 'Completed',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Work completed successfully!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }
}
```

### Ticket Detail Page with Media Upload

```dart
// apps/mobile/lib/features/tickets/presentation/technician_ticket_detail_page.dart
class TechnicianTicketDetailPage extends ConsumerStatefulWidget {
  final String ticketId;

  const TechnicianTicketDetailPage({super.key, required this.ticketId});

  @override
  ConsumerState<TechnicianTicketDetailPage> createState() => _TechnicianTicketDetailPageState();
}

class _TechnicianTicketDetailPageState extends ConsumerState<TechnicianTicketDetailPage> {
  final List<File> _beforePhotos = [];
  final List<File> _afterPhotos = [];
  bool _isLoading = false;

  Future<void> _pickImage(BuildContext context, bool isBefore) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera);

    if (pickedFile != null) {
      setState(() {
        if (isBefore) {
          _beforePhotos.add(File(pickedFile.path));
        } else {
          _afterPhotos.add(File(pickedFile.path));
        }
      });
    }
  }

  Future<void> _uploadMedia(BuildContext context, bool isBefore) async {
    final photos = isBefore ? _beforePhotos : _afterPhotos;
    if (photos.isEmpty) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final ticketRepository = ref.read(ticketRepositoryProvider);

      for (final photo in photos) {
        await ticketRepository.uploadMedia(
          ticketId: widget.ticketId,
          file: photo,
          context: isBefore ? 'BeforeWork' : 'AfterWork',
        );
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${isBefore ? 'Before' : 'After'} photos uploaded successfully!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
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
    final ticketAsync = ref.watch(ticketDetailsProvider(widget.ticketId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket Details'),
      ),
      body: ticketAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (ticket) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTicketInfo(ticket),
              const SizedBox(height: 24),
              _buildMediaSection('Before Work Photos', _beforePhotos, true),
              const SizedBox(height: 24),
              _buildMediaSection('After Work Photos', _afterPhotos, false),
              const SizedBox(height: 24),
              _buildActionButtons(ticket),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTicketInfo(Ticket ticket) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              ticket.title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(ticket.description),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Property', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(ticket.propertyName),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
                      TicketStatusBadge(status: ticket.status),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMediaSection(String title, List<File> photos, bool isBefore) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.camera_alt),
                      onPressed: () => _pickImage(context, isBefore),
                    ),
                    if (photos.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.upload),
                        onPressed: () => _uploadMedia(context, isBefore),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (photos.isEmpty)
              const Center(
                child: Text(
                  'No photos added yet',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: photos.length,
                itemBuilder: (context, index) {
                  return Stack(
                    children: [
                      Image.file(
                        photos[index],
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              if (isBefore) {
                                _beforePhotos.removeAt(index);
                              } else {
                                _afterPhotos.removeAt(index);
                              }
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(Ticket ticket) {
    return Row(
      children: [
        if (ticket.status == 'New')
          Expanded(
            child: ElevatedButton(
              onPressed: _isLoading ? null : () => _startWork(context, ref, ticket.id),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Start Work'),
            ),
          )
        else if (ticket.status == 'InProgress')
          Expanded(
            child: ElevatedButton(
              onPressed: _isLoading ? null : () => _completeWork(context, ref, ticket.id),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Complete Work'),
            ),
          ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton(
            onPressed: () async {
              final location = await _getCurrentLocation();
              if (location != null && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Location: ${location.latitude}, ${location.longitude}')),
                );
              }
            },
            child: const Text('Get Location'),
          ),
        ),
      ],
    );
  }

  Future<Position?> _getCurrentLocation() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  Future<void> _startWork(BuildContext context, WidgetRef ref, String ticketId) async {
    try {
      await ref.read(ticketRepositoryProvider).updateTicketStatus(
        ticketId: ticketId,
        status: 'InProgress',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Work started successfully!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _completeWork(BuildContext context, WidgetRef ref, String ticketId) async {
    try {
      await ref.read(ticketRepositoryProvider).updateTicketStatus(
        ticketId: ticketId,
        status: 'Completed',
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Work completed successfully!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }
}
```

### Location Service

```dart
// apps/mobile/lib/core/services/location_service.dart
class LocationService {
  final GeolocatorPlatform _geolocator = GeolocatorPlatform.instance;

  Future<bool> _checkPermission() async {
    final permission = await Permission.location.request();
    return permission == PermissionStatus.granted;
  }

  Future<LocationData?> getCurrentLocation() async {
    try {
      if (!await _checkPermission()) {
        return null;
      }

      final position = await _geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return LocationData(
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: position.timestamp,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  Future<String?> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        return '${placemark.street}, ${placemark.locality}, ${placemark.postalCode}';
      }
    } catch (e) {
      print('Error getting address: $e');
    }
    return null;
  }

  Stream<LocationData> getLocationStream() {
    return _geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).map((position) => LocationData(
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: position.timestamp,
    ));
  }
}

class LocationData {
  final double latitude;
  final double longitude;
  final DateTime? timestamp;

  LocationData({
    required this.latitude,
    required this.longitude,
    this.timestamp,
  });
}
```

### Background Location Tracking

```dart
// apps/mobile/lib/core/services/background_location_service.dart
class BackgroundLocationService {
  static const String locationUpdateTask = 'locationUpdateTask';

  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: true,
    );

    await Workmanager().registerPeriodicTask(
      'location-task-1',
      locationUpdateTask,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresCharging: false,
      ),
    );
  }

  @pragma('vm:entry-point')
  static void callbackDispatcher() {
    Workmanager().executeTask((task, inputData) async {
      try {
        final locationService = LocationService();
        final location = await locationService.getCurrentLocation();

        if (location != null) {
          // Send location to backend
          await _sendLocationToBackend(location);
        }

        return Future.value(true);
      } catch (e) {
        print('Error in background task: $e');
        return Future.value(false);
      }
    });
  }

  static Future<void> _sendLocationToBackend(LocationData location) async {
    // Implement sending location to backend
  }
}
```

## Success Metrics
- ✅ Technician can view assigned tickets
- ✅ Status updates work correctly (New → In Progress → Completed)
- ✅ Media upload for before/after photos works
- ✅ GPS location tracking is functional
- ✅ Push notifications for new assignments
- ✅ Offline support for status updates
- ✅ Background location tracking works
- ✅ Real-time updates sync properly

## Notes for Developers
- Use Riverpod for state management
- Implement proper error handling and user feedback
- Add loading states for all async operations
- Include proper accessibility features
- Test on both iOS and Android devices
- Implement battery optimization for location tracking
- Add proper logging for debugging
- Consider adding time tracking for jobs
- Implement proper data synchronization for offline mode
- Add unit and widget tests for all components
- Consider adding map integration for job locations
- Implement proper battery usage optimization for background location