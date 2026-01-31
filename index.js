// ============================================
// YOUR CRUSH Userbot - Main Application
// WITH PROPER BORDER FORMATTING
// ============================================

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { NewMessage } = require('telegram/events');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// ============================================
// CONFIGURATION
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
const REPLY_IN_GROUPS = process.env.REPLY_IN_GROUPS === 'true' || true;
const REPLY_IN_CHANNELS = process.env.REPLY_IN_CHANNELS === 'true' || false;
const USE_BORDERS = process.env.USE_BORDERS === 'true' || true;

// ============================================
// VALIDATION
// ============================================
if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing required environment variables!');
  process.exit(1);
}

// ============================================
// HTTP SERVER
// ============================================
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: BOT_NAME,
    uptime: process.uptime()
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// ============================================
// DATA MANAGER CLASS - WITH ADVANCED BORDER SYSTEM
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    this.borders = [];
    this.currentBorderIndex = 0;
  }

  async loadAllData() {
    try {
      // Create data directory
      try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      } catch (e) {}

      // Load reply patterns
      const replyPath = path.join(__dirname, 'data', 'reply.json');
      try {
        const replyData = await fs.readFile(replyPath, 'utf8');
        this.replies = JSON.parse(replyData);
        console.log(`✅ Loaded ${Object.keys(this.replies).length} reply patterns`);
      } catch (e) {
        console.log('📝 Creating default reply.json...');
        this.replies = this.getDefaultReplies();
        await fs.writeFile(replyPath, JSON.stringify(this.replies, null, 2));
      }

      // Load borders
      const borderPath = path.join(__dirname, 'data', 'border.json');
      try {
        const borderData = await fs.readFile(borderPath, 'utf8');
        const parsed = JSON.parse(borderData);
        if (parsed.borders && Array.isArray(parsed.borders)) {
          this.borders = parsed.borders;
          console.log(`✅ Loaded ${this.borders.length} borders`);
        }
      } catch (e) {
        console.log('🎨 Creating default border.json...');
        this.borders = this.getDefaultBorders();
        await fs.writeFile(borderPath, JSON.stringify({ borders: this.borders }, null, 2));
      }

    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      this.replies = this.getDefaultReplies();
      this.borders = this.getDefaultBorders();
    }
  }

  getDefaultReplies() {
    return {
      "hi": ["Hello! 👋", "Hi there! 😊", "Hey! ❤️"],
      "hello": ["Hi! 😄", "Hello! 💖", "Hey there! 🌸"],
      "test": ["Test successful! ✅", "Working! 🚀", "All good! 👍"],
      "i love you": ["Love you too! ❤️", "Aww 😘", "You're sweet! 💕"],
      "how are you": ["I'm good! 😊", "All good! 😄", "Feeling great! 🌟"],
      "бот": ["Bot здесь! 🤖", "Привет! 👋", "Да, я здесь! ✅"],
      "ping": ["Pong! 🏓", "Я жив! 💖", "Активен! ✅"]
    };
  }

  getDefaultBorders() {
    return [
      {
        name: "Basic Box",
        top: "╔══════════════╗",
        middle: "║",
        bottom: "╚══════════════╝",
        left: "║ ",
        right: " ║"
      },
      {
        name: "Rounded Box",
        top: "╭──────────────╮",
        middle: "│",
        bottom: "╰──────────────╯",
        left: "│ ",
        right: " │"
      },
      {
        name: "Double Line Box",
        top: "╔══════════════╗",
        middle: "║",
        bottom: "╚══════════════╝",
        left: "║ ",
        right: " ║"
      },
      {
        name: "Thick Border",
        top: "▛▀▀▀▀▀▀▀▀▀▀▀▀▀▜",
        middle: "▌",
        bottom: "▙▄▄▄▄▄▄▄▄▄▄▄▄▄▟",
        left: "▌ ",
        right: " ▐"
      },
      {
        name: "Star Border",
        top: "✦──────────────✦",
        middle: "│",
        bottom: "✦──────────────✦",
        left: "│ ",
        right: " │"
      },
      {
        name: "Fancy Border",
        top: "•·.·´¯`·.·•·.·´¯`·.·•",
        middle: " ",
        bottom: "•·.·`¯´·.·•·.·`¯´·.·•",
        left: "   ",
        right: "   "
      }
    ];
  }

  findReply(message) {
    if (!message || typeof message !== 'string') return null;
    
    const msg = message.toLowerCase().trim();
    if (msg.length === 0) return null;
    
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

  getNextBorder() {
    if (this.borders.length === 0) {
      this.borders = this.getDefaultBorders();
    }
    
    const border = this.borders[this.currentBorderIndex];
    this.currentBorderIndex = (this.currentBorderIndex + 1) % this.borders.length;
    return border;
  }

  // FIXED: Proper border formatting
  formatWithBorder(text) {
    if (!USE_BORDERS || this.borders.length === 0) {
      return text;
    }
    
    const border = this.getNextBorder();
    const lines = text.split('\n');
    
    // Find maximum line length
    let maxLength = 0;
    lines.forEach(line => {
      // Approximate length (emoji counts as 2 chars)
      const length = line.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '  ').length;
      if (length > maxLength) maxLength = length;
    });
    
    // Ensure minimum width
    maxLength = Math.max(maxLength, 10);
    
    // Create top border
    let result = this.createHorizontalBorder(border.top, maxLength) + '\n';
    
    // Add content lines
    lines.forEach(line => {
      const padding = maxLength - line.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '  ').length;
      const leftPadding = Math.floor(padding / 2);
      const rightPadding = padding - leftPadding;
      
      result += border.left + 
                ' '.repeat(leftPadding) + 
                line + 
                ' '.repeat(rightPadding) + 
                border.right + '\n';
    });
    
    // Create bottom border
    result += this.createHorizontalBorder(border.bottom, maxLength);
    
    return result;
  }

  createHorizontalBorder(borderPattern, length) {
    // Simple border patterns
    if (borderPattern.includes('═') && borderPattern.includes('╔')) {
      return '╔' + '═'.repeat(length + 2) + '╗';
    } else if (borderPattern.includes('─') && borderPattern.includes('╭')) {
      return '╭' + '─'.repeat(length + 2) + '╮';
    } else if (borderPattern.includes('━') && borderPattern.includes('┏')) {
      return '┏' + '━'.repeat(length + 2) + '┓';
    } else if (borderPattern.includes('▀') && borderPattern.includes('▛')) {
      return '▛' + '▀'.repeat(length + 2) + '▜';
    } else if (borderPattern.includes('─') && borderPattern.includes('✦')) {
      return '✦' + '─'.repeat(length + 2) + '✦';
    } else {
      // For fancy borders, center them
      const borderLength = borderPattern.length;
      if (borderLength > length + 4) {
        return borderPattern;
      } else {
        const repeatCount = Math.floor((length + 4) / borderLength) + 1;
        return borderPattern.repeat(repeatCount).substring(0, length + 4);
      }
    }
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
      
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
      
    } catch (error) {
      // Ignore
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
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (this.actionTimestamps.length < this.maxPerMinute) {
      this.actionTimestamps.push(now);
      return true;
    }
    
    return false;
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
    this.lastActionTime = 0;
    this.cooldownPeriod = 1000;
    this.stats = {
      messagesReceived: 0,
      responsesSent: 0,
      errors: 0
    };
  }

  async shouldProcessMessage(message) {
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    if (message.out) {
      return false;
    }
    
    if (!this.rateLimiter.canPerformAction()) {
      return false;
    }
    
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
        return;
      }
      
      // Typing
      if (!message.isGroup && !message.isChannel) {
        await this.typing.simulateTyping(message.chatId);
      }
      
      // Format with border
      const formattedReply = this.data.formatWithBorder(replyText);
      
      // Send reply
      await this.client.sendMessage(message.chatId, {
        message: formattedReply,
        parseMode: 'html'
      });
      
      this.lastActionTime = Date.now();
      this.stats.responsesSent++;
      
      console.log(`✅ Replied to ${message.chatId}: "${replyText.substring(0, 30)}..."`);
      
      // Random reaction
      if (Math.random() < 0.25 && !message.isGroup && !message.isChannel) {
        try {
          const reaction = this.data.getRandomReaction();
          await this.client.invoke(new Api.messages.SendReaction({
            peer: message.chatId,
            msgId: message.id,
            reaction: [new Api.ReactionEmoji({ emoticon: reaction })]
          }));
        } catch (error) {
          // Ignore
        }
      }
      
    } catch (error) {
      this.stats.errors++;
      if (LOG_LEVEL === 'debug') {
        console.error('Error:', error.message);
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
  console.log(`Version: 3.0.0`);
  console.log(`Smart Borders: ENABLED ✅`);
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
    console.log('✅ Connected!');
    
    // Get user info
    const me = await client.getMe();
    console.log(`👤 User: ${me.firstName || ''}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`📱 Username: @${me.username || 'N/A'}`);
    console.log(`🆔 ID: ${me.id}`);
    
    // Setup event handler
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({}));
    
    console.log('✅ Event handler ready');
    console.log('👂 Listening for messages...');
    
    // Status monitor
    setInterval(() => {
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      console.log('\n📊 STATUS:');
      console.log(`   Uptime: ${hours}h ${minutes}m`);
      console.log(`   Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`   Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   Current Border: ${dataManager.borders[dataManager.currentBorderIndex]?.name || 'N/A'}`);
      console.log('─'.repeat(40));
    }, 300000);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is ONLINE!`);
    console.log('='.repeat(60));
    console.log('\n📌 Border Format:');
    console.log('   Single box with centered text');
    console.log('   Auto-resizing based on content');
    console.log('   No broken borders');
    console.log('='.repeat(60));
    
    // Keep alive
    setInterval(() => {}, 1000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
