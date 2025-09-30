class Failure {
  final String message;
  final String? code;
  final dynamic exception;

  Failure(this.message, {this.code, this.exception});

  factory Failure.fromException(dynamic exception) {
    if (exception is Exception) {
      return Failure(exception.toString(), exception: exception);
    }
    return Failure('An unknown error occurred', exception: exception);
  }

  @override
  String toString() {
    return 'Failure(message: $message, code: $code)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Failure &&
        other.message == message &&
        other.code == code &&
        other.exception == exception;
  }

  @override
  int get hashCode {
    return message.hashCode ^ code.hashCode ^ exception.hashCode;
  }
}