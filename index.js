// ============================================
// YOUR CRUSH Userbot - RENDER OPTIMIZED
// ============================================

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// ============================================
// CONFIGURATION
// ============================================
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING;
const BOT_NAME = process.env.BOT_NAME || "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛";
const PORT = process.env.PORT || 3000;

// ============================================
// VALIDATION
// ============================================
if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing environment variables');
  console.error('Required: API_ID, API_HASH, SESSION_STRING');
  process.exit(1);
}

// ============================================
// HTTP SERVER FOR RENDER
// ============================================
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      bot: BOT_NAME,
      service: 'Telegram Userbot',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP Server started on port ${PORT}`);
});

// ============================================
// RENDER-OPTIMIZED TELEGRAM CLIENT
// ============================================
const stringSession = new StringSession(SESSION_STRING);

// CRITICAL: Render-optimized settings
const client = new TelegramClient(stringSession, API_ID, API_HASH, {
  connectionRetries: 15,           // Increased for Render
  timeout: 30,                     // 30 seconds timeout
  useWSS: true,                    // Use WebSocket Secure
  autoReconnect: true,             // Auto-reconnect enabled
  requestRetries: 5,               // Request retries
  useIPV6: false,                  // Disable IPv6 (Render issues)
  floodSleepThreshold: 120,        // Higher flood threshold
  deviceModel: 'Render Server',    // Device info
  systemVersion: 'Node.js',        // System
  appVersion: '2.0.0',             // App version
  langCode: 'en',                  // Language
  systemLangCode: 'en',            // System language
  // Connection parameters
  connection: {
    transport: 'websocket',
    wsOptions: {
      origin: 'https://web.telegram.org'
    }
  }
});

// ============================================
// DATA MANAGER
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
  }

  async loadData() {
    try {
      const replyPath = path.join(__dirname, 'data', 'reply.json');
      const replyData = await fs.readFile(replyPath, 'utf8');
      this.replies = JSON.parse(replyData);
      console.log(`✅ Loaded ${Object.keys(this.replies).length} reply patterns`);
    } catch (error) {
      console.error('❌ Error loading replies:', error.message);
      this.replies = {
        "hi": ["Hello!", "Hi there!", "Hey!"],
        "hello": ["Hi!", "Hello!", "Hey there!"],
        "how are you": ["I'm good!", "Doing well!", "All good!"],
        "test": ["Test successful!", "Working!", "✅"],
        "i love you": ["Aww ❤️", "Love you too!", "You're sweet!"],
        "good morning": ["Good morning!", "Morning! ☀️", "Have a great day!"],
        "good night": ["Good night!", "Sweet dreams! 🌙", "Sleep well!"]
      };
    }
  }

  findReply(message) {
    if (!message || typeof message !== 'string') return null;
    
    const msg = message.toLowerCase().trim();
    if (msg.length < 2) return null;
    
    // 1. Exact match
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
    // 2. Word match
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
// CONNECTION MANAGER WITH RETRY LOGIC
// ============================================
class ConnectionManager {
  constructor(client) {
    this.client = client;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnects = 20;
  }

  async connect() {
    console.log('🔗 Attempting to connect to Telegram...');
    
    try {
      await this.client.connect();
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Successfully connected to Telegram!');
      return true;
    } catch (error) {
      this.reconnectAttempts++;
      console.error(`❌ Connection failed (attempt ${this.reconnectAttempts}):`, error.message);
      
      if (this.reconnectAttempts < this.maxReconnects) {
        const delay = Math.min(this.reconnectAttempts * 3000, 15000);
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect();
      }
      
      console.error('❌ Max reconnection attempts reached');
      return false;
    }
  }

  async keepAlive() {
    setInterval(async () => {
      if (this.connected) {
        try {
          await this.client.invoke(new Api.ping({ pingId: BigInt(Date.now()) }));
        } catch (error) {
          console.log('⚠️ Keep-alive failed, reconnecting...');
          this.connected = false;
          await this.connect();
        }
      }
    }, 45000); // Every 45 seconds
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================
class MessageHandler {
  constructor(client, dataManager) {
    this.client = client;
    this.data = dataManager;
    this.cooldown = new Map();
    this.actionCount = 0;
    this.resetTime = Date.now();
  }

  canRespond(chatId) {
    const now = Date.now();
    
    // Per-chat cooldown (2 seconds)
    const lastTime = this.cooldown.get(chatId) || 0;
    if (now - lastTime < 2000) return false;
    
    // Global rate limit (30 per minute)
    if (now - this.resetTime > 60000) {
      this.actionCount = 0;
      this.resetTime = now;
    }
    
    if (this.actionCount >= 30) return false;
    
    this.cooldown.set(chatId, now);
    this.actionCount++;
    return true;
  }

  async handleMessage(event) {
    try {
      const message = event.message;
      if (!message || !message.message || !message.chat) return;
      
      // Only private messages
      if (message.chat.className === 'PeerUser') {
        const chatId = message.chatId;
        
        if (!this.canRespond(chatId)) return;
        
        const replyText = this.data.findReply(message.message);
        if (replyText) {
          // Simulate typing
          const typingDelay = 800 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, typingDelay));
          
          // Send message
          await this.client.sendMessage(chatId, { message: replyText });
          console.log(`💬 Replied to ${chatId}`);
          
          // Random reaction (25% chance)
          if (Math.random() < 0.25) {
            try {
              const reaction = this.data.getRandomReaction();
              await this.client.invoke({
                _: 'messages.sendReaction',
                peer: await this.client.getInputEntity(chatId),
                msgId: message.id,
                reaction: [{ _: 'reactionEmoji', emoticon: reaction }]
              });
            } catch (error) {
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
// HEALTH MONITOR
// ============================================
class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.messageCount = 0;
    this.responseCount = 0;
  }
  
  incrementMessages() { this.messageCount++; }
  incrementResponses() { this.responseCount++; }
  
  getStatus() {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    
    return {
      botName: BOT_NAME,
      uptime: `${hours}h ${minutes}m`,
      messages: this.messageCount,
      responses: this.responseCount,
      responseRate: this.messageCount > 0 ? 
        ((this.responseCount / this.messageCount) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// ============================================
// MAIN APPLICATION
// ============================================
async function main() {
  console.log('='.repeat(50));
  console.log(`🚀 ${BOT_NAME} - Starting on Render`);
  console.log('='.repeat(50));
  console.log('Render Optimized Version 2.0');
  console.log(`Port: ${PORT}`);
  console.log('='.repeat(50));
  
  // Initialize components
  const dataManager = new DataManager();
  await dataManager.loadData();
  
  const connectionManager = new ConnectionManager(client);
  const messageHandler = new MessageHandler(client, dataManager);
  const healthMonitor = new HealthMonitor();
  
  try {
    // Connect to Telegram with retry
    const connected = await connectionManager.connect();
    if (!connected) {
      throw new Error('Failed to connect to Telegram');
    }
    
    // Get user info
    const me = await client.getMe();
    console.log(`✅ Logged in as: ${me.firstName || ''} ${me.lastName || ''}`.trim());
    console.log(`✅ Username: @${me.username || 'N/A'}`);
    console.log(`✅ User ID: ${me.id}`);
    
    // Setup keep-alive
    await connectionManager.keepAlive();
    
    // Setup message handler
    client.addEventHandler((event) => {
      healthMonitor.incrementMessages();
      messageHandler.handleMessage(event);
    });
    
    // Log status periodically
    setInterval(() => {
      const status = healthMonitor.getStatus();
      console.log('\n📊 Health Check:');
      console.log(`   Uptime: ${status.uptime}`);
      console.log(`   Messages: ${status.messages}`);
      console.log(`   Responses: ${status.responses}`);
      console.log(`   Response Rate: ${status.responseRate}`);
      console.log('─'.repeat(30));
    }, 300000); // Every 5 minutes
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${BOT_NAME} is ONLINE and READY!`);
    console.log('='.repeat(50));
    console.log('\n📋 Features:');
    console.log(`   • Auto-reply to private messages`);
    console.log(`   • Smart reply matching`);
    console.log(`   • Reaction support`);
    console.log(`   • Rate limiting (30/min)`);
    console.log(`   • Auto-reconnect`);
    console.log('='.repeat(50));
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutdown signal received...');
      try {
        await client.disconnect();
        server.close();
        console.log('✅ Clean shutdown completed');
      } catch (error) {
        console.error('Shutdown error:', error.message);
      }
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Heartbeat
    setInterval(() => {
      console.log('💓 Bot heartbeat - All systems normal');
    }, 60000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    // Auto-restart after 30 seconds
    console.log('🔄 Auto-restart in 30 seconds...');
    setTimeout(() => {
      console.log('🔄 Restarting bot...');
      main().catch(err => {
        console.error('Restart failed:', err.message);
        process.exit(1);
      });
    }, 30000);
  }
}

// Start the application
main();
