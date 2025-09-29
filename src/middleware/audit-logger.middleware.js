const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor(config) {
    this.config = config;
    this.logDirectory = path.join(process.cwd(), 'logs', 'audit');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  logAuditEvent(event) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: event.level || 'INFO',
      eventType: event.eventType,
      userId: event.userId || null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      method: event.method,
      url: event.url,
      statusCode: event.statusCode,
      responseTime: event.responseTime,
      details: event.details || {},
      success: event.success !== false
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = path.join(this.logDirectory, `audit-${timestamp.split('T')[0]}.log`);

    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  logAuthenticationEvent(event) {
    this.logAuditEvent({
      eventType: 'AUTH',
      ...event
    });
  }

  logAuthorizationEvent(event) {
    this.logAuditEvent({
      eventType: 'AUTHZ',
      ...event
    });
  }

  logDataAccessEvent(event) {
    this.logAuditEvent({
      eventType: 'DATA_ACCESS',
      ...event
    });
  }

  logErrorEvent(event) {
    this.logAuditEvent({
      level: 'ERROR',
      eventType: 'ERROR',
      ...event
    });
  }
}

const auditLogger = (config) => {
  const logger = new AuditLogger(config);

  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;

    // Capture response data
    let responseData = null;
    let responseStatus = null;

    res.send = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const logEvent = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        statusCode: responseStatus,
        responseTime,
        success: responseStatus < 400
      };

      // Add user info if available
      if (req.user && req.user.uid) {
        logEvent.userId = req.user.uid;
        logEvent.details = {
          userEmail: req.user.email,
          userRole: req.user.role
        };
      }

      // Log sensitive operations
      if (req.originalUrl.includes('/auth/')) {
        logger.logAuthenticationEvent({
          ...logEvent,
          details: {
            ...logEvent.details,
            authOperation: req.originalUrl.split('/auth/')[1]
          }
        });
      } else if (req.originalUrl.includes('/users/')) {
        logger.logDataAccessEvent({
          ...logEvent,
          details: {
            ...logEvent.details,
            resourceType: 'USER',
            operation: req.method
          }
        });
      } else {
        logger.logAuditEvent(logEvent);
      }
    });

    next();
  };
};

module.exports = auditLogger;