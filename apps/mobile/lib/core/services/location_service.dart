import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geocoding/geocoding.dart';
import '../../models/location.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  Future<bool> _checkPermission() async {
    final permission = await Permission.location.request();
    return permission == PermissionStatus.granted;
  }

  Future<LocationData?> getCurrentLocation() async {
    try {
      if (!await _checkPermission()) {
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return LocationData(
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: position.timestamp,
      );
    } catch (e) {
      // Location access error - handle gracefully
      return null;
    }
  }

  Future<String?> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        final address = [
          placemark.street,
          placemark.locality,
          placemark.postalCode,
        ].where((part) => part != null && part.isNotEmpty).join(', ');
        return address.isNotEmpty ? address : null;
      }
    } catch (e) {
      // Address lookup error - handle gracefully
    }
    return null;
  }

  Stream<LocationData> getLocationStream() {
    return Geolocator.getPositionStream(
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

  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  Future<LocationData?> getLastKnownLocation() async {
    try {
      if (!await _checkPermission()) {
        return null;
      }

      final position = await Geolocator.getLastKnownPosition();
      if (position != null) {
        return LocationData(
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.timestamp,
        );
      }
    } catch (e) {
      // Last known location access error - handle gracefully
    }
    return null;
  }
}