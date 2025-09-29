const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    this.initialized = false;
    this.auth = null;
  }

  initialize(config) {
    if (this.initialized) return;

    const firebaseConfig = {
      credential: admin.credential.cert({
        projectId: config.firebaseProjectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    };

    admin.initializeApp(firebaseConfig);
    this.auth = admin.auth();
    this.initialized = true;
  }

  async createUser(userData) {
    try {
      const userRecord = await this.auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: `${userData.firstName} ${userData.lastName}`,
        emailVerified: false,
      });

      return userRecord;
    } catch (error) {
      console.error('Error creating Firebase user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async verifyToken(idToken) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Invalid token');
    }
  }

  async getUserByEmail(email) {
    try {
      const userRecord = await this.auth.getUserByEmail(email);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  async generatePasswordResetLink(email) {
    try {
      const resetLink = await this.auth.generatePasswordResetLink(email);
      return resetLink;
    } catch (error) {
      console.error('Error generating password reset link:', error);
      throw new Error('Failed to generate password reset link');
    }
  }

  async generateEmailVerificationLink(email) {
    try {
      const verificationLink = await this.auth.generateEmailVerificationLink(email);
      return verificationLink;
    } catch (error) {
      console.error('Error generating email verification link:', error);
      throw new Error('Failed to generate email verification link');
    }
  }

  async sendEmailVerification(email) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // In a real implementation, you would send an email with the verification link
      // For now, we'll just generate the link
      const verificationLink = await this.generateEmailVerificationLink(email);

      return {
        success: true,
        verificationLink,
        message: 'Email verification link generated'
      };
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('Failed to send email verification');
    }
  }

  async updateUser(uid, updates) {
    try {
      await this.auth.updateUser(uid, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async disableUser(uid) {
    try {
      await this.auth.updateUser(uid, { disabled: true });
    } catch (error) {
      console.error('Error disabling user:', error);
      throw new Error('Failed to disable user');
    }
  }

  async enableUser(uid) {
    try {
      await this.auth.updateUser(uid, { disabled: false });
    } catch (error) {
      console.error('Error enabling user:', error);
      throw new Error('Failed to enable user');
    }
  }
}

module.exports = new FirebaseService();