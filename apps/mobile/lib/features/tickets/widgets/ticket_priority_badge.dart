import 'package:flutter/material.dart';

class TicketPriorityBadge extends StatelessWidget {
  final String priority;

  const TicketPriorityBadge({super.key, required this.priority});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    String displayText;

    switch (priority) {
      case 'High':
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        displayText = 'High Priority';
        break;
      case 'Low':
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        displayText = 'Low Priority';
        break;
      default:
        backgroundColor = Colors.yellow.shade100;
        textColor = Colors.yellow.shade800;
        displayText = 'Medium Priority';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}