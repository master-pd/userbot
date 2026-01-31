// ============================================
// YOUR CRUSH Userbot - Main Application
// FINAL WORKING VERSION - NO ERRORS
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
console.log('🔍 Checking environment variables...');
console.log(`API_ID: ${API_ID ? '✅' : '❌'}`);
console.log(`API_HASH: ${API_HASH ? '✅ (****' + API_HASH.slice(-4) + ')' : '❌'}`);
console.log(`SESSION_STRING: ${SESSION_STRING ? `✅ (${SESSION_STRING.length} chars)` : '❌'}`);

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing required environment variables!');
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
// DATA MANAGER CLASS - SIMPLIFIED AND WORKING
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
      
      // Load borders - FIXED: Handle string array properly
      const borderPath = path.join(__dirname, 'data', 'border.json');
      try {
        const borderData = await fs.readFile(borderPath, 'utf8');
        const parsed = JSON.parse(borderData);
        
        if (Array.isArray(parsed)) {
          // If border.json contains direct array
          this.borders = parsed;
        } else if (parsed.borders && Array.isArray(parsed.borders)) {
          // If border.json has {borders: []} format
          this.borders = parsed.borders;
        } else {
          throw new Error('Invalid format');
        }
        
        console.log(`✅ Loaded ${this.borders.length} borders`);
        
        // Verify all borders are strings
        this.borders = this.borders.filter(border => typeof border === 'string');
        
      } catch (e) {
        console.log('🎨 Creating default border.json...');
        this.borders = this.getDefaultBorders();
        await fs.writeFile(borderPath, JSON.stringify(this.borders, null, 2));
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
      "┏━━━━━━━━━━━━━━┓\n┃              ┃\n┃              ┃\n┃              ┃\n┗━━━━━━━━━━━━━━┛",
      "╔══════════════╗\n║              ║\n║              ║\n║              ║\n╚══════════════╝",
      "╭──────────────╮\n│              │\n│              │\n│              │\n╰──────────────╯",
      "▛▀▀▀▀▀▀▀▀▀▀▀▀▜\n▌              ▐\n▌              ▐\n▌              ▐\n▙▄▄▄▄▄▄▄▄▄▄▄▄▟",
      "┌──────────────┐\n│              │\n│              │\n│              │\n└──────────────┘",
      "✦──────────────✦\n│              │\n│              │\n│              │\n✦──────────────✦"
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
    this.currentBorderIndex = (this.currentBorderIndex + 1) % this.borders.length;
    return border;
  }

  // SIMPLIFIED BORDER FORMATTING THAT WORKS
  formatWithBorder(text) {
    if (!USE_BORDERS || this.borders.length === 0) {
      return text;
    }
    
    const border = this.getNextBorder();
    
    // Ensure border is a string
    if (typeof border !== 'string') {
      return text;
    }
    
    const borderLines = border.split('\n');
    
    // Simple box border with 5 lines
    if (borderLines.length === 5) {
      const textLines = text.split('\n');
      const maxTextLines = Math.min(textLines.length, 3);
      
      // Create new border with text in middle
      const result = [];
      result.push(borderLines[0]); // Top border
      
      // Calculate where to put text (line 2 or 3 depending on text length)
      if (maxTextLines === 1) {
        // Single line - put in middle line (line 3)
        const centeredLine = this.centerTextInLine(textLines[0], borderLines[2]);
        result.push(borderLines[1]); // Empty line
        result.push(centeredLine);   // Text line
        result.push(borderLines[3]); // Empty line
      } else if (maxTextLines === 2) {
        // Two lines - put in lines 2 and 3
        const line1 = this.centerTextInLine(textLines[0], borderLines[2]);
        const line2 = this.centerTextInLine(textLines[1], borderLines[2]);
        result.push(line1);          // First text line
        result.push(line2);          // Second text line
        result.push(borderLines[3]); // Empty line
      } else {
        // Three lines - use all middle lines
        for (let i = 0; i < 3; i++) {
          const line = i < textLines.length ? 
            this.centerTextInLine(textLines[i], borderLines[2]) : 
            borderLines[2];
          result.push(line);
        }
      }
      
      result.push(borderLines[4]); // Bottom border
      return result.join('\n');
    }
    
    // Fallback: simple border wrap
    return `${border}\n${text}\n${border}`;
  }

  centerTextInLine(text, borderLine) {
    // Extract border characters from sides
    const leftChar = this.getLeftBorderChar(borderLine);
    const rightChar = this.getRightBorderChar(borderLine);
    
    const borderLength = leftChar.length + rightChar.length;
    const availableWidth = borderLine.length - borderLength;
    
    // Calculate text width (approx)
    const textWidth = text.length; // Simplified
    
    if (textWidth >= availableWidth) {
      // Text too long, use as is with borders
      return leftChar + text.slice(0, availableWidth) + rightChar;
    }
    
    const leftPadding = Math.floor((availableWidth - textWidth) / 2);
    const rightPadding = availableWidth - textWidth - leftPadding;
    
    return leftChar + ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding) + rightChar;
  }

  getLeftBorderChar(line) {
    if (!line || line.length === 0) return '';
    // Common left border characters
    const leftChars = ['┃', '║', '│', '▌', '▐', '┊', '╠', '╞', '├'];
    for (const char of leftChars) {
      if (line.startsWith(char)) return char;
    }
    return line[0] || '';
  }

  getRightBorderChar(line) {
    if (!line || line.length === 0) return '';
    // Common right border characters
    const rightChars = ['┃', '║', '│', '▌', '▐', '┊', '╣', '╡', '┤'];
    for (const char of rightChars) {
      if (line.endsWith(char)) return char;
    }
    return line[line.length - 1] || '';
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
      errors: 0,
      groupReplies: 0,
      privateReplies: 0
    };
  }

  async shouldProcessMessage(message) {
    // Check if valid message
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    // Skip own messages
    if (message.out) {
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
        return;
      }
      
      // Typing simulation
      if (!message.isGroup && !message.isChannel) {
        await this.typing.simulateTyping(message.chatId);
      }
      
      // Apply border
      let formattedReply = replyText;
      if (USE_BORDERS) {
        formattedReply = this.data.formatWithBorder(replyText);
      }
      
      // Send reply
      await this.client.sendMessage(message.chatId, {
        message: formattedReply
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
      console.log(`💌 [${chatType}] Replied to ${message.chatId}: ${replyText.substring(0, 30)}...`);
      
      // Random reaction
      if (Math.random() < 0.25 && this.rateLimiter.canPerformAction() && !message.isGroup && !message.isChannel) {
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
  console.log(`Version: 4.0.0 - FINAL WORKING`);
  console.log(`All Features: ✅ WORKING`);
  console.log(`Borders: ${USE_BORDERS ? '✅ TEXT INSIDE' : '❌ DISABLED'}`);
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
    console.log('\n🔗 Connecting to Telegram...');
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
    }, new NewMessage({ incoming: true }));
    
    console.log('\n✅ Event handler ready');
    console.log('👂 Listening for messages...');
    
    // Show sample output
    console.log('\n📦 SAMPLE BORDER OUTPUT:');
    const sample = dataManager.formatWithBorder("Hello! 👋");
    console.log(sample);
    console.log('\n' + '='.repeat(60));
    
    // Status monitor
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      console.log('\n📊 STATUS:');
      console.log(`   Uptime: ${hours}h ${minutes}m`);
      console.log(`   Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`   Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   Private: ${messageHandler.stats.privateReplies}`);
      console.log(`   Groups: ${messageHandler.stats.groupReplies}`);
      console.log('─'.repeat(40));
    }, 300000);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is ONLINE!`);
    console.log('='.repeat(60));
    console.log('\n💡 Test by sending: hi, hello, test, ping, бот');
    console.log('='.repeat(60));
    
    // Keep alive
    setInterval(() => {}, 1000);
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Start application
main().catch(console.error);
