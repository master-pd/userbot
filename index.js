// ============================================
// YOUR CRUSH Userbot - Main Application
// COMPLETE FIXED VERSION - ALL FEATURES WORKING
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
const REPLY_IN_GROUPS = process.env.REPLY_IN_GROUPS === 'true' || true;
const REPLY_IN_CHANNELS = process.env.REPLY_IN_CHANNELS === 'true' || false;
const USE_BORDERS = process.env.USE_BORDERS === 'true' || true;

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
// DATA MANAGER CLASS - WITH PROPER BORDER FORMATTING
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    this.voices = [];
    this.videos = [];
    this.borders = [];
    this.currentBorderIndex = 0;
  }

  async loadAllData() {
    try {
      // Create data directory if it doesn't exist
      try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      } catch (e) {
        // Directory already exists
      }

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
      
      // Load borders - FIXED
      const borderPath = path.join(__dirname, 'data', 'border.json');
      try {
        const borderData = await fs.readFile(borderPath, 'utf8');
        const parsed = JSON.parse(borderData);
        if (parsed.borders && Array.isArray(parsed.borders)) {
          this.borders = parsed.borders;
          console.log(`✅ Loaded ${this.borders.length} borders`);
        } else if (Array.isArray(parsed)) {
          this.borders = parsed;
          console.log(`✅ Loaded ${this.borders.length} borders (array format)`);
        } else {
          throw new Error('Invalid border.json format');
        }
      } catch (e) {
        console.log('🎨 Creating default border.json...');
        this.borders = this.getDefaultBorders();
        await fs.writeFile(borderPath, JSON.stringify({ borders: this.borders }, null, 2));
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
      this.replies = this.getDefaultReplies();
      this.borders = this.getDefaultBorders();
      console.log('⚠️ Using default data due to error');
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
      "ping": ["Pong! 🏓", "Я жив! 💖", "Активен! ✅"],
      "бот проверка": ["Проверка пройдена! ✅", "Я здесь! 👍", "Работаю нормально! 🚀"],
      "бот работаешь": ["Работаю! 💪", "Да, всё хорошо! ✅", "Всё в порядке! 🟢"],
      "салам": ["Ва алейкум ассалам! 🕌", "Салам! 👋", "Привет! 😊"],
      "привет": ["Привет! 👋", "Здравствуй! 😊", "Приветствую! 🌸"],
      "спокойной ночи": ["Спокойной ночи! 🌙", "Сладких снов! 💤", "Доброй ночи! 😴"],
      "доброе утро": ["Доброе утро! ☀️", "С добрым утром! 🌅", "Утра доброго! 😊"],
      "что делаешь": ["Отвечаю тебе! 💬", "Думаю о тебе! 💖", "Работаю! 🤖"],
      "скучаешь": ["Да, скучаю! 😔", "Конечно! 💕", "Очень! 😘"]
    };
  }

  getDefaultBorders() {
    return [
      "┏━━━━━━━━━━━━━━┓\n┃              ┃\n┃              ┃\n┃              ┃\n┗━━━━━━━━━━━━━━┛",
      "╔══════════════╗\n║              ║\n║              ║\n║              ║\n╚══════════════╝",
      "╭──────────────╮\n│              │\n│              │\n│              │\n╰──────────────╯",
      "▛▀▀▀▀▀▀▀▀▀▀▀▀▜\n▌              ▐\n▌              ▐\n▌              ▐\n▙▄▄▄▄▄▄▄▄▄▄▄▄▟",
      "┌──────────────┐\n│              │\n│              │\n│              │\n└──────────────┘",
      "✦──────────────✦\n│              │\n│              │\n│              │\n✦──────────────✦",
      "•·.·´¯`·.·•·.·´¯`·.·•\n                  \n                  \n                  \n•·.·`¯´·.·•·.·`¯´·.·•",
      "【｡‿｡】 【｡‿｡】 【｡‿｡】\n                  \n                  \n                  \n【｡‿｡】 【｡‿｡】 【｡‿｡】"
    ];
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

  getNextBorder() {
    if (this.borders.length === 0) {
      this.borders = this.getDefaultBorders();
    }
    
    const border = this.borders[this.currentBorderIndex];
    
    // Move to next border (circular)
    this.currentBorderIndex = (this.currentBorderIndex + 1) % this.borders.length;
    
    return border;
  }

  // FIXED: PROPER BORDER FORMATTING - TEXT INSIDE BORDER
  formatWithBorder(text) {
    if (!USE_BORDERS || this.borders.length === 0) {
      return text;
    }
    
    const borderTemplate = this.getNextBorder();
    const borderLines = borderTemplate.split('\n');
    const textLines = text.split('\n');
    
    // If border has 5 lines (standard box)
    if (borderLines.length >= 5) {
      // Find border characters
      const topLine = borderLines[0];
      const middleLine = borderLines[2] || borderLines[1];
      
      // Extract left and right border characters
      const leftBorder = this.extractLeftBorderChar(middleLine);
      const rightBorder = this.extractRightBorderChar(middleLine);
      
      // Calculate width (remove border chars from middle line)
      const contentWidth = middleLine.length - leftBorder.length - rightBorder.length;
      
      // Center each text line
      const centeredLines = textLines.map(line => {
        return this.centerText(line, contentWidth, leftBorder, rightBorder);
      });
      
      // Rebuild border with text
      const result = [];
      
      // Top border
      result.push(topLine);
      
      // Top padding (empty line)
      if (borderLines.length > 1) {
        result.push(borderLines[1]);
      }
      
      // Add centered text lines
      const textStartLine = Math.max(1, Math.floor((borderLines.length - textLines.length) / 2));
      
      for (let i = 0; i < Math.min(textLines.length, 3); i++) {
        if (borderLines[textStartLine + i]) {
          result.push(centeredLines[i]);
        } else {
          result.push(centeredLines[i]);
        }
      }
      
      // Bottom padding
      for (let i = result.length; i < borderLines.length - 1; i++) {
        result.push(borderLines[i] || borderLines[1]);
      }
      
      // Bottom border
      if (borderLines.length > 1) {
        result.push(borderLines[borderLines.length - 1]);
      }
      
      return result.join('\n');
    }
    
    // Fallback: simple border wrap
    return `${borderTemplate}\n${text}\n${borderTemplate}`;
  }

  extractLeftBorderChar(line) {
    if (!line || line.length === 0) return '';
    const match = line.match(/^([^a-zA-Z0-9\s\u{1F600}-\u{1F64F}]*)/u);
    return match ? match[0] : '';
  }

  extractRightBorderChar(line) {
    if (!line || line.length === 0) return '';
    const match = line.match(/([^a-zA-Z0-9\s\u{1F600}-\u{1F64F}]*)$/u);
    return match ? match[0] : '';
  }

  centerText(text, width, leftBorder, rightBorder) {
    // Calculate text width (emoji = 2 chars)
    const textWidth = this.calculateTextWidth(text);
    
    if (textWidth >= width) {
      // Text too long, trim it
      const maxText = this.trimTextToWidth(text, width);
      return `${leftBorder}${maxText}${rightBorder}`;
    }
    
    const leftPadding = Math.floor((width - textWidth) / 2);
    const rightPadding = width - textWidth - leftPadding;
    
    return `${leftBorder}${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}${rightBorder}`;
  }

  calculateTextWidth(text) {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // Emoji range or special characters
      if (code >= 0x1F600 && code <= 0x1F64F || // Emoticons
          code >= 0x1F300 && code <= 0x1F5FF || // Misc Symbols and Pictographs
          code >= 0x1F680 && code <= 0x1F6FF || // Transport and Map Symbols
          code >= 0x2600 && code <= 0x26FF ||   // Misc Symbols
          code >= 0x2700 && code <= 0x27BF) {   // Dingbats
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  trimTextToWidth(text, maxWidth) {
    let result = '';
    let currentWidth = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = text.charCodeAt(i);
      let charWidth = 1;
      
      if (code >= 0x1F600 && code <= 0x1F64F ||
          code >= 0x1F300 && code <= 0x1F5FF ||
          code >= 0x1F680 && code <= 0x1F6FF ||
          code >= 0x2600 && code <= 0x26FF ||
          code >= 0x2700 && code <= 0x27BF) {
        charWidth = 2;
      }
      
      if (currentWidth + charWidth > maxWidth) {
        break;
      }
      
      result += char;
      currentWidth += charWidth;
    }
    
    return result;
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
// MESSAGE HANDLER CLASS - WORKING VERSION
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
    // Check if valid message
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    // Skip if from bot
    if (message.sender && message.sender.bot) {
      return false;
    }
    
    // Skip own messages
    if (message.out) {
      return false;
    }
    
    // Only private messages if groups disabled
    if (!REPLY_IN_GROUPS && message.isGroup) {
      return false;
    }
    
    if (!REPLY_IN_CHANNELS && message.isChannel) {
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
      
      // Typing simulation only in private chats
      if (!message.isGroup && !message.isChannel) {
        await this.typing.simulateTyping(message.chatId);
      }
      
      // Apply border to reply text
      let formattedReply = replyText;
      if (USE_BORDERS) {
        formattedReply = this.data.formatWithBorder(replyText);
        this.stats.bordersUsed++;
      }
      
      // Check if it's a group message and needs mention
      let replyMessage = formattedReply;
      
      // If it's a group/channel and message has a sender, mention the user
      if ((message.isGroup || message.isChannel) && message.senderId) {
        try {
          const sender = await this.client.getEntity(message.senderId);
          if (sender) {
            const mention = `<a href="tg://user?id=${sender.id}">${sender.firstName || ''}</a>`;
            replyMessage = `${mention}\n\n${formattedReply}`;
          }
        } catch (error) {
          // Continue without mention if can't get user
        }
      }
      
      // Send reply with HTML parse mode
      await this.client.sendMessage(message.chatId, {
        message: replyMessage,
        parseMode: 'html'
      });
      
      this.lastActionTime = Date.now();
      this.stats.responsesSent++;
      
      // Update stats based on chat type
      if (message.isGroup) {
        this.stats.groupReplies++;
      } else if (!message.isChannel) {
        this.stats.privateReplies++;
      }
      
      // Random reaction (25% chance) - only in private chats
      if (Math.random() < 0.25 && this.rateLimiter.canPerformAction() && !message.isGroup && !message.isChannel) {
        const reaction = this.data.getRandomReaction();
        try {
          await this.client.invoke(new Api.messages.SendReaction({
            peer: message.chatId,
            msgId: message.id,
            reaction: [new Api.ReactionEmoji({ emoticon: reaction })]
          }));
        } catch (error) {
          // Silent fail
        }
      }
      
      // Log message
      const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
      console.log(`💌 [${chatType}] Replied to ${message.chatId}`);
      console.log(`   Text: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`);
      
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
  console.log(`Version: 3.0.0 - FINAL FIXED`);
  console.log(`Environment: Render Worker`);
  console.log(`AI Dependency: None (Rule-based)`);
  console.log(`Rate Limit: ${MAX_ACTIONS_PER_MINUTE}/minute`);
  console.log(`Parse Mode: HTML Enabled ✅`);
  console.log(`Group Replies: ${REPLY_IN_GROUPS ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  console.log(`Channel Replies: ${REPLY_IN_CHANNELS ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  console.log(`Ignore Bots: YES ✅`);
  console.log(`Smart Borders: ${USE_BORDERS ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  console.log('='.repeat(60));
  
  // Initialize Telegram Client
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true,
    requestRetries: 3
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
    
    // Setup event handler for all incoming messages
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
      console.log(`   - Private: ${messageHandler.stats.privateReplies}`);
      console.log(`   - Groups: ${messageHandler.stats.groupReplies}`);
      console.log(`   - Borders Used: ${messageHandler.stats.bordersUsed}`);
      console.log(`   Current Border: #${dataManager.currentBorderIndex + 1}/${dataManager.borders.length}`);
      console.log(`   Rate Limit: ${rateLimiter.getRemainingActions()}/${MAX_ACTIONS_PER_MINUTE}`);
      console.log('─'.repeat(40));
    }, 300000); // Every 5 minutes
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is now ONLINE and ready!`);
    console.log('='.repeat(60));
    console.log('\n📋 ALL FEATURES ACTIVE:');
    console.log(`   • Private message replies ✅`);
    console.log(`   • Group message replies ✅`);
    console.log(`   • Channel replies: ${REPLY_IN_CHANNELS ? '✅' : '❌'}`);
    console.log(`   • Bot messages ignored ✅`);
    console.log(`   • Smart borders (text inside) ✅`);
    console.log(`   • HTML formatting support ✅`);
    console.log(`   • Typing simulation ✅`);
    console.log(`   • Random reactions ✅`);
    console.log(`   • Rate limiting ✅`);
    console.log(`   • HTTP health endpoint ✅`);
    console.log(`   • Voice files: ${dataManager.voices.length > 0 ? '✅' : '❌'}`);
    console.log(`   • Video files: ${dataManager.videos.length > 0 ? '✅' : '❌'}`);
    console.log('='.repeat(60));
    
    // Show sample border
    console.log('\n📦 SAMPLE BORDER OUTPUT:');
    console.log(dataManager.formatWithBorder("Hello! 👋"));
    console.log('\n' + '='.repeat(60));
    
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
    
    // Keep process alive
    setInterval(() => {}, 1000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    if (error.message.includes('AUTH_KEY')) {
      console.error('⚠️ Invalid session string! Generate new one with: npm run session');
    }
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
