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
  final String propertyId;
  final String propertyName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<String> mediaUrls;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.propertyId,
    required this.propertyName,
    required this.createdAt,
    this.updatedAt,
    this.mediaUrls = const [],
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: TicketStatus.fromString(json['status']),
      propertyId: json['propertyId'],
      propertyName: json['propertyName'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
      mediaUrls: List<String>.from(json['mediaUrls'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.name,
      'propertyId': propertyId,
      'propertyName': propertyName,
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
    String? propertyId,
    String? propertyName,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? mediaUrls,
  }) {
    return Ticket(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      propertyId: propertyId ?? this.propertyId,
      propertyName: propertyName ?? this.propertyName,
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
        other.propertyId == propertyId &&
        other.propertyName == propertyName &&
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
        propertyId.hashCode ^
        propertyName.hashCode ^
        createdAt.hashCode ^
        updatedAt.hashCode ^
        mediaUrls.hashCode;
  }
}