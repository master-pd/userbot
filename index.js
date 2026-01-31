// index.js - Render-optimized version
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables from Render
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING;
const BOT_NAME = process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 ⟵𝗼_𝟬";

// Validate required env vars
if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ Missing required environment variables in Render!');
  console.error('Please set: API_ID, API_HASH, SESSION_STRING');
  process.exit(1);
}

// Data Manager
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = [];
    this.voices = [];
    this.videos = [];
  }

  async loadAllData() {
    try {
      // Load reply patterns
      const replyData = await fs.readFile(path.join(__dirname, 'data', 'reply.json'), 'utf8');
      this.replies = JSON.parse(replyData);
      
      // Load reactions
      const reactionData = await fs.readFile(path.join(__dirname, 'data', 'reaction.json'), 'utf8');
      this.reactions = JSON.parse(reactionData).reactions;
      
      // Load voices
      const voiceData = await fs.readFile(path.join(__dirname, 'data', 'voice.json'), 'utf8');
      this.voices = JSON.parse(voiceData).voices;
      
      // Load videos
      const videoData = await fs.readFile(path.join(__dirname, 'data', 'video.json'), 'utf8');
      this.videos = JSON.parse(videoData).videos;
      
      console.log('✅ All data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error.message);
      // Initialize with empty data if files not found
      this.replies = {};
      this.reactions = ['👍', '❤️', '🔥', '😂'];
      this.voices = [];
      this.videos = [];
    }
  }

  findReply(message) {
    const msg = message.toLowerCase().trim();
    
    // Exact match
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
    // Partial match (word by word)
    const words = msg.split(' ');
    for (const word of words) {
      if (this.replies[word] && word.length > 2) {
        const replies = this.replies[word];
        return replies[Math.floor(Math.random() * replies.length)];
      }
    }
    
    return null; // No match found
  }

  getRandomReaction() {
    if (this.reactions.length === 0) return null;
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

// Typing System
class TypingSystem {
  constructor(client) {
    this.client = client;
    this.minDelay = parseInt(process.env.TYPING_MIN_DELAY) || 800;
    this.maxDelay = parseInt(process.env.TYPING_MAX_DELAY) || 4000;
  }

  getRandomDelay() {
    return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
  }

  async simulateTyping(chatId) {
    try {
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      // Random typing duration
      const duration = this.getRandomDelay();
      await new Promise(resolve => setTimeout(resolve, duration));
    } catch (error) {
      // Silent fail
    }
  }

  async simulateInlineTyping() {
    const duration = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

// Rate Limiter
class RateLimiter {
  constructor(maxPerMinute = 50) {
    this.maxPerMinute = maxPerMinute;
    this.actionTimestamps = [];
    this.windowMs = 60000; // 1 minute
  }

  canPerformAction() {
    const now = Date.now();
    
    // Remove old timestamps
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    // Check if under limit
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

// State Machine
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
  }

  transitionTo(state) {
    if (this.states[state]) {
      this.currentState = state;
      return true;
    }
    return false;
  }

  getCurrentState() {
    return this.currentState;
  }
}

// Message Handler
class MessageHandler {
  constructor(client, dataManager, typingSystem, rateLimiter) {
    this.client = client;
    this.data = dataManager;
    this.typing = typingSystem;
    this.rateLimiter = rateLimiter;
    this.stateMachine = new StateMachine();
  }

  async handleNewMessage(event) {
    this.stateMachine.transitionTo('MESSAGE_DETECTED');
    
    // Skip if not a message
    if (!event.message || !event.message.message) {
      this.stateMachine.transitionTo('SILENT');
      return;
    }

    const message = event.message;
    
    // Skip if rate limit exceeded
    if (!this.rateLimiter.canPerformAction()) {
      console.log('⚠️ Rate limit reached, skipping action');
      this.stateMachine.transitionTo('COOLDOWN');
      return;
    }

    // Validation
    this.stateMachine.transitionTo('VALIDATION');
    
    // Skip bots
    if (message.fromId && message.fromId.botId) {
      this.stateMachine.transitionTo('SILENT');
      return;
    }

    // Skip channels
    if (message.peerId && message.peerId.channelId) {
      this.stateMachine.transitionTo('SILENT');
      return;
    }

    // Skip if message is empty or media-only
    if (!message.message || message.message.trim() === '') {
      this.stateMachine.transitionTo('SILENT');
      return;
    }

    // Decision making
    this.stateMachine.transitionTo('DECISION');
    
    const reply = this.data.findReply(message.message);
    
    if (!reply) {
      this.stateMachine.transitionTo('SILENT');
      return;
    }

    // Simulate typing
    this.stateMachine.transitionTo('TYPING');
    await this.typing.simulateTyping(message.chatId);

    // Send response
    this.stateMachine.transitionTo('RESPOND');
    await this.client.sendMessage(message.chatId, { message: reply });

    // Randomly send reaction
    if (Math.random() > 0.7) { // 30% chance
      this.stateMachine.transitionTo('REACTION');
      const reaction = this.data.getRandomReaction();
      if (reaction && this.rateLimiter.canPerformAction()) {
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
    }

    this.stateMachine.transitionTo('COOLDOWN');
    
    // Random cooldown between actions
    const cooldown = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, cooldown));
    
    this.stateMachine.transitionTo('IDLE');
  }
}

// Main function
async function main() {
  console.log(`🚀 ${BOT_NAME} Starting on Render...`);
  
  // Initialize session
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  // Initialize systems
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  const rateLimiter = new RateLimiter(parseInt(process.env.MAX_ACTIONS_PER_MINUTE) || 50);
  const typingSystem = new TypingSystem(client);
  const messageHandler = new MessageHandler(client, dataManager, typingSystem, rateLimiter);

  try {
    // Connect to Telegram
    await client.connect();
    console.log('✅ Connected to Telegram');
    
    // Get user info
    const me = await client.getMe();
    console.log(`✅ Logged in as: ${me.firstName} (@${me.username})`);
    
    // Setup message handler
    client.addEventHandler(async (event) => {
      try {
        await messageHandler.handleNewMessage(event);
      } catch (error) {
        // Silent fail as per error policy
        console.error('Silent error:', error.message);
      }
    });
    
    console.log(`✅ ${BOT_NAME} is ONLINE on Render!`);
    
    // Keep alive - Render requires continuous running
    setInterval(() => {
      console.log(`❤️  Heartbeat - State: ${messageHandler.stateMachine.getCurrentState()} | Remaining actions: ${rateLimiter.getRemainingActions()}`);
    }, 300000); // Every 5 minutes
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Handle Render shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main();
