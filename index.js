// ============================================
// YOUR CRUSH Userbot - Main Application
// Fully Offline, AI-Free, Rule-Based System
// Optimized for Render Deployment
// ============================================

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { NewMessage } = require('telegram/events');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// ============================================
// CONFIGURATION FROM RENDER ENVIRONMENT VARIABLES
// ============================================
const API_ID = parseInt(process.env.API_ID) || 0;
const API_HASH = process.env.API_HASH || '';
const SESSION_STRING = process.env.SESSION_STRING || '';
const BOT_NAME = process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 🔥";
const OWNER_ID = parseInt(process.env.OWNER_ID) || 0;
const MAX_ACTIONS_PER_MINUTE = parseInt(process.env.MAX_ACTIONS_PER_MINUTE) || 50;
const TYPING_MIN_DELAY = parseInt(process.env.TYPING_MIN_DELAY) || 800;
const TYPING_MAX_DELAY = parseInt(process.env.TYPING_MAX_DELAY) || 4000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const PORT = process.env.PORT || 3000;

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
// HTTP SERVER FOR RENDER HEALTH CHECKS
// ============================================
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: BOT_NAME,
    service: 'Telegram Userbot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP server running on port ${PORT}`);
});

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
        "hi": ["Hello! 👋", "Hi there! 😊", "Hey! ❤️"],
        "hello": ["Hi! 😄", "Hello! 💖", "Hey there! 🌸"],
        "test": ["Test successful! ✅", "Working! 🚀", "All good! 👍"],
        "i love you": ["Love you too! ❤️", "Aww 😘", "You're sweet! 💕"],
        "how are you": ["I'm good! 😊", "All good! 😄", "Feeling great! 🌟"]
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
      // Silent fail
    } finally {
      this.isTyping = false;
    }
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
}

// ============================================
// MESSAGE HANDLER
// ============================================
class MessageHandler {
  constructor(client, dataManager, typingSystem, rateLimiter) {
    this.client = client;
    this.data = dataManager;
    this.typing = typingSystem;
    this.rateLimiter = rateLimiter;
    this.lastActionTime = 0;
    this.cooldownPeriod = 1000;
    this.stats = {
      messagesReceived: 0,
      responsesSent: 0,
      errors: 0
    };
  }

  async shouldProcessMessage(message) {
    // Check if valid message
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    // Skip if from bot
    if (message.out) {
      return false;
    }
    
    // Only private messages
    if (message.isGroup || message.isChannel) {
      return false;
    }
    
    // Check rate limit
    if (!this.rateLimiter.canPerformAction()) {
      return false;
    }
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastActionTime < this.cooldownPeriod) {
      return false;
    }
    
    return true;
  }

  async handleNewMessage(event) {
    try {
      const message = event.message;
      this.stats.messagesReceived++;
      
      if (!await this.shouldProcessMessage(message)) {
        return;
      }
      
      const replyText = this.data.findReply(message.message);
      if (!replyText) {
        return; // No matching reply - stay silent
      }
      
      // Simulate typing
      await this.typing.simulateTyping(message.chatId);
      
      // Send reply
      await this.client.sendMessage(message.chatId, {
        message: replyText
      });
      
      this.lastActionTime = Date.now();
      this.stats.responsesSent++;
      
      // Random reaction (25% chance)
      if (Math.random() < 0.25 && this.rateLimiter.canPerformAction()) {
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
      
      console.log(`💌 Replied to ${message.chatId}: ${replyText.substring(0, 30)}...`);
      
    } catch (error) {
      this.stats.errors++;
      if (LOG_LEVEL === 'debug') {
        console.error('Message handler error:', error.message);
      }
    }
  }
}

// ============================================
// MAIN APPLICATION
// ============================================
async function main() {
  console.log('='.repeat(60));
  console.log(`🚀 ${BOT_NAME} - Telegram Userbot`);
  console.log('='.repeat(60));
  console.log(`Version: 2.0.0`);
  console.log(`Environment: Render Worker`);
  console.log(`AI Dependency: None (Rule-based)`);
  console.log(`Rate Limit: ${MAX_ACTIONS_PER_MINUTE}/minute`);
  console.log('='.repeat(60));
  
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
  
  try {
    // Connect to Telegram
    console.log('🔗 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected to Telegram');
    
    // Get user info
    const me = await client.getMe();
    console.log(`✅ Logged in as: ${me.firstName || ''}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`✅ Username: @${me.username || 'N/A'}`);
    console.log(`✅ User ID: ${me.id}`);
    
    // Setup event handler
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({ incoming: true }));
    
    // Status monitoring
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      console.log('\n📊 System Status:');
      console.log(`   Uptime: ${hours}h ${minutes}m`);
      console.log(`   Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`   Responses: ${messageHandler.stats.responsesSent}`);
      console.log(`   Rate Limit: ${rateLimiter.getRemainingActions()}/${MAX_ACTIONS_PER_MINUTE}`);
      console.log('─'.repeat(40));
    }, 300000); // Every 5 minutes
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is now ONLINE and ready!`);
    console.log('='.repeat(60));
    console.log('\n📋 Features:');
    console.log(`   • Private message replies`);
    console.log(`   • Typing simulation`);
    console.log(`   • Random reactions`);
    console.log(`   • Rate limiting`);
    console.log(`   • HTTP health endpoint`);
    console.log('='.repeat(60));
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM - Shutting down...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT - Shutting down...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Start the application
main();
