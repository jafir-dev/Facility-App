import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/ticket_provider.dart';
import '../../../models/ticket.dart';

class TicketDetailPage extends ConsumerStatefulWidget {
  final String ticketId;

  const TicketDetailPage({super.key, required this.ticketId});

  @override
  ConsumerState<TicketDetailPage> createState() => _TicketDetailPageState();
}

class _TicketDetailPageState extends ConsumerState<TicketDetailPage> {
  late Future<Ticket?> _ticketFuture;

  @override
  void initState() {
    super.initState();
    _ticketFuture = _loadTicket();
  }

  Future<Ticket?> _loadTicket() async {
    try {
      final ticketRepository = ref.read(ticketRepositoryProvider);
      final result = await ticketRepository.getTicketById(widget.ticketId);
      return result.fold(
        (failure) => null,
        (ticket) => ticket,
      );
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                _ticketFuture = _loadTicket();
              });
            },
          ),
        ],
      ),
      body: FutureBuilder<Ticket?>(
        future: _ticketFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError || snapshot.data == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading ticket',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    snapshot.error?.toString() ?? 'Ticket not found',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final ticket = snapshot.data!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Badge
                _StatusBadge(status: ticket.status),
                const SizedBox(height: 16),

                // Title
                Text(
                  ticket.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                // Description
                const Text(
                  'Description',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  ticket.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),

                // Property Information
                const Text(
                  'Property',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.apartment_outlined),
                    title: Text(ticket.propertyName),
                    subtitle: Text('ID: ${ticket.propertyId}'),
                  ),
                ),
                const SizedBox(height: 24),

                // Timeline
                const Text(
                  'Timeline',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.calendar_today_outlined),
                    title: const Text('Created'),
                    subtitle: Text(
                      DateFormat('MMM dd, yyyy at hh:mm a').format(ticket.createdAt),
                    ),
                  ),
                ),
                if (ticket.updatedAt != null) ...[
                  const SizedBox(height: 8),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.update_outlined),
                      title: const Text('Last Updated'),
                      subtitle: Text(
                        DateFormat('MMM dd, yyyy at hh:mm a').format(ticket.updatedAt!),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),

                // Attachments
                if (ticket.mediaUrls.isNotEmpty) ...[
                  const Text(
                    'Attachments',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: ticket.mediaUrls.length,
                      itemBuilder: (context, index) {
                        final imageUrl = ticket.mediaUrls[index];
                        return Container(
                          width: 120,
                          margin: const EdgeInsets.only(right: 8),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                color: Colors.grey[300],
                                child: const Center(
                                  child: CircularProgressIndicator(),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                color: Colors.grey[300],
                                child: const Icon(Icons.error),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Actions
                if (ticket.status == TicketStatus.new_ ||
                    ticket.status == TicketStatus.assigned ||
                    ticket.status == TicketStatus.inProgress) ...[
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        // TODO: Implement ticket update/cancel
                        _showUpdateDialog(ticket);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Update Status'),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showUpdateDialog(Ticket ticket) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Ticket Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Current status: ${ticket.status.displayName}'),
            const SizedBox(height: 16),
            // TODO: Add status selection options
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Implement status update
              Navigator.pop(context);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final TicketStatus status;

  const _StatusBadge({required this.status});

  Color _getStatusColor(TicketStatus status) {
    switch (status) {
      case TicketStatus.new_:
        return Colors.blue;
      case TicketStatus.assigned:
        return Colors.orange;
      case TicketStatus.inProgress:
        return Colors.purple;
      case TicketStatus.pendingQuoteApproval:
        return Colors.amber;
      case TicketStatus.approved:
        return Colors.teal;
      case TicketStatus.completed:
        return Colors.green;
      case TicketStatus.declined:
        return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _getStatusColor(status),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            _getStatusIcon(status),
            color: _getStatusColor(status),
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            status.displayName,
            style: TextStyle(
              color: _getStatusColor(status),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getStatusIcon(TicketStatus status) {
    switch (status) {
      case TicketStatus.new_:
        return Icons.new_releases;
      case TicketStatus.assigned:
        return Icons.person;
      case TicketStatus.inProgress:
        return Icons.work;
      case TicketStatus.pendingQuoteApproval:
        return Icons.receipt_long;
      case TicketStatus.approved:
        return Icons.check_circle;
      case TicketStatus.completed:
        return Icons.done_all;
      case TicketStatus.declined:
        return Icons.cancel;
    }
  }
}