enum TicketStatus {
  new_('New'),
  assigned('Assigned'),
  inProgress('In Progress'),
  pendingQuoteApproval('Pending Quote Approval'),
  approved('Approved'),
  completed('Completed'),
  declined('Declined');

  const TicketStatus(this.displayName);
  final String displayName;

  static TicketStatus fromString(String status) {
    return TicketStatus.values.firstWhere(
      (s) => s.name == status,
      orElse: () => TicketStatus.new_,
    );
  }
}

class Ticket {
  final String id;
  final String title;
  final String description;
  final TicketStatus status;
  final String priority;
  final String propertyId;
  final String propertyName;
  final String tenantName;
  final String assignedToId;
  final String createdBy;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<String>? mediaUrls;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.propertyId,
    required this.propertyName,
    required this.tenantName,
    required this.assignedToId,
    required this.createdBy,
    required this.createdAt,
    this.updatedAt,
    this.mediaUrls,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: TicketStatus.fromString(json['status']),
      priority: json['priority'],
      propertyId: json['propertyId'],
      propertyName: json['propertyName'] ?? '',
      tenantName: json['tenantName'] ?? '',
      assignedToId: json['assignedToId'] ?? '',
      createdBy: json['createdBy'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
      mediaUrls: json['mediaUrls'] != null ? List<String>.from(json['mediaUrls']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.name,
      'priority': priority,
      'propertyId': propertyId,
      'propertyName': propertyName,
      'tenantName': tenantName,
      'assignedToId': assignedToId,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'mediaUrls': mediaUrls,
    };
  }

  Ticket copyWith({
    String? id,
    String? title,
    String? description,
    TicketStatus? status,
    String? priority,
    String? propertyId,
    String? propertyName,
    String? tenantName,
    String? assignedToId,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? mediaUrls,
  }) {
    return Ticket(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      propertyId: propertyId ?? this.propertyId,
      propertyName: propertyName ?? this.propertyName,
      tenantName: tenantName ?? this.tenantName,
      assignedToId: assignedToId ?? this.assignedToId,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      mediaUrls: mediaUrls ?? this.mediaUrls,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Ticket &&
        other.id == id &&
        other.title == title &&
        other.description == description &&
        other.status == status &&
        other.priority == priority &&
        other.propertyId == propertyId &&
        other.propertyName == propertyName &&
        other.tenantName == tenantName &&
        other.assignedToId == assignedToId &&
        other.createdBy == createdBy &&
        other.createdAt == createdAt &&
        other.updatedAt == updatedAt &&
        other.mediaUrls == mediaUrls;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        title.hashCode ^
        description.hashCode ^
        status.hashCode ^
        priority.hashCode ^
        propertyId.hashCode ^
        propertyName.hashCode ^
        tenantName.hashCode ^
        assignedToId.hashCode ^
        createdBy.hashCode ^
        createdAt.hashCode ^
        updatedAt.hashCode ^
        mediaUrls.hashCode;
  }
}