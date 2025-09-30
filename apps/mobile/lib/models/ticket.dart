class Ticket {
  final String id;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String propertyName;
  final String tenantName;
  final String assignedToId;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String>? mediaUrls;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.propertyName,
    required this.tenantName,
    required this.assignedToId,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.mediaUrls,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: json['status'],
      priority: json['priority'],
      propertyName: json['propertyName'],
      tenantName: json['tenantName'],
      assignedToId: json['assignedToId'],
      createdBy: json['createdBy'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      mediaUrls: json['mediaUrls'] != null ? List<String>.from(json['mediaUrls']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'propertyName': propertyName,
      'tenantName': tenantName,
      'assignedToId': assignedToId,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'mediaUrls': mediaUrls,
    };
  }
}