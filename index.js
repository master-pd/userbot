// ============================================
// YOUR CRUSH Userbot - Main Application
// Fully Offline, AI-Free, Rule-Based System
// ============================================

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs').promises;
const path = require('path');
const http = require('http'); // IMPORTANT: Add this line

// ============================================
// CONFIGURATION FROM RENDER ENVIRONMENT VARIABLES
// ============================================
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING;
const BOT_NAME = process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 ⟵𝗼_𝟬";
const OWNER_ID = parseInt(process.env.OWNER_ID) || 0;
const MAX_ACTIONS_PER_MINUTE = parseInt(process.env.MAX_ACTIONS_PER_MINUTE) || 50;
const TYPING_MIN_DELAY = parseInt(process.env.TYPING_MIN_DELAY) || 800;
const TYPING_MAX_DELAY = parseInt(process.env.TYPING_MAX_DELAY) || 4000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const PORT = process.env.PORT || 3000; // IMPORTANT: Add this line

// ============================================
// VALIDATION
// ============================================
if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing required environment variables in Render!');
  console.error('Please set in Render Dashboard:');
  console.error('1. API_ID (from https://my.telegram.org)');
  console.error('2. API_HASH (from https://my.telegram.org)');
  console.error('3. SESSION_STRING (run: node session.js locally)');
  console.error('\n💡 Run "npm run session" locally first to generate session string');
  process.exit(1);
}

// ============================================
// HTTP SERVER FOR RENDER (NEW ADDITION)
// ============================================
function startHttpServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        bot: BOT_NAME,
        service: 'Telegram Userbot',
        uptime: process.uptime(),
        platform: 'Render Web Service',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`${BOT_NAME} is running on Render`);
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 HTTP Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  return server;
}

// ============================================
// DATA MANAGER CLASS
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    this.voices = [];
    this.videos = [];
  }

  async loadAllData() {
    try {
      // Load reply patterns
      const replyPath = path.join(__dirname, 'data', 'reply.json');
      const replyData = await fs.readFile(replyPath, 'utf8');
      this.replies = JSON.parse(replyData);
      console.log(`✅ Loaded ${Object.keys(this.replies).length} reply patterns`);
      
      // Load reactions
      const reactionPath = path.join(__dirname, 'data', 'reaction.json');
      try {
        const reactionData = await fs.readFile(reactionPath, 'utf8');
        const parsed = JSON.parse(reactionData);
        if (parsed.reactions && Array.isArray(parsed.reactions)) {
          this.reactions = parsed.reactions;
        }
      } catch (e) {
        console.log('⚠️ Using default reactions');
      }
      console.log(`✅ Loaded ${this.reactions.length} reactions`);
      
      // Load voices
      const voicePath = path.join(__dirname, 'data', 'voice.json');
      try {
        const voiceData = await fs.readFile(voicePath, 'utf8');
        const parsed = JSON.parse(voiceData);
        if (parsed.voices && Array.isArray(parsed.voices)) {
          this.voices = parsed.voices;
        }
      } catch (e) {
        console.log('ℹ️ No voice files configured');
      }
      
      // Load videos
      const videoPath = path.join(__dirname, 'data', 'video.json');
      try {
        const videoData = await fs.readFile(videoPath, 'utf8');
        const parsed = JSON.parse(videoData);
        if (parsed.videos && Array.isArray(parsed.videos)) {
          this.videos = parsed.videos;
        }
      } catch (e) {
        console.log('ℹ️ No video files configured');
      }
      
    } catch (error) {
      console.error('❌ Error loading data files:', error.message);
      // Initialize with default data
      this.replies = {
        "hi": ["Hello!", "Hi there!", "Hey!"],
        "hello": ["Hi!", "Hello!", "Hey there!"],
        "test": ["Test successful!", "Working!", "✅"]
      };
      console.log('⚠️ Using default data due to error');
    }
  }

  findReply(message) {
    if (!message || typeof message !== 'string') return null;
    
    const msg = message.toLowerCase().trim();
    if (msg.length === 0) return null;
    
    // 1. Exact match
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
    // 2. Word-by-word match
    const words = msg.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && this.replies[word]) {
        const replies = this.replies[word];
        return replies[Math.floor(Math.random() * replies.length)];
      }
    }
    
    // 3. No match found
    return null;
  }

  getRandomReaction() {
    if (this.reactions.length === 0) return '👍';
    return this.reactions[Math.floor(Math.random() * this.reactions.length)];
  }

  getRandomVoice() {
    if (this.voices.length === 0) return null;
    return this.voices[Math.floor(Math.random() * this.voices.length)];
  }

  getRandomVideo() {
    if (this.videos.length === 0) return null;
    return this.videos[Math.floor(Math.random() * this.videos.length)];
  }
}

// ============================================
// TYPING SYSTEM CLASS
// ============================================
class TypingSystem {
  constructor(client) {
    this.client = client;
    this.minDelay = TYPING_MIN_DELAY;
    this.maxDelay = TYPING_MAX_DELAY;
    this.isTyping = false;
  }

  getRandomDelay() {
    return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
  }

  async simulateTyping(chatId) {
    if (this.isTyping) return;
    
    this.isTyping = true;
    try {
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      const duration = this.getRandomDelay();
      await new Promise(resolve => setTimeout(resolve, duration));
      
    } catch (error) {
      // Silent fail as per specification
    } finally {
      this.isTyping = false;
    }
  }

  async simulateInlineTyping() {
    const duration = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

// ============================================
// RATE LIMITER CLASS
// ============================================
class RateLimiter {
  constructor(maxPerMinute = 50) {
    this.maxPerMinute = maxPerMinute;
    this.actionTimestamps = [];
    this.windowMs = 60000;
  }

  canPerformAction() {
    const now = Date.now();
    
    // Clean old timestamps
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    // Check limit
    if (this.actionTimestamps.length < this.maxPerMinute) {
      this.actionTimestamps.push(now);
      return true;
    }
    
    return false;
  }

  getRemainingActions() {
    const now = Date.now();
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return this.maxPerMinute - this.actionTimestamps.length;
  }

  getWaitTime() {
    const now = Date.now();
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (this.actionTimestamps.length < this.maxPerMinute) {
      return 0;
    }
    
    const oldest = this.actionTimestamps[0];
    return this.windowMs - (now - oldest);
  }
}

// ============================================
// STATE MACHINE CLASS
// ============================================
class StateMachine {
  constructor() {
    this.currentState = 'IDLE';
    this.states = {
      'IDLE': 'Waiting for messages',
      'MESSAGE_DETECTED': 'New message received',
      'VALIDATION': 'Checking message validity',
      'DECISION': 'Deciding response',
      'TYPING': 'Simulating typing',
      'RESPOND': 'Sending response',
      'REACTION': 'Adding reaction',
      'COOLDOWN': 'Cooling down',
      'SILENT': 'No action taken'
    };
    this.stateHistory = [];
  }

  transitionTo(state) {
    if (this.states[state]) {
      const previous = this.currentState;
      this.currentState = state;
      this.stateHistory.push({
        from: previous,
        to: state,
        timestamp: Date.now()
      });
      
      // Keep only last 100 states
      if (this.stateHistory.length > 100) {
        this.stateHistory.shift();
      }
      
      if (LOG_LEVEL === 'debug') {
        console.log(`🔄 State: ${previous} → ${state}`);
      }
      return true;
    }
    return false;
  }

  getCurrentState() {
    return this.currentState;
  }

  getStateInfo() {
    return {
      current: this.currentState,
      description: this.states[this.currentState],
      history: this.stateHistory.slice(-5)
    };
  }
}

// ============================================
// MESSAGE HANDLER CLASS
// ============================================
class MessageHandler {
  constructor(client, dataManager, typingSystem, rateLimiter) {
    this.client = client;
    this.data = dataManager;
    this.typing = typingSystem;
    this.rateLimiter = rateLimiter;
    this.stateMachine = new StateMachine();
    this.lastActionTime = 0;
    this.cooldownPeriod = 1000;
  }

  async shouldProcessMessage(message) {
    // Golden Rule 1: If data not found → stay silent
    // Golden Rule 2: If rule unclear → do nothing
    // Golden Rule 3: Never guess user intent
    // Golden Rule 4: Never generate content dynamically
    
    // Skip if no message text
    if (!message.message || message.message.trim() === '') {
      return false;
    }
    
    // Skip if from bot
    if (message.fromId && message.fromId.botId) {
      return false;
    }
    
    // Skip if userbot
    if (message.viaBotId) {
      return false;
    }
    
    // Check if private chat
    const isPrivate = message.chat && message.chat.className === 'PeerUser';
    if (!isPrivate) {
      // Allow only if explicitly enabled for groups
      return false;
    }
    
    // Check rate limit
    if (!this.rateLimiter.canPerformAction()) {
      const waitTime = Math.ceil(this.rateLimiter.getWaitTime() / 1000);
      if (LOG_LEVEL === 'debug') {
        console.log(`⏳ Rate limit reached. Wait ${waitTime}s`);
      }
      return false;
    }
    
    // Check cooldown between actions
    const now = Date.now();
    if (now - this.lastActionTime < this.cooldownPeriod) {
      return false;
    }
    
    return true;
  }

  async handleNewMessage(event) {
    try {
      this.stateMachine.transitionTo('MESSAGE_DETECTED');
      
      if (!event.message) {
        this.stateMachine.transitionTo('SILENT');
        return;
      }
      
      const message = event.message;
      
      // Validation
      this.stateMachine.transitionTo('VALIDATION');
      if (!await this.shouldProcessMessage(message)) {
        this.stateMachine.transitionTo('SILENT');
        return;
      }
      
      // Decision
      this.stateMachine.transitionTo('DECISION');
      const replyText = this.data.findReply(message.message);
      
      if (!replyText) {
        // No matching reply found - stay silent
        this.stateMachine.transitionTo('SILENT');
        return;
      }
      
      // Typing simulation
      this.stateMachine.transitionTo('TYPING');
      await this.typing.simulateTyping(message.chatId);
      
      // Send response
      this.stateMachine.transitionTo('RESPOND');
      await this.client.sendMessage(message.chatId, {
        message: replyText
      });
      
      this.lastActionTime = Date.now();
      
      // Random reaction (30% chance)
      if (Math.random() < 0.3 && this.rateLimiter.canPerformAction()) {
        this.stateMachine.transitionTo('REACTION');
        const reaction = this.data.getRandomReaction();
        try {
          await this.client.invoke({
            _: 'messages.sendReaction',
            peer: await this.client.getInputEntity(message.chatId),
            msgId: message.id,
            reaction: [{ _: 'reactionEmoji', emoticon: reaction }]
          });
        } catch (error) {
          // Silent fail
        }
      }
      
      // Cooldown
      this.stateMachine.transitionTo('COOLDOWN');
      const cooldown = Math.random() * 2000 + 1000;
      await new Promise(resolve => setTimeout(resolve, cooldown));
      
      this.stateMachine.transitionTo('IDLE');
      
    } catch (error) {
      console.error('Error in message handler:', error.message);
      this.stateMachine.transitionTo('SILENT');
    }
  }
}

// ============================================
// HEALTH MONITOR
// ============================================
class HealthMonitor {
  constructor(messageHandler, rateLimiter) {
    this.messageHandler = messageHandler;
    this.rateLimiter = rateLimiter;
    this.startTime = Date.now();
    this.messageCount = 0;
    this.responseCount = 0;
  }
  
  incrementMessageCount() {
    this.messageCount++;
  }
  
  incrementResponseCount() {
    this.responseCount++;
  }
  
  getStatus() {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    
    return {
      botName: BOT_NAME,
      uptime: `${hours}h ${minutes}m`,
      messagesReceived: this.messageCount,
      responsesSent: this.responseCount,
      responseRate: this.messageCount > 0 ? 
        ((this.responseCount / this.messageCount) * 100).toFixed(1) + '%' : '0%',
      currentState: this.messageHandler.stateMachine.getCurrentState(),
      remainingActions: this.rateLimiter.getRemainingActions(),
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================
// UPDATED MAIN APPLICATION WITH HTTP SERVER
// ============================================
async function main() {
  console.log('='.repeat(50));
  console.log(`🚀 ${BOT_NAME} - Starting on Render Web Service`);
  console.log('='.repeat(50));
  console.log(`Version: 1.3.0`);
  console.log(`Classification: Production / Zero-AI-Dependency / High Safety`);
  console.log(`External AI: ${false}`);
  console.log(`Render Web Service: ${true}`);
  console.log(`Port: ${PORT}`);
  console.log('='.repeat(50));
  
  // Start HTTP Server First (Important for Render)
  const httpServer = startHttpServer();
  
  // Initialize Telegram Client
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true
  });
  
  // Initialize systems
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  const rateLimiter = new RateLimiter(MAX_ACTIONS_PER_MINUTE);
  const typingSystem = new TypingSystem(client);
  const messageHandler = new MessageHandler(client, dataManager, typingSystem, rateLimiter);
  const healthMonitor = new HealthMonitor(messageHandler, rateLimiter);
  
  try {
    // Connect to Telegram
    console.log('🔗 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected to Telegram');
    
    // Get user info
    const me = await client.getMe();
    console.log(`✅ Logged in as: ${me.firstName}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`✅ Username: @${me.username || 'N/A'}`);
    console.log(`✅ User ID: ${me.id}`);
    
    // Setup event handlers
    client.addEventHandler(async (event) => {
      healthMonitor.incrementMessageCount();
      await messageHandler.handleNewMessage(event);
      if (messageHandler.stateMachine.getCurrentState() === 'RESPOND') {
        healthMonitor.incrementResponseCount();
      }
    });
    
    // Log status periodically
    setInterval(() => {
      const status = healthMonitor.getStatus();
      console.log('\n📊 Health Check:');
      console.log(`   State: ${status.currentState}`);
      console.log(`   Uptime: ${status.uptime}`);
      console.log(`   Messages: ${status.messagesReceived}`);
      console.log(`   Responses: ${status.responsesSent}`);
      console.log(`   Rate Limit: ${status.remainingActions}/${MAX_ACTIONS_PER_MINUTE}`);
      console.log(`   HTTP Port: ${PORT}`);
      console.log('─'.repeat(30));
    }, 300000); // Every 5 minutes
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${BOT_NAME} is now ONLINE and running!`);
    console.log('='.repeat(50));
    console.log('\n📋 System Status:');
    console.log(`   • Rule-based intelligence: ACTIVE`);
    console.log(`   • External AI: DISABLED`);
    console.log(`   • Rate limiting: ${MAX_ACTIONS_PER_MINUTE}/min`);
    console.log(`   • Typing delay: ${TYPING_MIN_DELAY}-${TYPING_MAX_DELAY}ms`);
    console.log(`   • HTTP Server: Port ${PORT} (Render compatible)`);
    console.log(`   • Current state: IDLE`);
    console.log('='.repeat(50));
    
    // Keep process alive for Render
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM - Shutting down gracefully...');
      await client.disconnect();
      httpServer.close();
      console.log('✅ Disconnected from Telegram');
      console.log('✅ HTTP Server stopped');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT - Shutting down...');
      await client.disconnect();
      httpServer.close();
      console.log('✅ Disconnected from Telegram');
      console.log('✅ HTTP Server stopped');
      process.exit(0);
    });
    
    // Prevent exit
    setInterval(() => {
      // Keep alive heartbeat
      if (LOG_LEVEL === 'debug') {
        console.log('❤️  Heartbeat - System is alive');
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Start the application
main();
