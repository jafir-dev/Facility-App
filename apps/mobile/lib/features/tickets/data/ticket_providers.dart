import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/ticket.dart';
import 'ticket_repository.dart';

final assignedTicketsProvider = FutureProvider<List<Ticket>>((ref) async {
  final repository = ref.read(ticketRepositoryProvider);
  // TODO: Get actual technician ID from auth
  return repository.getAssignedTickets('1');
});

final ticketDetailsProvider = FutureProvider.family<Ticket, String>((ref, ticketId) async {
  final repository = ref.read(ticketRepositoryProvider);
  return repository.getTicketById(ticketId);
});