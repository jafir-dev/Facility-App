const crypto = require('crypto');

class TokenBlacklistService {
  constructor(config) {
    this.config = config;
    this.blacklistedTokens = new Map();
    this.cleanupInterval = null;
    this.initializeCleanup();
  }

  initializeCleanup() {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  async addToBlacklist(token, expiresAt) {
    try {
      // Create a hash of the token for storage (don't store actual tokens)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      this.blacklistedTokens.set(tokenHash, {
        expiresAt: new Date(expiresAt),
        blacklistedAt: new Date()
      });

      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error adding token to blacklist:', error);
      }
      return false;
    }
  }

  async isBlacklisted(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const blacklistedToken = this.blacklistedTokens.get(tokenHash);

      if (!blacklistedToken) {
        return false;
      }

      // Check if the token has expired
      if (new Date() > blacklistedToken.expiresAt) {
        this.blacklistedTokens.delete(tokenHash);
        return false;
      }

      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error checking token blacklist:', error);
      }
      return false;
    }
  }

  cleanupExpiredTokens() {
    const now = new Date();
    for (const [tokenHash, tokenData] of this.blacklistedTokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.blacklistedTokens.delete(tokenHash);
      }
    }
  }

  getBlacklistedCount() {
    return this.blacklistedTokens.size;
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.blacklistedTokens.clear();
  }
}

module.exports = TokenBlacklistService;