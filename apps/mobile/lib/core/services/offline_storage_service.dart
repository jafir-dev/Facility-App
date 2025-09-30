import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class OfflineStorageService {
  static final OfflineStorageService _instance = OfflineStorageService._internal();
  factory OfflineStorageService() => _instance;
  OfflineStorageService._internal();

  late Directory _appDocumentsDirectory;

  Future<void> initialize() async {
    _appDocumentsDirectory = await getApplicationDocumentsDirectory();
  }

  Future<File> _getOfflineTicketsFile() async {
    return File(path.join(_appDocumentsDirectory.path, 'offline_tickets.json'));
  }

  Future<List<Map<String, dynamic>>> getOfflineTickets() async {
    try {
      final file = await _getOfflineTicketsFile();
      if (!await file.exists()) {
        return [];
      }

      final content = await file.readAsString();
      final List<dynamic> jsonList = jsonDecode(content);
      return jsonList.cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  Future<void> saveOfflineTicket({
    required String title,
    required String description,
    required String propertyId,
    String? imagePath,
    required DateTime createdAt,
  }) async {
    try {
      final offlineTickets = await getOfflineTickets();

      final ticketData = {
        'id': 'offline_${DateTime.now().millisecondsSinceEpoch}',
        'title': title,
        'description': description,
        'propertyId': propertyId,
        'imagePath': imagePath,
        'createdAt': createdAt.toIso8601String(),
        'status': 'pending_sync',
      };

      offlineTickets.add(ticketData);

      await _saveOfflineTickets(offlineTickets);
    } catch (e) {
      throw Exception('Failed to save offline ticket: $e');
    }
  }

  Future<void> _saveOfflineTickets(List<Map<String, dynamic>> tickets) async {
    try {
      final file = await _getOfflineTicketsFile();
      await file.writeAsString(jsonEncode(tickets));
    } catch (e) {
      throw Exception('Failed to save offline tickets: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getPendingSyncTickets() async {
    final offlineTickets = await getOfflineTickets();
    return offlineTickets
        .where((ticket) => ticket['status'] == 'pending_sync')
        .toList();
  }

  Future<void> markTicketAsSynced(String ticketId) async {
    try {
      final offlineTickets = await getOfflineTickets();

      for (int i = 0; i < offlineTickets.length; i++) {
        if (offlineTickets[i]['id'] == ticketId) {
          offlineTickets[i]['status'] = 'synced';
          offlineTickets[i]['syncedAt'] = DateTime.now().toIso8601String();
          break;
        }
      }

      await _saveOfflineTickets(offlineTickets);
    } catch (e) {
      throw Exception('Failed to mark ticket as synced: $e');
    }
  }

  Future<void> removeOfflineTicket(String ticketId) async {
    try {
      final offlineTickets = await getOfflineTickets();
      offlineTickets.removeWhere((ticket) => ticket['id'] == ticketId);
      await _saveOfflineTickets(offlineTickets);
    } catch (e) {
      throw Exception('Failed to remove offline ticket: $e');
    }
  }

  Future<void> clearSyncedTickets() async {
    try {
      final offlineTickets = await getOfflineTickets();
      offlineTickets.removeWhere((ticket) => ticket['status'] == 'synced');
      await _saveOfflineTickets(offlineTickets);
    } catch (e) {
      throw Exception('Failed to clear synced tickets: $e');
    }
  }

  Future<int> getPendingSyncCount() async {
    final pendingTickets = await getPendingSyncTickets();
    return pendingTickets.length;
  }

  Future<File?> copyImageToOfflineStorage(String imagePath) async {
    try {
      final originalFile = File(imagePath);
      if (!await originalFile.exists()) {
        return null;
      }

      final offlineImagesDir = Directory(
        path.join(_appDocumentsDirectory.path, 'offline_images'),
      );

      if (!await offlineImagesDir.exists()) {
        await offlineImagesDir.create(recursive: true);
      }

      final fileName = 'offline_${DateTime.now().millisecondsSinceEpoch}_${path.basename(imagePath)}';
      final offlineFile = File(path.join(offlineImagesDir.path, fileName));

      await originalFile.copy(offlineFile.path);
      return offlineFile;
    } catch (e) {
      throw Exception('Failed to copy image to offline storage: $e');
    }
  }

  Future<void> deleteOfflineImage(String imagePath) async {
    try {
      final file = File(imagePath);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      // Log error but don't throw as this is not critical
      print('Failed to delete offline image: $e');
    }
  }

  Future<void> cleanupOldImages() async {
    try {
      final offlineImagesDir = Directory(
        path.join(_appDocumentsDirectory.path, 'offline_images'),
      );

      if (!await offlineImagesDir.exists()) {
        return;
      }

      final files = await offlineImagesDir.list().toList();
      final now = DateTime.now();

      for (final file in files) {
        if (file is File) {
          final stat = await file.stat();
          final age = now.difference(stat.modified);

          // Delete images older than 7 days
          if (age.inDays > 7) {
            await file.delete();
          }
        }
      }
    } catch (e) {
      print('Failed to cleanup old images: $e');
    }
  }
}