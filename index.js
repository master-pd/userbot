// ============================================
// YOUR CRUSH Userbot - Main Application
// Optimized for Render Web Service
// ============================================

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// ============================================
// CONFIGURATION FROM RENDER ENVIRONMENT VARIABLES
// ============================================
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING;
const BOT_NAME = process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 ⟵𝗼_𝟬";
const OWNER_ID = parseInt(process.env.OWNER_ID) || 0;
const MAX_ACTIONS_PER_MINUTE = parseInt(process.env.MAX_ACTIONS_PER_MINUTE) || 30; // Reduced
const TYPING_MIN_DELAY = parseInt(process.env.TYPING_MIN_DELAY) || 1000; // Increased
const TYPING_MAX_DELAY = parseInt(process.env.TYPING_MAX_DELAY) || 5000; // Increased
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const PORT = process.env.PORT || 3000;

// ============================================
// VALIDATION
// ============================================
if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing required environment variables!');
  process.exit(1);
}

// ============================================
// HTTP SERVER FOR RENDER (REQUIRED)
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
        platform: 'Render',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`${BOT_NAME} is running`);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server: Port ${PORT}`);
  });

  return server;
}

// ============================================
// ENHANCED CONNECTION MANAGER
// ============================================
class ConnectionManager {
  constructor(client) {
    this.client = client;
    this.connected = false;
    this.reconnectCount = 0;
    this.maxReconnects = 15;
  }

  async connectWithRetry() {
    console.log('🔗 Connecting to Telegram...');
    
    // Optimized connection settings for Render
    const connectionParams = {
      connectionRetries: 10,
      timeout: 25,
      useWSS: true,
      autoReconnect: true,
      requestRetries: 3,
      useIPV6: false,
      floodSleepThreshold: 60,
      deviceModel: 'Render Server',
      systemVersion: 'Node.js',
      appVersion: '2.0.0',
      langCode: 'en',
      systemLangCode: 'en',
    };

    try {
      await this.client.connect();
      this.connected = true;
      this.reconnectCount = 0;
      console.log('✅ Connected to Telegram');
      return true;
    } catch (error) {
      this.reconnectCount++;
      console.error(`❌ Connection failed (${this.reconnectCount}/${this.maxReconnects}):`, error.message);
      
      if (this.reconnectCount < this.maxReconnects) {
        const delay = Math.min(5000 * this.reconnectCount, 30000);
        console.log(`⏳ Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connectWithRetry();
      }
      return false;
    }
  }

  async keepAlive() {
    setInterval(async () => {
      if (this.connected) {
        try {
          await this.client.invoke(new Api.ping({ pingId: BigInt(Date.now()) }));
        } catch (error) {
          console.log('⚠️ Keep-alive failed, will reconnect');
          this.connected = false;
          await this.connectWithRetry();
        }
      }
    }, 45000);
  }
}

// ============================================
// DATA MANAGER CLASS
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
  }

  async loadAllData() {
    try {
      const replyPath = path.join(__dirname, 'data', 'reply.json');
      const replyData = await fs.readFile(replyPath, 'utf8');
      this.replies = JSON.parse(replyData);
      console.log(`✅ Loaded ${Object.keys(this.replies).length} reply patterns`);
    } catch (error) {
      console.error('❌ Error loading reply data:', error.message);
      this.replies = {
        "hi": ["Hello!", "Hi there!", "Hey!"],
        "hello": ["Hi!", "Hello!", "Hey there!"],
        "how are you": ["I'm good!", "Doing well!", "All good!"],
        "test": ["Test successful!", "Working!", "✅"]
      };
    }
  }

  findReply(message) {
    if (!message || typeof message !== 'string') return null;
    
    const msg = message.toLowerCase().trim();
    if (msg.length < 2) return null;
    
    // Exact match
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
    // Word match
    const words = msg.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && this.replies[word]) {
        const replies = this.replies[word];
        return replies[Math.floor(Math.random() * replies.length)];
      }
    }
    
    return null;
  }

  getRandomReaction() {
    return this.reactions[Math.floor(Math.random() * this.reactions.length)];
  }
}

// ============================================
// SIMPLIFIED MESSAGE HANDLER
// ============================================
class MessageHandler {
  constructor(client, dataManager) {
    this.client = client;
    this.data = dataManager;
    this.lastAction = new Map();
    this.actionCount = 0;
    this.actionResetTime = Date.now();
  }

  canRespond(chatId) {
    const now = Date.now();
    const last = this.lastAction.get(chatId) || 0;
    
    // Per-chat cooldown
    if (now - last < 2000) return false;
    
    // Global rate limit
    if (now - this.actionResetTime > 60000) {
      this.actionCount = 0;
      this.actionResetTime = now;
    }
    
    if (this.actionCount >= MAX_ACTIONS_PER_MINUTE) return false;
    
    this.lastAction.set(chatId, now);
    this.actionCount++;
    return true;
  }

  async handleMessage(event) {
    try {
      const message = event.message;
      if (!message || !message.message) return;
      
      // Only respond to private messages
      if (message.chat && message.chat.className === 'PeerUser') {
        if (!this.canRespond(message.chatId)) return;
        
        const replyText = this.data.findReply(message.message);
        if (replyText) {
          // Simulate typing
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
          // Send reply
          await this.client.sendMessage(message.chatId, {
            message: replyText
          });
          
          console.log(`💬 Replied to ${message.chatId}`);
          
          // Optional reaction
          if (Math.random() < 0.25) {
            try {
              const reaction = this.data.getRandomReaction();
              await this.client.invoke({
                _: 'messages.sendReaction',
                peer: await this.client.getInputEntity(message.chatId),
                msgId: message.id,
                reaction: [{ _: 'reactionEmoji', emoticon: reaction }]
              });
            } catch (e) {
              // Ignore reaction errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Message handling error:', error.message);
    }
  }
}

// ============================================
// MAIN APPLICATION
// ============================================
async function main() {
  console.log('='.repeat(50));
  console.log(`🚀 ${BOT_NAME} - Starting on Render`);
  console.log('='.repeat(50));
  console.log(`Render Web Service Optimized`);
  console.log(`Port: ${PORT}`);
  console.log('='.repeat(50));
  
  // Start HTTP server (required by Render)
  const httpServer = startHttpServer();
  
  // Initialize Telegram client with enhanced settings
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 10,
    timeout: 25,
    useWSS: true,
    autoReconnect: true,
    requestRetries: 3,
    useIPV6: false,
    floodSleepThreshold: 60,
    deviceModel: 'Render Server',
    systemVersion: 'Node.js',
    appVersion: '2.0.0',
    langCode: 'en',
    systemLangCode: 'en',
  });
  
  // Initialize components
  const connectionManager = new ConnectionManager(client);
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  const messageHandler = new MessageHandler(client, dataManager);
  
  try {
    // Connect with retry mechanism
    console.log('🔄 Starting connection process...');
    const connected = await connectionManager.connectWithRetry();
    
    if (!connected) {
      throw new Error('Could not connect to Telegram after retries');
    }
    
    // Get user info
    const me = await client.getMe();
    console.log(`✅ Logged in as: ${me.firstName || ''} ${me.lastName || ''}`.trim());
    console.log(`✅ Username: @${me.username || 'N/A'}`);
    console.log(`✅ User ID: ${me.id}`);
    
    // Setup keep-alive
    await connectionManager.keepAlive();
    
    // Setup message handler with error handling
    client.addEventHandler((event) => {
      messageHandler.handleMessage(event);
    }, {
      onError: (error) => {
        console.error('Event handler error:', error.message);
      }
    });
    
    // Success message
    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${BOT_NAME} is ONLINE!`);
    console.log('='.repeat(50));
    console.log('\n📊 Status:');
    console.log(`   • HTTP Server: Port ${PORT}`);
    console.log(`   • Telegram: Connected`);
    console.log(`   • Reply Patterns: ${Object.keys(dataManager.replies).length}`);
    console.log(`   • Rate Limit: ${MAX_ACTIONS_PER_MINUTE}/minute`);
    console.log('='.repeat(50));
    
    // Handle shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutdown signal received...');
      try {
        await client.disconnect();
        httpServer.close();
        console.log('✅ Clean shutdown completed');
      } catch (e) {
        console.error('Shutdown error:', e.message);
      }
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Heartbeat
    setInterval(() => {
      if (LOG_LEVEL === 'debug') {
        console.log('💓 Bot heartbeat');
      }
    }, 60000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    // Try to restart after delay
    console.log('🔄 Restarting in 15 seconds...');
    setTimeout(() => {
      console.log('🔄 Attempting restart...');
      main().catch(e => {
        console.error('Restart failed:', e.message);
        process.exit(1);
      });
    }, 15000);
  }
}

// Start application
main();
