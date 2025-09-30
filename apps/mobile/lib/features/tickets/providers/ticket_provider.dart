import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dartz/dartz.dart';
import '../../../../models/failure.dart';
import '../../../../models/ticket.dart';
import '../../../../core/repositories/ticket_repository.dart';

class PaginatedTickets {
  final List<Ticket> tickets;
  final int currentPage;
  final int totalPages;
  final int totalItems;
  final bool hasMore;

  PaginatedTickets({
    required this.tickets,
    required this.currentPage,
    required this.totalPages,
    required this.totalItems,
    required this.hasMore,
  });
}

class TicketNotifier extends StateNotifier<AsyncValue<PaginatedTickets>> {
  TicketNotifier(this.ticketRepository) : super(const AsyncValue.loading()) {
    loadTickets();
  }

  final TicketRepository ticketRepository;
  int _currentPage = 1;
  final int _pageSize = 20;
  bool _isLoadingMore = false;
  List<Ticket> _allTickets = [];

  Future<void> loadTickets({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _allTickets = [];
      state = const AsyncValue.loading();
    }

    try {
      final result = await ticketRepository.getMyTickets(
        page: page,
        limit: _pageSize,
      );

      result.fold(
        (failure) => state = AsyncValue.error(failure, StackTrace.current),
        (tickets) {
          if (refresh || page == 1) {
            _allTickets = tickets;
          } else {
            _allTickets.addAll(tickets);
          }

          final paginatedTickets = PaginatedTickets(
            tickets: _allTickets,
            currentPage: page,
            totalPages: (_allTickets.length / _pageSize).ceil(),
            totalItems: _allTickets.length,
            hasMore: tickets.length >= _pageSize,
          );

          state = AsyncValue.data(paginatedTickets);
        },
      );
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refreshTickets() async {
    await loadTickets(refresh: true);
  }

  Future<void> loadMoreTickets() async {
    if (_isLoadingMore || (state.value?.hasMore == false)) return;

    _isLoadingMore = true;
    try {
      final nextPage = _currentPage + 1;
      final result = await ticketRepository.getMyTickets(
        page: nextPage,
        limit: _pageSize,
      );

      result.fold(
        (failure) => state = AsyncValue.error(failure, StackTrace.current),
        (tickets) {
          _allTickets.addAll(tickets);
          _currentPage = nextPage;

          final paginatedTickets = PaginatedTickets(
            tickets: _allTickets,
            currentPage: _currentPage,
            totalPages: (_allTickets.length / _pageSize).ceil(),
            totalItems: _allTickets.length,
            hasMore: tickets.length >= _pageSize,
          );

          state = AsyncValue.data(paginatedTickets);
        },
      );
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> addTicket(Ticket ticket) async {
    _allTickets.insert(0, ticket);
    _updateState();
  }

  Future<void> updateTicket(Ticket updatedTicket) async {
    _allTickets = _allTickets
        .map((ticket) => ticket.id == updatedTicket.id ? updatedTicket : ticket)
        .toList();
    _updateState();
  }

  void _updateState() {
    final paginatedTickets = PaginatedTickets(
      tickets: _allTickets,
      currentPage: _currentPage,
      totalPages: (_allTickets.length / _pageSize).ceil(),
      totalItems: _allTickets.length,
      hasMore: _allTickets.length >= _pageSize * _currentPage,
    );

    state = AsyncValue.data(paginatedTickets);
  }

  Future<void> removeTicket(String ticketId) async {
    _allTickets = _allTickets.where((ticket) => ticket.id != ticketId).toList();
    _updateState();
  }

  Future<Either<Failure, Ticket>> createTicket(Ticket ticket) async {
    try {
      final result = await ticketRepository.createTicket(
        title: ticket.title,
        description: ticket.description,
        propertyId: ticket.propertyId,
        imagePath: ticket.mediaUrls?.first,
      );
      result.fold(
        (failure) {
          return Left(failure);
        },
        (createdTicket) {
          addTicket(createdTicket);
          return Right(createdTicket);
        },
      );
      return result;
    } catch (e) {
      return Left(Failure(e.toString()));
    }
  }
}

final ticketRepositoryProvider = Provider<TicketRepository>((ref) {
  throw UnimplementedError('TicketRepository must be initialized');
});

final myTicketsProvider = StateNotifierProvider<TicketNotifier, AsyncValue<PaginatedTickets>>((ref) {
  final ticketRepository = ref.watch(ticketRepositoryProvider);
  return TicketNotifier(ticketRepository);
});

final selectedTicketProvider = StateProvider<Ticket?>((ref) => null);