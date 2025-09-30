import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dartz/dartz.dart';
import '../../models/ticket.dart';
import '../../models/failure.dart';
import '../repositories/ticket_repository.dart';
import 'offline_storage_service.dart';
import 'notification_service.dart';

class OfflineTicketService {
  final TicketRepository _ticketRepository;
  final OfflineStorageService _offlineStorage;
  final NotificationService _notificationService;

  OfflineTicketService(
    this._ticketRepository,
    this._offlineStorage,
    this._notificationService,
  );

  Future<Either<Failure, Ticket>> createTicket({
    required String title,
    required String description,
    required String propertyId,
    String? imagePath,
  }) async {
    final connectivityResult = await Connectivity().checkConnectivity();
    final hasInternet = connectivityResult != ConnectivityResult.none;

    if (hasInternet) {
      // Try to create ticket online first
      try {
        final result = await _ticketRepository.createTicket(
          title: title,
          description: description,
          propertyId: propertyId,
          imagePath: imagePath,
        );

        // Sync any pending offline tickets
        await _syncPendingTickets();

        return result;
      } catch (e) {
        // If online creation fails, fall back to offline
        return await _createTicketOffline(
          title: title,
          description: description,
          propertyId: propertyId,
          imagePath: imagePath,
        );
      }
    } else {
      // No internet - create offline ticket
      return await _createTicketOffline(
        title: title,
        description: description,
        propertyId: propertyId,
        imagePath: imagePath,
      );
    }
  }

  Future<Either<Failure, Ticket>> _createTicketOffline({
    required String title,
    required String description,
    required String propertyId,
    String? imagePath,
  }) async {
    try {
      String? offlineImagePath;
      if (imagePath != null) {
        final offlineFile = await _offlineStorage.copyImageToOfflineStorage(imagePath);
        offlineImagePath = offlineFile?.path;
      }

      await _offlineStorage.saveOfflineTicket(
        title: title,
        description: description,
        propertyId: propertyId,
        imagePath: offlineImagePath,
        createdAt: DateTime.now(),
      );

      // Create a temporary ticket object to return
      final tempTicket = Ticket(
        id: 'offline_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        description: description,
        status: TicketStatus.new_,
        propertyId: propertyId,
        propertyName: 'Unknown', // Will be updated when synced
        createdAt: DateTime.now(),
        mediaUrls: offlineImagePath != null ? [offlineImagePath] : [],
      );

      // Show notification about offline creation
      await _notificationService.showTestNotification();

      return Right(tempTicket);
    } catch (e) {
      return Left(Failure('Failed to create offline ticket: ${e.toString()}'));
    }
  }

  Future<void> syncPendingTickets() async {
    await _syncPendingTickets();
  }

  Future<void> _syncPendingTickets() async {
    try {
      final pendingTickets = await _offlineStorage.getPendingSyncTickets();

      if (pendingTickets.isEmpty) {
        return;
      }

      final connectivityResult = await Connectivity().checkConnectivity();
      final hasInternet = connectivityResult != ConnectivityResult.none;

      if (!hasInternet) {
        return;
      }

      for (final ticketData in pendingTickets) {
        try {
          final result = await _ticketRepository.createTicket(
            title: ticketData['title'],
            description: ticketData['description'],
            propertyId: ticketData['propertyId'],
            imagePath: ticketData['imagePath'],
          );

          result.fold(
            (failure) {
              // Keep ticket as pending if sync fails
              print('Failed to sync ticket ${ticketData['id']}: ${failure.message}');
            },
            (syncedTicket) {
              // Mark ticket as synced
              _offlineStorage.markTicketAsSynced(ticketData['id']);

              // Clean up offline image if it exists
              if (ticketData['imagePath'] != null) {
                _offlineStorage.deleteOfflineImage(ticketData['imagePath']);
              }

              // Show notification about successful sync
              print('Successfully synced ticket ${ticketData['id']}');
            },
          );
        } catch (e) {
          print('Error syncing ticket ${ticketData['id']}: $e');
        }
      }

      // Clean up synced tickets older than 24 hours
      await _offlineStorage.clearSyncedTickets();
    } catch (e) {
      print('Error during sync process: $e');
    }
  }

  Future<int> getPendingSyncCount() async {
    return await _offlineStorage.getPendingSyncCount();
  }

  Future<bool> hasPendingTickets() async {
    final count = await getPendingSyncCount();
    return count > 0;
  }

  Future<void> cleanupOldImages() async {
    await _offlineStorage.cleanupOldImages();
  }
}