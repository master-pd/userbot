// ============================================
// YOUR CRUSH Userbot - RENDER OPTIMIZED FIXED
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
// FIXED TELEGRAM CLIENT (NO CONNECTION PARAM)
// ============================================
const stringSession = new StringSession(SESSION_STRING);

// FIXED: Connection parameter removed
const client = new TelegramClient(stringSession, API_ID, API_HASH, {
  connectionRetries: 10,
  timeout: 30,
  useWSS: true,
  autoReconnect: true,
  requestRetries: 3,
  useIPV6: false,
  floodSleepThreshold: 60,
  deviceModel: 'Render Server',
  systemVersion: 'Node.js',
  appVersion: '1.0.0',
  langCode: 'en',
  systemLangCode: 'en',
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
// CONNECTION MANAGER
// ============================================
class ConnectionManager {
  constructor(client) {
    this.client = client;
    this.isConnected = false;
  }

  async connectWithRetry(maxRetries = 10) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        console.log(`🔗 Connection attempt ${retries + 1}/${maxRetries}...`);
        await this.client.connect();
        this.isConnected = true;
        console.log('✅ Successfully connected to Telegram!');
        return true;
      } catch (error) {
        retries++;
        console.error(`❌ Connection failed: ${error.message}`);
        
        if (retries < maxRetries) {
          const delay = Math.min(retries * 2000, 10000);
          console.log(`⏳ Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return false;
  }

  async keepAlive() {
    setInterval(async () => {
      if (this.isConnected) {
        try {
          await this.client.invoke(new Api.ping({ pingId: BigInt(Date.now()) }));
        } catch (error) {
          console.log('⚠️ Keep-alive failed, will reconnect...');
          this.isConnected = false;
          await this.connectWithRetry(3);
        }
      }
    }, 30000);
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
    
    // Per-chat cooldown
    const lastTime = this.cooldown.get(chatId) || 0;
    if (now - lastTime < 2000) return false;
    
    // Global rate limit
    if (now - this.resetTime > 60000) {
      this.actionCount = 0;
      this.resetTime = now;
    }
    
    if (this.actionCount >= 25) return false;
    
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
          await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
          
          // Send message
          await this.client.sendMessage(chatId, { message: replyText });
          console.log(`💬 Replied to ${chatId}`);
          
          // Random reaction
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
              // Ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Message error:', error.message);
    }
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('='.repeat(50));
  console.log(`🚀 ${BOT_NAME} - Starting on Render`);
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log('='.repeat(50));
  
  // Initialize components
  const dataManager = new DataManager();
  await dataManager.loadData();
  
  const connectionManager = new ConnectionManager(client);
  
  try {
    // Connect to Telegram
    const connected = await connectionManager.connectWithRetry();
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
    const messageHandler = new MessageHandler(client, dataManager);
    client.addEventHandler((event) => {
      messageHandler.handleMessage(event);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${BOT_NAME} is ONLINE!`);
    console.log('='.repeat(50));
    console.log('\n📋 Ready to receive messages');
    console.log('='.repeat(50));
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down...');
      try {
        await client.disconnect();
        server.close();
        console.log('✅ Clean shutdown completed');
      } catch (error) {
        console.error('Shutdown error:', error.message);
      }
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      try {
        await client.disconnect();
        server.close();
        console.log('✅ Clean shutdown completed');
      } catch (error) {
        console.error('Shutdown error:', error.message);
      }
      process.exit(0);
    });
    
    // Heartbeat
    setInterval(() => {
      console.log('💓 Bot is running...');
    }, 60000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    // Restart after delay
    console.log('🔄 Restarting in 30 seconds...');
    setTimeout(() => {
      console.log('🔄 Restarting...');
      main().catch(err => {
        console.error('Restart failed:', err.message);
        process.exit(1);
      });
    }, 30000);
  }
}

// Start the bot
main();
