// core/typingSystem.js
class TypingSystem {
  constructor(client) {
    this.client = client;
    this.minDelay = parseInt(process.env.TYPING_MIN_DELAY) || 800;
    this.maxDelay = parseInt(process.env.TYPING_MAX_DELAY) || 4000;
    this.activeTypingSessions = new Map();
    this.typingHistory = [];
    this.dualContext = {
      chatTyping: {
        enabled: true,
        purpose: 'Simulate real human typing',
        minDelay: this.minDelay,
        maxDelay: this.maxDelay
      },
      inlineTyping: {
        enabled: true,
        purpose: 'Simulate thinking before action',
        minDelay: 1000,
        maxDelay: 3000
      }
    };
  }

  getRandomDelay(context = 'chatTyping') {
    const config = this.dualContext[context] || this.dualContext.chatTyping;
    const min = config.minDelay || this.minDelay;
    const max = config.maxDelay || this.maxDelay;
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async simulateTyping(chatId) {
    // Rule: Typing always before reply
    // Rule: Typing never skipped except SILENT state
    
    if (this.activeTypingSessions.has(chatId)) {
      console.log(`⚠️ Already typing in chat ${chatId}`);
      return;
    }

    const sessionId = Date.now();
    this.activeTypingSessions.set(chatId, sessionId);
    
    try {
      // Start typing indicator
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      const duration = this.getRandomDelay('chatTyping');
      
      // Record typing session
      this.typingHistory.push({
        chatId: chatId,
        duration: duration,
        timestamp: Date.now(),
        context: 'chatTyping'
      });
      
      // Keep only last 100 records
      if (this.typingHistory.length > 100) {
        this.typingHistory.shift();
      }
      
      // Wait for typing duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      console.log(`⌨️ Simulated typing for ${duration}ms in chat ${chatId}`);
      
    } catch (error) {
      // Silent fail as per specification
      console.error('Typing error (silent):', error.message);
    } finally {
      // Clean up session
      if (this.activeTypingSessions.get(chatId) === sessionId) {
        this.activeTypingSessions.delete(chatId);
      }
    }
  }

  async simulateInlineTyping() {
    if (!this.dualContext.inlineTyping.enabled) {
      return;
    }
    
    const duration = this.getRandomDelay('inlineTyping');
    
    this.typingHistory.push({
      duration: duration,
      timestamp: Date.now(),
      context: 'inlineTyping'
    });
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    console.log(`🤔 Simulated inline thinking for ${duration}ms`);
  }

  async simulateActionTyping(chatId, actionType) {
    // Simulate typing for specific actions
    const actions = {
      'command': { min: 500, max: 2000 },
      'media': { min: 1000, max: 3000 },
      'sticker': { min: 300, max: 1000 },
      'forward': { min: 200, max: 800 }
    };
    
    const config = actions[actionType] || { min: 500, max: 1500 };
    const duration = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    
    try {
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      console.log(`⌨️ ${actionType} typing for ${duration}ms`);
      
    } catch (error) {
      // Silent fail
    }
  }

  stopTyping(chatId) {
    if (this.activeTypingSessions.has(chatId)) {
      this.activeTypingSessions.delete(chatId);
      console.log(`🛑 Stopped typing in chat ${chatId}`);
      return true;
    }
    return false;
  }

  stopAllTyping() {
    const count = this.activeTypingSessions.size;
    this.activeTypingSessions.clear();
    console.log(`🛑 Stopped all typing sessions (${count})`);
    return count;
  }

  getTypingStats() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentSessions = this.typingHistory.filter(
      session => session.timestamp >= oneHourAgo
    );
    
    const chatTypingSessions = recentSessions.filter(
      session => session.context === 'chatTyping'
    );
    
    const inlineTypingSessions = recentSessions.filter(
      session => session.context === 'inlineTyping'
    );
    
    const avgChatDuration = chatTypingSessions.length > 0
      ? chatTypingSessions.reduce((sum, s) => sum + s.duration, 0) / chatTypingSessions.length
      : 0;
    
    const avgInlineDuration = inlineTypingSessions.length > 0
      ? inlineTypingSessions.reduce((sum, s) => sum + s.duration, 0) / inlineTypingSessions.length
      : 0;
    
    return {
      activeSessions: this.activeTypingSessions.size,
      totalSessions: this.typingHistory.length,
      recentSessions: recentSessions.length,
      chatTyping: {
        count: chatTypingSessions.length,
        avgDuration: Math.round(avgChatDuration)
      },
      inlineTyping: {
        count: inlineTypingSessions.length,
        avgDuration: Math.round(avgInlineDuration)
      },
      config: {
        chatMinDelay: this.minDelay,
        chatMaxDelay: this.maxDelay,
        dualContext: this.dualContext
      }
    };
  }

  updateConfig(newConfig) {
    if (newConfig.minDelay && newConfig.maxDelay) {
      this.minDelay = parseInt(newConfig.minDelay);
      this.maxDelay = parseInt(newConfig.maxDelay);
      this.dualContext.chatTyping.minDelay = this.minDelay;
      this.dualContext.chatTyping.maxDelay = this.maxDelay;
      console.log(`⚙️ Updated typing delays: ${this.minDelay}-${this.maxDelay}ms`);
      return true;
    }
    return false;
  }
}

module.exports = TypingSystem;
