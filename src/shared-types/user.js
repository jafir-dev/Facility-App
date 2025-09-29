class User {
  constructor(id, email, firstName, lastName, role, createdAt, updatedAt, isActive) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isActive = isActive;
  }
}

class AuthResponse {
  constructor(user, token, refreshToken) {
    this.user = user;
    this.token = token;
    this.refreshToken = refreshToken;
  }
}

module.exports = {
  User,
  AuthResponse,
};