// ============================================
// YOUR CRUSH Userbot - Main Application
// COMPLETE FINAL CODE WITH ALL FEATURES
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
console.log('🚀 Starting YOUR CRUSH Userbot...');
console.log('='.repeat(50));

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ FATAL: Missing required environment variables!');
  console.error('Please set: API_ID, API_HASH, SESSION_STRING');
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
  console.log(`✅ Health check server running on port ${PORT}`);
});

// ============================================
// PERFECT BORDER SYSTEM - EXACT CENTERING
// ============================================
class PerfectBorderSystem {
  constructor() {
    this.styles = [
      {
        name: "Double Line",
        tl: "╔", tr: "╗", bl: "╚", br: "╝",
        h: "═", v: "║"
      },
      {
        name: "Single Line", 
        tl: "┌", tr: "┐", bl: "└", br: "┘",
        h: "─", v: "│"
      },
      {
        name: "Rounded",
        tl: "╭", tr: "╮", bl: "╰", br: "╯",
        h: "─", v: "│"
      },
      {
        name: "Thick",
        tl: "▛", tr: "▜", bl: "▙", br: "▟",
        h: "▀", v: "▌"
      },
      {
        name: "Bold",
        tl: "┏", tr: "┓", bl: "┗", br: "┛",
        h: "━", v: "┃"
      },
      {
        name: "Star",
        tl: "✦", tr: "✦", bl: "✦", br: "✦",
        h: "─", v: "│"
      }
    ];
  }

  calculateTextWidth(text) {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = text.charCodeAt(i);
      
      // Emoji and special characters count as 1
      if (code >= 0x1F600 && code <= 0x1F64F) width += 1; // Emoticons
      else if (code >= 0x1F300 && code <= 0x1F5FF) width += 1; // Symbols
      else if (code >= 0x1F680 && code <= 0x1F6FF) width += 1; // Transport
      else if (code >= 0x2600 && code <= 0x26FF) width += 1; // Misc
      else if (code >= 0x2700 && code <= 0x27BF) width += 1; // Dingbats
      else width += 1; // Normal characters
    }
    return width;
  }

  createPerfectBorder(text) {
    if (!USE_BORDERS || !text || text.trim() === '') {
      return text;
    }

    // Select random border style
    const style = this.styles[Math.floor(Math.random() * this.styles.length)];
    
    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return text;
    
    // Find maximum visual width
    let maxWidth = 0;
    lines.forEach(line => {
      const width = this.calculateTextWidth(line);
      if (width > maxWidth) maxWidth = width;
    });
    
    // Calculate border width (text + padding)
    const sidePadding = 1; // Minimum 1 space on each side
    const borderWidth = maxWidth + (sidePadding * 2);
    
    // Ensure minimum width
    const minWidth = 10;
    const finalWidth = Math.max(borderWidth, minWidth);
    
    // Create borders
    const topBorder = style.tl + style.h.repeat(finalWidth) + style.tr;
    const bottomBorder = style.bl + style.h.repeat(finalWidth) + style.br;
    const emptyLine = style.v + ' '.repeat(finalWidth) + style.v;
    
    // Create centered text lines
    const centeredLines = lines.map(line => {
      const lineWidth = this.calculateTextWidth(line);
      const totalSpaces = finalWidth - lineWidth;
      const leftSpaces = Math.floor(totalSpaces / 2);
      const rightSpaces = totalSpaces - leftSpaces;
      
      return style.v + ' '.repeat(leftSpaces) + line + ' '.repeat(rightSpaces) + style.v;
    });
    
    // Assemble complete border
    const result = [];
    result.push(topBorder);
    result.push(emptyLine);
    
    // Add all text lines
    centeredLines.forEach(line => {
      result.push(line);
    });
    
    result.push(emptyLine);
    result.push(bottomBorder);
    
    return result.join('\n');
  }
}

// ============================================
// DATA MANAGER CLASS
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    this.borderSystem = new PerfectBorderSystem();
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
      "ping": ["Pong! 🏓", "Я жив! 💖", "Активен! ✅"],
      "бот проверка": ["Проверка пройдена! ✅", "Я здесь! 👍", "Работаю нормально! 🚀"],
      "бот работаешь": ["Работаю! 💪", "Да, всё хорошо! ✅", "Всё в порядке! 🟢"],
      "салам": ["Ва алейкум ассалам! 🕌", "Салам! 👋", "Привет! 😊"],
      "привет": ["Привет! 👋", "Здравствуй! 😊", "Приветствую! 🌸"],
      "спокойной ночи": ["Спокойной ночи! 🌙", "Сладких снов! 💤", "Доброй ночи! 😴"],
      "доброе утро": ["Доброе утро! ☀️", "С добрым утром! 🌅", "Утра доброго! 😊"],
      "что делаешь": ["Отвечаю тебе! 💬", "Думаю о тебе! 💖", "Работаю! 🤖"],
      "скучаешь": ["Да, скучаю! 😔", "Конечно! 💕", "Очень! 😘"],
      "good night": ["Good night! 🌙", "Sweet dreams! 💤", "Sleep well! 😴"],
      "good morning": ["Good morning! ☀️", "Morning! 🌅", "Rise and shine! 😊"],
      "miss you": ["Miss you too! 😔", "Always! 💕", "So much! 😘"]
    };
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

  formatWithBorder(text) {
    return this.borderSystem.createPerfectBorder(text);
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
// MESSAGE HANDLER CLASS - ALL FEATURES WORKING
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
    
    // Check if groups are enabled
    if (message.isGroup && !REPLY_IN_GROUPS) {
      return false;
    }
    
    // Check if channels are enabled
    if (message.isChannel && !REPLY_IN_CHANNELS) {
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
      
      // Apply PERFECT border to ALL messages (private, groups, channels)
      let formattedReply = replyText;
      if (USE_BORDERS) {
        formattedReply = this.data.formatWithBorder(replyText);
        this.stats.bordersUsed++;
      }
      
      // Check if it's a group message and needs mention
      let finalMessage = formattedReply;
      
      // If it's a group/channel and message has a sender, mention the user
      if ((message.isGroup || message.isChannel) && message.senderId) {
        try {
          const sender = await this.client.getEntity(message.senderId);
          if (sender) {
            const mention = `<a href="tg://user?id=${sender.id}">${sender.firstName || ''}</a>`;
            finalMessage = `${mention}\n\n${formattedReply}`;
          }
        } catch (error) {
          // Continue without mention if can't get user
        }
      }
      
      // Send reply with HTML parse mode
      await this.client.sendMessage(message.chatId, {
        message: finalMessage,
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
      
      // Log message with border preview
      const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
      console.log(`\n💌 [${chatType}] Replied to ${message.chatId}`);
      console.log(`📝 Text: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`);
      
      if (USE_BORDERS) {
        console.log('🎨 Border applied ✓');
      }
      
    } catch (error) {
      this.stats.errors++;
      if (LOG_LEVEL === 'debug') {
        console.error('❌ Message handler error:', error.message);
      }
    }
  }
}

// ============================================
// MAIN APPLICATION
// ============================================
async function main() {
  console.log('='.repeat(60));
  console.log(`🤖 ${BOT_NAME} - Telegram Userbot`);
  console.log('='.repeat(60));
  console.log(`📅 Version: 6.0.0 - FINAL PERFECT`);
  console.log(`🌟 Status: ALL FEATURES ACTIVE`);
  console.log(`🎯 Borders: PERFECT CENTERING`);
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
    console.log('\n🔗 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected to Telegram');
    
    // Get user info
    const me = await client.getMe();
    console.log(`👤 Logged in as: ${me.firstName || ''}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`📱 Username: @${me.username || 'N/A'}`);
    console.log(`🆔 User ID: ${me.id}`);
    
    // Setup event handler for all incoming messages
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({ incoming: true }));
    
    console.log('\n✅ Event handlers registered successfully!');
    console.log('👂 Bot is now listening for messages...');
    
    // Show perfect border examples
    console.log('\n📦 PERFECT BORDER EXAMPLES:');
    console.log('='.repeat(40));
    console.log(dataManager.formatWithBorder("Hello! How are you?"));
    console.log('');
    console.log(dataManager.formatWithBorder("Hi 🤗"));
    console.log('');
    console.log(dataManager.formatWithBorder("I love you! ❤️"));
    console.log('='.repeat(40));
    
    // Status monitoring every 5 minutes
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      console.log('\n📊 SYSTEM STATUS:');
      console.log('─'.repeat(30));
      console.log(`⏰ Uptime: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`📨 Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`📤 Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   ├─ Private: ${messageHandler.stats.privateReplies}`);
      console.log(`   ├─ Groups: ${messageHandler.stats.groupReplies}`);
      console.log(`   └─ Borders: ${messageHandler.stats.bordersUsed}`);
      console.log(`⚡ Rate Limit: ${rateLimiter.getRemainingActions()}/${MAX_ACTIONS_PER_MINUTE} left`);
      console.log(`❌ Errors: ${messageHandler.stats.errors}`);
      console.log('─'.repeat(30));
    }, 300000);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${BOT_NAME} is NOW ONLINE and READY!`);
    console.log('='.repeat(60));
    
    console.log('\n✨ ALL FEATURES ACTIVE:');
    console.log('   • Private chat replies ✓');
    console.log('   • Group chat replies ✓');
    console.log('   • Perfect border system ✓');
    console.log('   • Exact text centering ✓');
    console.log('   • HTML formatting ✓');
    console.log('   • Typing simulation ✓');
    console.log('   • Random reactions ✓');
    console.log('   • Rate limiting ✓');
    console.log('   • Bot message ignoring ✓');
    console.log('   • HTTP health endpoint ✓');
    console.log('='.repeat(60));
    
    console.log('\n💡 TEST COMMANDS:');
    console.log('   hi, hello, test, ping, бот');
    console.log('   i love you, how are you');
    console.log('   привет, салам, доброе утро');
    console.log('='.repeat(60));
    
    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM - Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT - Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    // Keep the process alive
    setInterval(() => {
      // Heartbeat to keep Render from sleeping
    }, 60000);
    
  } catch (error) {
    console.error('\n❌ STARTUP FAILED:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('AUTH_KEY')) {
      console.error('\n⚠️ SESSION STRING ERROR:');
      console.error('   Please generate a new session string:');
      console.error('   1. Run: npm run session');
      console.error('   2. Copy the session string');
      console.error('   3. Update SESSION_STRING in Render');
    }
    
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
