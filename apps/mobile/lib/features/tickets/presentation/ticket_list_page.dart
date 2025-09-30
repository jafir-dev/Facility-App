import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ticket_provider.dart';
import 'widgets/ticket_card.dart' as widgets;
import 'create_ticket_page.dart';
import 'ticket_detail_page.dart';

class TicketListPage extends ConsumerWidget {
  const TicketListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(myTicketsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateTicketPage(),
                ),
              );
            },
          ),
        ],
      ),
      body: ticketsAsync.when(
        loading: () => const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading your tickets...'),
            ],
          ),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Error loading tickets',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(myTicketsProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
        data: (paginatedTickets) {
          if (paginatedTickets.tickets.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No tickets found',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create your first maintenance request',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const CreateTicketPage(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Create Ticket'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              await ref.read(myTicketsProvider.notifier).refreshTickets();
            },
            child: ListView.builder(
              padding: const EdgeInsets.only(bottom: 16),
              itemCount: paginatedTickets.tickets.length,
              itemBuilder: (context, index) {
                final ticket = paginatedTickets.tickets[index];
                return widgets.TicketCard(
                  ticket: ticket,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TicketDetailPage(ticketId: ticket.id),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}