// utils/logger.js
const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL || 'INFO';
    this.logDir = path.join(__dirname, '..', 'logs');
    this.maxFileSize = 10485760; // 10MB
    this.logQueue = [];
    this.isWriting = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      
      // Clean old logs on startup
      await this.cleanOldLogs();
      
      console.log(`📝 Logger initialized with level: ${this.currentLevel}`);
      
    } catch (error) {
      console.error('Failed to initialize logger:', error.message);
    }
  }

  getLogFileName() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `userbot_${year}-${month}-${day}.log`;
  }

  async writeToFile(message) {
    const fileName = this.getLogFileName();
    const filePath = path.join(this.logDir, fileName);
    
    try {
      await fs.appendFile(filePath, message + '\n', 'utf8');
      
      // Check file size
      const stats = await fs.stat(filePath).catch(() => ({ size: 0 }));
      if (stats.size > this.maxFileSize) {
        await this.rotateLogFile(filePath);
      }
      
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  async rotateLogFile(filePath) {
    const timestamp = Date.now();
    const newPath = `${filePath}.${timestamp}.bak`;
    
    try {
      await fs.rename(filePath, newPath);
      console.log(`🔄 Rotated log file: ${path.basename(newPath)}`);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  async cleanOldLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.endsWith('.bak')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < sevenDaysAgo) {
            await fs.unlink(filePath);
            console.log(`🧹 Deleted old log: ${file}`);
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelStr = level.padEnd(5);
    const metaStr = Object.keys(meta).length > 0 
      ? ` ${JSON.stringify(meta)}`
      : '';
    
    return `[${timestamp}] ${levelStr} ${message}${metaStr}`;
  }

  shouldLog(level) {
    const currentLevelNum = this.logLevels[this.currentLevel.toUpperCase()] || 2;
    const messageLevelNum = this.logLevels[level.toUpperCase()] || 2;
    
    return messageLevelNum <= currentLevelNum;
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const formatted = this.formatMessage(level, message, meta);
    
    // Console output
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[90m'  // Gray
    };
    
    const color = colors[level.toUpperCase()] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${formatted}${reset}`);
    
    // Queue for file writing
    this.logQueue.push(formatted);
    
    // Process queue if not already processing
    if (!this.isWriting && this.logQueue.length > 0) {
      this.processLogQueue();
    }
  }

  async processLogQueue() {
    if (this.isWriting || this.logQueue.length === 0) {
      return;
    }
    
    this.isWriting = true;
    
    while (this.logQueue.length > 0) {
      const message = this.logQueue.shift();
      await this.writeToFile(message);
    }
    
    this.isWriting = false;
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  getStats() {
    return {
      level: this.currentLevel,
      queueLength: this.logQueue.length,
      isWriting: this.isWriting,
      logDir: this.logDir,
      maxFileSize: this.maxFileSize
    };
  }

  setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (this.logLevels.hasOwnProperty(upperLevel)) {
      this.currentLevel = upperLevel;
      console.log(`⚙️ Log level changed to: ${upperLevel}`);
      return true;
    }
    return false;
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
