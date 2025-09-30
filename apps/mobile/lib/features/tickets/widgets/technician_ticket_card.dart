import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/ticket.dart';
import '../data/ticket_providers.dart';
import '../data/ticket_repository.dart';
import 'ticket_status_badge.dart';
import 'ticket_priority_badge.dart';

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
      final repository = ref.read(ticketRepositoryProvider);
      await repository.updateTicketStatus(
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
      final repository = ref.read(ticketRepositoryProvider);
      await repository.updateTicketStatus(
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

class TechnicianTicketDetailPage extends ConsumerStatefulWidget {
  final String ticketId;

  const TechnicianTicketDetailPage({super.key, required this.ticketId});

  @override
  ConsumerState<TechnicianTicketDetailPage> createState() => _TechnicianTicketDetailPageState();
}

class _TechnicianTicketDetailPageState extends ConsumerState<TechnicianTicketDetailPage> {
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
              _buildMediaSection(),
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

  Widget _buildMediaSection() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Work Documentation',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 12),
            Center(
              child: Text(
                'No photos added yet',
                style: TextStyle(color: Colors.grey),
              ),
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
            onPressed: () async {
              // TODO: Get current location
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Location tracking feature coming soon')),
              );
            },
            child: const Text('Get Location'),
          ),
        ),
      ],
    );
  }

  Future<void> _startWork(BuildContext context, WidgetRef ref, String ticketId) async {
    try {
      final repository = ref.read(ticketRepositoryProvider);
      await repository.updateTicketStatus(
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
      final repository = ref.read(ticketRepositoryProvider);
      await repository.updateTicketStatus(
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