class LocationData {
  final double latitude;
  final double longitude;
  final DateTime? timestamp;

  LocationData({
    required this.latitude,
    required this.longitude,
    this.timestamp,
  });

  factory LocationData.fromJson(Map<String, dynamic> json) {
    return LocationData(
      latitude: json['latitude'],
      longitude: json['longitude'],
      timestamp: json['timestamp'] != null ? DateTime.parse(json['timestamp']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'timestamp': timestamp?.toIso8601String(),
    };
  }
}