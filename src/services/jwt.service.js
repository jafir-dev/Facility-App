const jwt = require('jsonwebtoken');

class JwtService {
  constructor(config) {
    this.secret = config.jwtSecret;
    this.jwtExpiration = config.jwtExpiration;
    this.refreshTokenExpiration = config.refreshTokenExpiration;
  }

  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.jwtExpiration });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.refreshTokenExpiration });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  generateAuthTokens(user) {
    const payload = {
      uid: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { token, refreshToken };
  }
}

module.exports = JwtService;