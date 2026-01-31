// config/settings.js
const fs = require('fs').promises;
const path = require('path');

class Settings {
  constructor() {
    this.configDir = path.join(__dirname, '..', 'config');
    this.settingsFile = path.join(this.configDir, 'userbot-settings.json');
    this.defaultSettings = this.getDefaultSettings();
    this.currentSettings = { ...this.defaultSettings };
    this.loaded = false;
  }

  getDefaultSettings() {
    return {
      // Bot Identity
      botName: process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 ⟵𝗼_𝟬",
      
      // Behavior Settings
      behavior: {
        enablePrivateChats: true,
        enableGroupChats: false,
        enableChannelChats: false,
        respondToBots: false,
        respondToUserbots: false,
        allowMediaResponses: false,
        allowVoiceResponses: false,
        allowVideoResponses: false,
        maxMessageLength: 1000,
        minMessageLength: 1
      },
      
      // Response Settings
      response: {
        typingMinDelay: parseInt(process.env.TYPING_MIN_DELAY) || 800,
        typingMaxDelay: parseInt(process.env.TYPING_MAX_DELAY) || 4000,
        reactionChance: 0.3, // 30%
        cooldownMin: 500,
        cooldownMax: 2000,
        enableReactions: true,
        enableTypingSimulation: true,
        enableRandomDelays: true
      },
      
      // Rate Limiting
      rateLimiting: {
        maxActionsPerMinute: parseInt(process.env.MAX_ACTIONS_PER_MINUTE) || 50,
        enableRateLimiting: true,
        cooldownMultiplier: 1.5,
        maxQueueSize: 100,
        enableExponentialBackoff: true
      },
      
      // Privacy & Safety
      privacy: {
        logMessages: false,
        logResponses: false,
        storeChatHistory: false,
        anonymizeUserIds: true,
        deleteOldLogs: true,
        logsRetentionDays: 7
      },
      
      // Performance
      performance: {
        enableCaching: true,
        cacheTTL: 300000, // 5 minutes
        maxCacheSize: 1000,
        enableCompression: false,
        cleanupInterval: 3600000 // 1 hour
      },
      
      // System
      system: {
        logLevel: process.env.LOG_LEVEL || 'info',
        enableHealthChecks: true,
        healthCheckInterval: 60000, // 1 minute
        enableAutoRecovery: true,
        maxRestartAttempts: 3,
        restartCooldown: 30000 // 30 seconds
      },
      
      // Version
      version: "1.3.0",
      lastUpdated: new Date().toISOString()
    };
  }

  async load() {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });
      
      // Try to load existing settings
      try {
        const data = await fs.readFile(this.settingsFile, 'utf8');
        const loaded = JSON.parse(data);
        
        // Merge with defaults (keeping defaults for missing properties)
        this.currentSettings = this.deepMerge(this.defaultSettings, loaded);
        
        // Update version and timestamp
        this.currentSettings.version = this.defaultSettings.version;
        this.currentSettings.lastUpdated = new Date().toISOString();
        
        console.log('✅ Settings loaded from file');
        
      } catch (error) {
        // File doesn't exist or is invalid, use defaults
        console.log('ℹ️ Using default settings');
        this.currentSettings = { ...this.defaultSettings };
        await this.save();
      }
      
      this.loaded = true;
      return true;
      
    } catch (error) {
      console.error('Failed to load settings:', error.message);
      this.currentSettings = { ...this.defaultSettings };
      return false;
    }
  }

  async save() {
    try {
      // Update timestamp
      this.currentSettings.lastUpdated = new Date().toISOString();
      
      const data = JSON.stringify(this.currentSettings, null, 2);
      await fs.writeFile(this.settingsFile, data, 'utf8');
      
      console.log('💾 Settings saved');
      return true;
      
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      return false;
    }
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  get(keyPath, defaultValue = null) {
    const keys = keyPath.split('.');
    let value = this.currentSettings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value !== undefined ? value : defaultValue;
  }

  set(keyPath, value) {
    const keys = keyPath.split('.');
    let current = this.currentSettings;
    
    // Navigate to the second-to-last key
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      
      current = current[key];
    }
    
    // Set the final key
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
    
    console.log(`⚙️ Setting updated: ${keyPath} = ${JSON.stringify(value)}`);
    
    // Auto-save on change
    this.save().catch(console.error);
    
    return true;
  }

  update(changes) {
    if (typeof changes !== 'object') {
      console.error('Invalid changes object');
      return false;
    }
    
    this.currentSettings = this.deepMerge(this.currentSettings, changes);
    
    console.log('⚙️ Settings updated with multiple changes');
    
    // Auto-save
    this.save().catch(console.error);
    
    return true;
  }

  resetToDefaults() {
    const oldSettings = { ...this.currentSettings };
    this.currentSettings = { ...this.defaultSettings };
    
    console.log('🔄 Settings reset to defaults');
    
    // Auto-save
    this.save().catch(console.error);
    
    return {
      old: oldSettings,
      new: this.currentSettings
    };
  }

  getAll() {
    return { ...this.currentSettings };
  }

  getCategory(category) {
    return this.currentSettings[category] ? { ...this.currentSettings[category] } : null;
  }

  validate() {
    const errors = [];
    
    // Validate rate limiting
    const rateLimit = this.get('rateLimiting.maxActionsPerMinute');
    if (rateLimit < 1 || rateLimit > 100) {
      errors.push('Rate limit must be between 1 and 100');
    }
    
    // Validate typing delays
    const minTyping = this.get('response.typingMinDelay');
    const maxTyping = this.get('response.typingMaxDelay');
    
    if (minTyping < 100 || minTyping > 10000) {
      errors.push('Minimum typing delay must be between 100 and 10000 ms');
    }
    
    if (maxTyping < minTyping || maxTyping > 30000) {
      errors.push('Maximum typing delay must be greater than minimum and less than 30000 ms');
    }
    
    // Validate probabilities
    const reactionChance = this.get('response.reactionChance');
    if (reactionChance < 0 || reactionChance > 1) {
      errors.push('Reaction chance must be between 0 and 1');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  export() {
    return {
      settings: { ...this.currentSettings },
      validation: this.validate(),
      metadata: {
        exportedAt: new Date().toISOString(),
        version: this.currentSettings.version
      }
    };
  }

  async import(settingsData) {
    try {
      const parsed = typeof settingsData === 'string' 
        ? JSON.parse(settingsData) 
        : settingsData;
      
      if (!parsed.settings || typeof parsed.settings !== 'object') {
        throw new Error('Invalid settings format');
      }
      
      // Validate
      const tempSettings = this.deepMerge(this.defaultSettings, parsed.settings);
      const temp = new Settings();
      temp.currentSettings = tempSettings;
      const validation = temp.validate();
      
      if (!validation.valid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }
      
      // Apply
      this.currentSettings = tempSettings;
      await this.save();
      
      console.log('✅ Settings imported successfully');
      return { success: true, validation: validation };
      
    } catch (error) {
      console.error('Failed to import settings:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const settings = new Settings();

module.exports = settings;
