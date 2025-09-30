import 'package:workmanager/workmanager.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'location_service.dart';
import '../../models/location.dart';

class BackgroundLocationService {
  static const String locationUpdateTask = 'locationUpdateTask';

  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: true,
    );

    final hasPermission = await Permission.locationAlways.isGranted;
    if (!hasPermission) {
      await Permission.locationAlways.request();
    }

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
          await _sendLocationToBackend(location);
        }

        return Future.value(true);
      } catch (e) {
        // Error in background location task - will be retried by Workmanager
        return Future.value(false);
      }
    });
  }

  static Future<void> _sendLocationToBackend(LocationData location) async {
    // TODO: Implement sending location to backend API
    // Send location data to server for technician tracking
  }

  Future<void> stopBackgroundUpdates() async {
    await Workmanager().cancelByUniqueName('location-task-1');
  }
}