// commands/admin.js
const logger = require('../utils/logger');

class AdminCommands {
  constructor(client, dataManager, messageHandler, rateLimiter, settings, healthMonitor) {
    this.client = client;
    this.data = dataManager;
    this.messageHandler = messageHandler;
    this.rateLimiter = rateLimiter;
    this.settings = settings;
    this.healthMonitor = healthMonitor;
    this.ownerId = parseInt(process.env.OWNER_ID) || 0;
    
    // Command prefix
    this.prefix = '/';
    
    // Available commands
    this.commands = {
      'help': this.showHelp.bind(this),
      'status': this.showStatus.bind(this),
      'stats': this.showStats.bind(this),
      'reload': this.reloadData.bind(this),
      'addreply': this.addReply.bind(this),
      'removereply': this.removeReply.bind(this),
      'set': this.setSetting.bind(this),
      'get': this.getSetting.bind(this),
      'reset': this.resetStats.bind(this),
      'health': this.showHealth.bind(this),
      'queue': this.showQueue.bind(this),
      'clear': this.clearQueue.bind(this),
      'limit': this.setRateLimit.bind(this),
      'test': this.testResponse.bind(this),
      'stop': this.stopTyping.bind(this),
      'export': this.exportData.bind(this),
      'version': this.showVersion.bind(this)
    };
  }

  async handleCommand(message) {
    // Only owner can use commands
    if (!this.isOwner(message)) {
      logger.warn(`Non-owner attempted command: ${message.fromId?.userId}`);
      return false;
    }
    
    const text = message.message.trim();
    
    // Check if it's a command
    if (!text.startsWith(this.prefix)) {
      return false;
    }
    
    // Parse command
    const parts = text.slice(this.prefix.length).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    logger.info(`Command received: ${command}`, { args: args });
    
    // Execute command
    if (this.commands[command]) {
      try {
        await this.commands[command](message, args);
        return true;
      } catch (error) {
        logger.error(`Command failed: ${command}`, { error: error.message });
        await this.sendReply(message.chatId, `❌ Command failed: ${error.message}`);
        return true;
      }
    } else {
      await this.sendReply(message.chatId, `❌ Unknown command: ${command}\nType /help for available commands`);
      return true;
    }
  }

  isOwner(message) {
    const senderId = message.fromId?.userId;
    return senderId && senderId === this.ownerId;
  }

  async sendReply(chatId, text) {
    try {
      await this.client.sendMessage(chatId, {
        message: text
      });
    } catch (error) {
      logger.error('Failed to send command reply', { error: error.message });
    }
  }

  // Command implementations
  async showHelp(message, args) {
    const helpText = `
🤖 *YOUR CRUSH Userbot Admin Commands*

📊 *Monitoring*
\`/status\` - Show bot status
\`/stats\` - Show statistics
\`/health\` - System health check
\`/queue\` - Show message queue

⚙️ *Configuration*
\`/set <key> <value>\` - Change setting
\`/get <key>\` - Get setting value
\`/limit <number>\` - Set rate limit
\`/reload\` - Reload data files

💬 *Responses*
\`/addreply <keyword> <response>\` - Add new reply
\`/removereply <keyword> [response]\` - Remove reply
\`/test <message>\` - Test response

🛠️ *Management*
\`/reset\` - Reset statistics
\`/clear\` - Clear message queue
\`/stop\` - Stop all typing
\`/export\` - Export data

📋 *Info*
\`/version\` - Show version
\`/help\` - This help message

*Example:* \`/addreply hello "Hi there! 😊"\`
    `.trim();
    
    await this.sendReply(message.chatId, helpText);
  }

  async showStatus(message, args) {
    const state = this.messageHandler.stateMachine.getCurrentState();
    const rateLimit = this.rateLimiter.getCurrentWindowStats();
    const dataStats = this.data.getStats();
    
    const statusText = `
📊 *Bot Status*

🤖 *State Machine*
• Current State: ${state.state}
• Description: ${state.description}
• Can Process: ${state.canProcess ? '✅' : '❌'}

⚡ *Rate Limiting*
• Actions: ${rateLimit.actionsInWindow}/${rateLimit.maxPerWindow}
• Window Ends: ${Math.ceil(rateLimit.timeRemainingSeconds)}s
• Blocked: ${rateLimit.blockedUntil ? '✅' : '❌'}

💾 *Data Cache*
• Patterns: ${dataStats.data.replyPatterns}
• Cache Hit Rate: ${dataStats.cache.hitRate}
• Total Responses: ${dataStats.data.totalResponses}

🔄 *Message Queue*
• Pending: ${this.messageHandler.messageQueue.length}
• Processing: ${this.messageHandler.isProcessing ? '✅' : '❌'}
    `.trim();
    
    await this.sendReply(message.chatId, statusText);
  }

  async showStats(message, args) {
    const stats = this.messageHandler.getStats();
    const typingStats = this.messageHandler.typing.getTypingStats();
    const rateStats = this.rateLimiter.getStats();
    
    const statsText = `
📈 *Statistics Report*

💬 *Messages*
• Received: ${stats.totalReceived}
• Processed: ${stats.totalProcessed}
• Responded: ${stats.totalResponded}
• Silenced: ${stats.totalSilenced}
• Errors: ${stats.totalErrors}

⌨️ *Typing Simulation*
• Active Sessions: ${typingStats.activeSessions}
• Chat Typing: ${typingStats.chatTyping.count} times
• Avg Duration: ${typingStats.chatTyping.avgDuration}ms

🚦 *Rate Limiting*
• Total Actions: ${rateStats.totalActions}
• Blocked Actions: ${rateStats.blockedActions}
• Max in Window: ${rateStats.maxActionsInWindow}

🎯 *Response Rate*
• Success: ${stats.totalReceived > 0 
      ? Math.round((stats.totalResponded / stats.totalReceived) * 100) 
      : 0}%
    `.trim();
    
    await this.sendReply(message.chatId, statsText);
  }

  async reloadData(message, args) {
    await this.data.loadAllData();
    await this.sendReply(message.chatId, '✅ Data files reloaded successfully!');
  }

  async addReply(message, args) {
    if (args.length < 2) {
      await this.sendReply(message.chatId, '❌ Usage: /addreply <keyword> <response>');
      return;
    }
    
    const keyword = args[0].toLowerCase();
    const response = args.slice(1).join(' ');
    
    const success = this.data.addReply(keyword, response);
    
    if (success) {
      await this.sendReply(message.chatId, `✅ Added reply for "${keyword}":\n"${response}"`);
    } else {
      await this.sendReply(message.chatId, '❌ Failed to add reply');
    }
  }

  async removeReply(message, args) {
    if (args.length < 1) {
      await this.sendReply(message.chatId, '❌ Usage: /removereply <keyword> [response]');
      return;
    }
    
    const keyword = args[0].toLowerCase();
    const response = args.length > 1 ? args.slice(1).join(' ') : null;
    
    const success = this.data.removeReply(keyword, response);
    
    if (success) {
      const msg = response 
        ? `Removed response from "${keyword}": "${response}"`
        : `Removed all responses for "${keyword}"`;
      await this.sendReply(message.chatId, `✅ ${msg}`);
    } else {
      await this.sendReply(message.chatId, `❌ Keyword "${keyword}" not found`);
    }
  }

  async setSetting(message, args) {
    if (args.length < 2) {
      await this.sendReply(message.chatId, '❌ Usage: /set <key.path> <value>');
      return;
    }
    
    const keyPath = args[0];
    let value = args.slice(1).join(' ');
    
    // Try to parse value as JSON
    try {
      value = JSON.parse(value);
    } catch {
      // Keep as string if not valid JSON
    }
    
    const success = this.settings.set(keyPath, value);
    
    if (success) {
      await this.sendReply(message.chatId, `✅ Setting updated:\n${keyPath} = ${JSON.stringify(value)}`);
    } else {
      await this.sendReply(message.chatId, '❌ Failed to update setting');
    }
  }

  async getSetting(message, args) {
    if (args.length < 1) {
      await this.sendReply(message.chatId, '❌ Usage: /get <key.path>');
      return;
    }
    
    const keyPath = args[0];
    const value = this.settings.get(keyPath, 'Not found');
    
    await this.sendReply(message.chatId, 
      `📋 ${keyPath} =\n\`${JSON.stringify(value, null, 2)}\``
    );
  }

  async resetStats(message, args) {
    this.messageHandler.resetStats();
    await this.sendReply(message.chatId, '✅ Statistics reset');
  }

  async showHealth(message, args) {
    const health = this.healthMonitor.getHealthStatus();
    const metrics = this.healthMonitor.getMetrics();
    const recommendations = this.healthMonitor.getRecommendations();
    
    let healthText = `
🏥 *System Health*

📊 *Status*
• Overall: ${health.overall.toUpperCase()}
• Score: ${health.healthScore}/100
• Checks: ${health.checks.healthy}/${health.checks.total} healthy

💻 *System Metrics*
• Uptime: ${metrics.formatted.uptime}
• Memory: ${metrics.formatted.memory.percentage} used
• CPU Load: ${metrics.formatted.cpu.load}
    `.trim();
    
    if (recommendations.length > 0) {
      healthText += '\n\n⚠️ *Recommendations*\n';
      recommendations.forEach(rec => {
        healthText += `• ${rec.message}\n`;
      });
    }
    
    if (health.checks.unhealthy > 0) {
      healthText += '\n🔴 *Unhealthy Checks*\n';
      health.checks.details.forEach(check => {
        if (check.status === 'unhealthy') {
          healthText += `• ${check.name}: ${check.lastResult}\n`;
        }
      });
    }
    
    await this.sendReply(message.chatId, healthText);
  }

  async showQueue(message, args) {
    const queue = this.messageHandler.messageQueue;
    
    if (queue.length === 0) {
      await this.sendReply(message.chatId, '✅ Message queue is empty');
      return;
    }
    
    const queueText = `
📨 *Message Queue*

• Total Pending: ${queue.length}
• Processing: ${this.messageHandler.isProcessing ? 'Yes' : 'No'}

*Recent Messages:*
${queue.slice(0, 5).map((item, i) => 
  `${i + 1}. "${item.message.message?.substring(0, 50)}..."`
).join('\n')}
    `.trim();
    
    await this.sendReply(message.chatId, queueText);
  }

  async clearQueue(message, args) {
    const cleared = this.messageHandler.clearQueue();
    await this.sendReply(message.chatId, `✅ Cleared ${cleared} messages from queue`);
  }

  async setRateLimit(message, args) {
    if (args.length < 1) {
      await this.sendReply(message.chatId, '❌ Usage: /limit <actions-per-minute>');
      return;
    }
    
    const limit = parseInt(args[0]);
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      await this.sendReply(message.chatId, '❌ Limit must be between 1 and 100');
      return;
    }
    
    const success = this.rateLimiter.updateLimit(limit);
    
    if (success) {
      await this.sendReply(message.chatId, `✅ Rate limit updated to ${limit} actions/minute`);
    } else {
      await this.sendReply(message.chatId, '❌ Failed to update rate limit');
    }
  }

  async testResponse(message, args) {
    if (args.length < 1) {
      await this.sendReply(message.chatId, '❌ Usage: /test <message>');
      return;
    }
    
    const testMessage = args.join(' ');
    const response = this.data.findReply(testMessage);
    
    if (response) {
      await this.sendReply(message.chatId, 
        `✅ Test successful!\n\n*Input:* ${testMessage}\n*Output:* ${response}`
      );
    } else {
      await this.sendReply(message.chatId, 
        `❌ No response found for: ${testMessage}\n\nThis message would trigger SILENT state.`
      );
    }
  }

  async stopTyping(message, args) {
    const stopped = this.messageHandler.typing.stopAllTyping();
    await this.sendReply(message.chatId, `✅ Stopped ${stopped} typing sessions`);
  }

  async exportData(message, args) {
    const settingsExport = this.settings.export();
    const dataStats = this.data.getStats();
    
    const exportText = `
💾 *Data Export*

⚙️ *Settings*
• Version: ${settingsExport.metadata.version}
• Exported: ${new Date(settingsExport.metadata.exportedAt).toLocaleString()}
• Valid: ${settingsExport.validation.valid ? '✅' : '❌'}

📊 *Data Statistics*
• Reply Patterns: ${dataStats.data.replyPatterns}
• Reactions: ${dataStats.data.reactions.length}
• Cache Size: ${dataStats.cache.size}

*To import:* Use Settings.import() method
    `.trim();
    
    await this.sendReply(message.chatId, exportText);
  }

  async showVersion(message, args) {
    const version = this.settings.get('version');
    const uptime = this.healthMonitor.formatUptime(this.healthMonitor.metrics.uptime);
    
    const versionText = `
📦 *YOUR CRUSH Userbot*

*Version:* ${version}
*Uptime:* ${uptime}
*Environment:* ${process.env.NODE_ENV || 'production'}
*Node.js:* ${process.version}

*Features:*
• Zero AI Dependency ✅
• Rule-based Responses ✅
• Human Simulation ✅
• Rate Limiting ✅
• Privacy First ✅

*Status:* 🟢 Operational
    `.trim();
    
    await this.sendReply(message.chatId, versionText);
  }
}

module.exports = AdminCommands;
