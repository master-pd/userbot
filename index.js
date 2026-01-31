// ============================================
// YOUR CRUSH Userbot - Main Application
// ULTIMATE FINAL VERSION - PERFECT BORDERS
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
  console.log(`🌐 HTTP server running on port ${PORT}`);
});

// ============================================
// PERFECT BORDER GENERATOR
// ============================================
class PerfectBorder {
  constructor() {
    this.borderStyles = [];
    this.loadBorderStyles();
  }

  loadBorderStyles() {
    this.borderStyles = [
      {
        name: "Double Line",
        topLeft: "╔", top: "═", topRight: "╗",
        left: "║", right: "║",
        bottomLeft: "╚", bottom: "═", bottomRight: "╝"
      },
      {
        name: "Single Line",
        topLeft: "┌", top: "─", topRight: "┐",
        left: "│", right: "│",
        bottomLeft: "└", bottom: "─", bottomRight: "┘"
      },
      {
        name: "Rounded",
        topLeft: "╭", top: "─", topRight: "╮",
        left: "│", right: "│",
        bottomLeft: "╰", bottom: "─", bottomRight: "╯"
      },
      {
        name: "Thick",
        topLeft: "▛", top: "▀", topRight: "▜",
        left: "▌", right: "▐",
        bottomLeft: "▙", bottom: "▄", bottomRight: "▟"
      },
      {
        name: "Bold",
        topLeft: "┏", top: "━", topRight: "┓",
        left: "┃", right: "┃",
        bottomLeft: "┗", bottom: "━", bottomRight: "┛"
      },
      {
        name: "Star",
        topLeft: "✦", top: "─", topRight: "✦",
        left: "│", right: "│",
        bottomLeft: "✦", bottom: "─", bottomRight: "✦"
      },
      {
        name: "Dotted",
        topLeft: "·", top: "·", topRight: "·",
        left: "·", right: "·",
        bottomLeft: "·", bottom: "·", bottomRight: "·"
      }
    ];
  }

  generatePerfectBorder(text) {
    if (!USE_BORDERS || text.trim() === '') {
      return text;
    }

    // Select random border style
    const style = this.borderStyles[Math.floor(Math.random() * this.borderStyles.length)];
    
    // Split text into lines
    const lines = text.split('\n');
    
    // Find the longest line (considering emojis as 1 char for width)
    let maxLength = 0;
    lines.forEach(line => {
      // Remove emojis for width calculation (they display as 1 char)
      const cleanLine = line.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');
      if (cleanLine.length > maxLength) maxLength = cleanLine.length;
    });
    
    // Add padding
    const padding = 2;
    const totalWidth = maxLength + (padding * 2);
    
    // Create top border
    const topBorder = style.topLeft + style.top.repeat(totalWidth) + style.topRight;
    
    // Create bottom border
    const bottomBorder = style.bottomLeft + style.bottom.repeat(totalWidth) + style.bottomRight;
    
    // Create content lines
    const contentLines = [];
    
    // Add top padding
    contentLines.push(style.left + ' '.repeat(totalWidth) + style.right);
    
    // Add text lines with padding
    lines.forEach(line => {
      const lineLength = line.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ').length;
      const leftPadding = Math.floor((totalWidth - lineLength) / 2);
      const rightPadding = totalWidth - lineLength - leftPadding;
      
      const contentLine = style.left + 
                         ' '.repeat(leftPadding) + 
                         line + 
                         ' '.repeat(rightPadding) + 
                         style.right;
      contentLines.push(contentLine);
    });
    
    // Add bottom padding
    contentLines.push(style.left + ' '.repeat(totalWidth) + style.right);
    
    // Combine everything
    const result = [topBorder, ...contentLines, bottomBorder];
    return result.join('\n');
  }
}

// ============================================
// DATA MANAGER
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    this.borderGenerator = new PerfectBorder();
  }

  async loadAllData() {
    try {
      // Create data directory
      try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      } catch (e) {}

      // Load replies
      const replyPath = path.join(__dirname, 'data', 'reply.json');
      try {
        const replyData = await fs.readFile(replyPath, 'utf8');
        this.replies = JSON.parse(replyData);
      } catch (e) {
        this.replies = this.getDefaultReplies();
        await fs.writeFile(replyPath, JSON.stringify(this.replies, null, 2));
      }

      console.log(`✅ Loaded ${Object.keys(this.replies).length} replies`);
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      this.replies = this.getDefaultReplies();
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

  formatWithBorder(text) {
    return this.borderGenerator.generatePerfectBorder(text);
  }
}

// ============================================
// TYPING SYSTEM
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
// RATE LIMITER
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

  getRemainingActions() {
    const now = Date.now();
    this.actionTimestamps = this.actionTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return this.maxPerMinute - this.actionTimestamps.length;
  }
}

// ============================================
// MESSAGE HANDLER - WITH GROUP BORDER SUPPORT
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
      errors: 0,
      groupReplies: 0,
      privateReplies: 0,
      bordersUsed: 0
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
      
      // Typing simulation
      if (!message.isGroup && !message.isChannel) {
        await this.typing.simulateTyping(message.chatId);
      }
      
      // Apply border to ALL messages (groups included)
      let formattedReply = replyText;
      if (USE_BORDERS) {
        formattedReply = this.data.formatWithBorder(replyText);
        this.stats.bordersUsed++;
      }
      
      // Add mention for groups
      if ((message.isGroup || message.isChannel) && message.senderId) {
        try {
          const sender = await this.client.getEntity(message.senderId);
          if (sender) {
            const mention = `<a href="tg://user?id=${sender.id}">${sender.firstName || ''}</a>`;
            formattedReply = `${mention}\n\n${formattedReply}`;
          }
        } catch (error) {
          // Ignore
        }
      }
      
      // Send reply
      await this.client.sendMessage(message.chatId, {
        message: formattedReply,
        parseMode: 'html'
      });
      
      this.lastActionTime = Date.now();
      this.stats.responsesSent++;
      
      // Update stats
      if (message.isGroup) {
        this.stats.groupReplies++;
      } else if (!message.isChannel) {
        this.stats.privateReplies++;
      }
      
      // Log
      const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
      console.log(`💌 [${chatType}] Replied to ${message.chatId}`);
      
      // Random reaction (private only)
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
  console.log(`Version: 5.0.0 - ULTIMATE FINAL`);
  console.log(`Perfect Borders: ✅ DYNAMIC`);
  console.log(`Group Borders: ✅ ENABLED`);
  console.log('='.repeat(60));
  
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true
  });
  
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  const rateLimiter = new RateLimiter(MAX_ACTIONS_PER_MINUTE);
  const typingSystem = new TypingSystem(client);
  const messageHandler = new MessageHandler(client, dataManager, typingSystem, rateLimiter);
  
  try {
    console.log('\n🔗 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected!');
    
    const me = await client.getMe();
    console.log(`👤 User: ${me.firstName || ''}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`📱 Username: @${me.username || 'N/A'}`);
    console.log(`🆔 ID: ${me.id}`);
    
    // Setup event handler
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({ incoming: true }));
    
    console.log('\n✅ Event handler ready');
    console.log('👂 Listening for messages...');
    
    // Show perfect border examples
    console.log('\n📦 PERFECT BORDER EXAMPLES:');
    console.log(dataManager.formatWithBorder("Hello! 👋"));
    console.log('');
    console.log(dataManager.formatWithBorder("I love you! ❤️"));
    console.log('');
    console.log(dataManager.formatWithBorder("How are you? 😊"));
    console.log('\n' + '='.repeat(60));
    
    // Status monitor
    setInterval(() => {
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      console.log('\n📊 STATUS:');
      console.log(`   Uptime: ${hours}h ${minutes}m`);
      console.log(`   Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`   Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   Private: ${messageHandler.stats.privateReplies}`);
      console.log(`   Groups: ${messageHandler.stats.groupReplies}`);
      console.log(`   Borders: ${messageHandler.stats.bordersUsed}`);
      console.log('─'.repeat(40));
    }, 300000);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is ONLINE!`);
    console.log('='.repeat(60));
    console.log('\n✨ FEATURES:');
    console.log('   • Perfect dynamic borders ✅');
    console.log('   • Borders in groups ✅');
    console.log('   • Auto-resize to text ✅');
    console.log('   • All four sides complete ✅');
    console.log('   • Random border styles ✅');
    console.log('   • HTML formatting ✅');
    console.log('   • Typing simulation ✅');
    console.log('   • Random reactions ✅');
    console.log('   • Rate limiting ✅');
    console.log('='.repeat(60));
    
    // Keep alive
    setInterval(() => {}, 1000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Start application
main().catch(console.error);
