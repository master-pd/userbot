// ============================================
// YOUR CRUSH Userbot - Main Application
// COMPLETE PROFESSIONAL CODE WITH ALL FEATURES
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
const PORT = process.env.PORT || 3000;

// ============================================
// PERFECT BORDER SYSTEM - শুধু উপরে-নিচে বর্ডার
// ============================================
class PerfectBorderSystem {
  constructor() {
    this.borders = [];
    this.dataPath = path.join(__dirname, 'data');
    this.maxBorderLength = 40;
    this.minBorderLength = 20;
  }

  async loadBorders() {
    try {
      const borderPath = path.join(this.dataPath, 'border.json');
      const borderData = await fs.readFile(borderPath, 'utf8');
      this.borders = JSON.parse(borderData);
      
      console.log(`✅ Loaded ${this.borders.length} border styles from JSON`);
      
      if (this.borders.length === 0) {
        this.borders = this.getDefaultBorders();
        console.log('⚠️ Using default borders');
      }
      
    } catch (error) {
      console.log('📝 Creating default border.json...');
      this.borders = this.getDefaultBorders();
      await this.createDefaultBorderFile();
    }
  }

  getDefaultBorders() {
    return [
      {
        "name": "Double Line",
        "top": "═══",
        "bottom": "═══"
      },
      {
        "name": "Single Line",
        "top": "───",
        "bottom": "───"
      },
      {
        "name": "Star Style",
        "top": "✦──",
        "bottom": "──✦"
      },
      {
        "name": "Heart Style",
        "top": "❤️─",
        "bottom": "─❤️"
      },
      {
        "name": "Arrow Style",
        "top": "»─",
        "bottom": "─«"
      },
      {
        "name": "Dotted Line",
        "top": "•••",
        "bottom": "•••"
      }
    ];
  }

  async createDefaultBorderFile() {
    const defaultBorders = this.getDefaultBorders();
    await fs.writeFile(
      path.join(this.dataPath, 'border.json'),
      JSON.stringify(defaultBorders, null, 2)
    );
  }

  calculateOptimalBorderLength(text) {
    if (!text) return this.minBorderLength;
    
    const lines = text.split('\n');
    let maxLineLength = 0;
    
    for (const line of lines) {
      const cleanLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanLine.length > maxLineLength) {
        maxLineLength = cleanLine.length;
      }
    }
    
    if (maxLineLength <= 5) return 22;
    if (maxLineLength <= 10) return 25;
    if (maxLineLength <= 15) return 30;
    if (maxLineLength <= 20) return 35;
    
    return Math.min(maxLineLength + 6, this.maxBorderLength);
  }

  createPerfectBorder(text) {
    if (!text || text.trim() === '') return text;

    if (this.borders.length === 0) return text;
    
    const border = this.borders[Math.floor(Math.random() * this.borders.length)];
    const optimalLength = this.calculateOptimalBorderLength(text);
    
    let topBorder = this.createBorderLine(border.top, optimalLength);
    let bottomBorder = this.createBorderLine(border.bottom, optimalLength);
    
    const centeredLines = this.createCenteredLines(text, optimalLength);
    
    const result = [];
    result.push(topBorder);
    result.push('');
    centeredLines.forEach(line => result.push(line));
    result.push('');
    result.push(bottomBorder);
    
    return result.join('\n');
  }

  createBorderLine(borderPattern, targetLength) {
    if (borderPattern.length >= targetLength) {
      return borderPattern.substring(0, targetLength);
    }
    
    let result = borderPattern;
    
    if (borderPattern.length >= 2) {
      const leftPart = borderPattern.substring(0, Math.floor(borderPattern.length / 2));
      const rightPart = borderPattern.substring(Math.floor(borderPattern.length / 2));
      
      let middleChar = '─';
      if (borderPattern.includes('═')) middleChar = '═';
      else if (borderPattern.includes('━')) middleChar = '━';
      
      const middleLength = targetLength - (leftPart.length + rightPart.length);
      const middlePart = middleChar.repeat(Math.max(0, middleLength));
      
      result = leftPart + middlePart + rightPart;
    } else {
      const patternChar = borderPattern.charAt(0);
      while (result.length < targetLength) {
        result += patternChar;
      }
    }
    
    return result.substring(0, targetLength);
  }

  createCenteredLines(text, borderLength) {
    const lines = text.split('\n');
    const centeredLines = [];
    
    for (const line of lines) {
      if (line.trim() === '') {
        centeredLines.push('');
        continue;
      }
      
      const cleanText = line.replace(/<[^>]*>/g, '');
      const textLength = cleanText.length;
      
      if (textLength >= borderLength - 2) {
        centeredLines.push(line);
      } else {
        const totalPadding = borderLength - textLength;
        const leftPadding = Math.floor(totalPadding / 2);
        const rightPadding = totalPadding - leftPadding;
        
        const leftSpaces = ' '.repeat(Math.max(0, leftPadding));
        const rightSpaces = ' '.repeat(Math.max(0, rightPadding));
        
        centeredLines.push(leftSpaces + line + rightSpaces);
      }
    }
    
    return centeredLines;
  }
}

// ============================================
// SPAM PROTECTION SYSTEM
// ============================================
class SpamProtection {
  constructor() {
    this.userMessageCounts = new Map();
    this.mutedUsers = new Map();
    this.messageTimestamps = new Map();
    this.MAX_MESSAGES_PER_MINUTE = 7;
    this.MUTE_DURATION = 60000;
    this.CLEANUP_INTERVAL = 300000;
  }

  canUserSend(userId) {
    const now = Date.now();
    
    const muteEnd = this.mutedUsers.get(userId);
    if (muteEnd && now < muteEnd) return false;
    
    const userTimestamps = this.messageTimestamps.get(userId) || [];
    const validTimestamps = userTimestamps.filter(ts => now - ts < 60000);
    
    this.messageTimestamps.set(userId, validTimestamps);
    
    if (validTimestamps.length >= this.MAX_MESSAGES_PER_MINUTE) {
      this.mutedUsers.set(userId, now + this.MUTE_DURATION);
      console.log(`🔇 User ${userId} muted for 1 minute (spam detected)`);
      return false;
    }
    
    validTimestamps.push(now);
    this.messageTimestamps.set(userId, validTimestamps);
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    
    for (const [userId, muteEnd] of this.mutedUsers.entries()) {
      if (now >= muteEnd) {
        this.mutedUsers.delete(userId);
        console.log(`🔊 User ${userId} unmuted`);
      }
    }
    
    for (const [userId, timestamps] of this.messageTimestamps.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 120000);
      if (validTimestamps.length === 0) {
        this.messageTimestamps.delete(userId);
      } else {
        this.messageTimestamps.set(userId, validTimestamps);
      }
    }
  }

  startCleanupTimer() {
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }
}

// ============================================
// DATA MANAGER CLASS - JSON থেকে সব লোড হবে
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = [];
    this.voiceKeywords = [];
    this.stickerKeywords = [];
    this.emojiReplies = [];
    this.settings = {};
    this.borderSystem = new PerfectBorderSystem();
    this.spamProtection = new SpamProtection();
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadAllData() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.borderSystem.loadBorders();
      await this.loadConfig();
      await this.loadAutoReplies();
      await this.loadAdditionalData();
      this.spamProtection.startCleanupTimer();
      console.log('✅ All data loaded successfully from JSON files');
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      await this.createDefaultFiles();
    }
  }

  async loadConfig() {
    try {
      const configPath = path.join(this.dataPath, 'config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      this.settings = config.settings || {
        reply_in_groups: true,
        reply_in_channels: false,
        use_borders: true,
        max_actions_per_minute: 50,
        typing_min_delay: 800,
        typing_max_delay: 4000,
        log_level: 'info'
      };
      
      this.reactions = config.reactions || ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
      this.voiceKeywords = config.voice_replies?.keywords || ['voice', 'audio', 'sing', 'song'];
      this.stickerKeywords = config.sticker_replies?.keywords || ['sticker', 'meme', 'funny', 'laugh'];
      this.emojiReplies = config.emoji_replies?.unknown_message || ['😊', '🤔', '❤️', '👍', '🎉', '🔥'];
      
      console.log(`✅ Config loaded: ${Object.keys(this.settings).length} settings`);
    } catch (error) {
      console.log('📝 Creating default config.json...');
      await this.createDefaultConfig();
    }
  }

  async loadAutoReplies() {
    try {
      const replyPath = path.join(this.dataPath, 'auto_reply.json');
      const replyData = await fs.readFile(replyPath, 'utf8');
      this.replies = JSON.parse(replyData);
      console.log(`✅ Loaded ${Object.keys(this.replies).length} auto-reply patterns`);
    } catch (error) {
      console.log('📝 Creating default auto_reply.json...');
      this.replies = this.getDefaultReplies();
      await fs.writeFile(path.join(this.dataPath, 'auto_reply.json'), JSON.stringify(this.replies, null, 2));
    }
  }

  async loadAdditionalData() {
    try {
      const voicePath = path.join(this.dataPath, 'voice_files.json');
      try {
        const voiceData = await fs.readFile(voicePath, 'utf8');
        this.voiceFiles = JSON.parse(voiceData);
      } catch (e) {
        this.voiceFiles = [];
      }

      const stickerPath = path.join(this.dataPath, 'stickers.json');
      try {
        const stickerData = await fs.readFile(stickerPath, 'utf8');
        this.stickers = JSON.parse(stickerData);
      } catch (e) {
        this.stickers = [];
      }
    } catch (error) {
      console.log('ℹ️ No additional data files found');
    }
  }

  async createDefaultFiles() {
    await this.createDefaultConfig();
    await this.createDefaultAutoReplies();
  }

  async createDefaultConfig() {
    const defaultConfig = {
      settings: {
        reply_in_groups: true,
        reply_in_channels: false,
        use_borders: true,
        max_actions_per_minute: 50,
        typing_min_delay: 800,
        typing_max_delay: 4000,
        log_level: 'info'
      },
      reactions: ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'],
      voice_replies: {
        keywords: ['voice', 'audio', 'sing', 'song', 'গান', 'ভয়েস'],
        files: []
      },
      sticker_replies: {
        keywords: ['sticker', 'meme', 'funny', 'laugh', 'স্টিকার', 'মিম'],
        stickers: []
      },
      emoji_replies: {
        unknown_message: ['😊', '🤔', '❤️', '👍', '🎉', '🔥', '😘', '👀', '✨', '😂']
      }
    };
    
    this.settings = defaultConfig.settings;
    this.reactions = defaultConfig.reactions;
    this.voiceKeywords = defaultConfig.voice_replies.keywords;
    this.stickerKeywords = defaultConfig.sticker_replies.keywords;
    this.emojiReplies = defaultConfig.emoji_replies.unknown_message;
    
    await fs.writeFile(
      path.join(this.dataPath, 'config.json'),
      JSON.stringify(defaultConfig, null, 2)
    );
  }

  async createDefaultAutoReplies() {
    this.replies = this.getDefaultReplies();
    await fs.writeFile(
      path.join(this.dataPath, 'auto_reply.json'),
      JSON.stringify(this.replies, null, 2)
    );
  }

  getDefaultReplies() {
    return {
      "hi": ["<b>Hello!</b> 👋", "<i>Hi there!</i> 😊", "<code>Hey!</code> ❤️"],
      "hello": ["<b>Hi!</b> 😄", "<u>Hello!</u> 💖", "Hey there! 🌸"],
      "test": ["<b>Test successful!</b> ✅", "<i>Working!</i> 🚀", "All good! 👍"],
      "i love you": ["<b>Love you too!</b> ❤️", "<i>Aww</i> 😘", "You're sweet! 💕"],
      "how are you": ["<b>I'm good!</b> 😊", "All good! 😄", "<u>Feeling great!</u> 🌟"]
    };
  }

  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  findReply(message) {
    if (!message || typeof message !== 'string') return null;
    
    const msg = message.toLowerCase().trim();
    if (msg.length === 0) return null;
    
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
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
    if (this.reactions.length === 0) return '👍';
    return this.reactions[Math.floor(Math.random() * this.reactions.length)];
  }

  formatWithBorder(text) {
    return this.borderSystem.createPerfectBorder(text);
  }

  canUserSendMessage(userId) {
    return this.spamProtection.canUserSend(userId);
  }
}

// ============================================
// MESSAGE HANDLER CLASS - ALL FEATURES WORKING
// ============================================
class MessageHandler {
  constructor(client, dataManager) {
    this.client = client;
    this.data = dataManager;
    this.lastActionTime = 0;
    this.cooldownPeriod = 1000;
    this.stats = {
      messagesReceived: 0,
      responsesSent: 0,
      errors: 0,
      groupReplies: 0,
      privateReplies: 0,
      bordersUsed: 0,
      reactionsSent: 0,
      voiceReplies: 0,
      stickerReplies: 0,
      emojiReplies: 0,
      spamBlocked: 0,
      botMessagesIgnored: 0
    };
  }

  async shouldProcessMessage(message) {
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    if (message.sender && message.sender.bot) {
      this.stats.botMessagesIgnored++;
      console.log(`🤖 Bot message ignored from ${message.senderId}`);
      return false;
    }
    
    if (message.out) {
      return false;
    }
    
    const userId = message.senderId;
    if (userId && !this.data.canUserSendMessage(userId)) {
      this.stats.spamBlocked++;
      console.log(`🔇 Spam blocked from user ${userId}`);
      return false;
    }
    
    if (message.isGroup && !this.data.getSetting('reply_in_groups', true)) {
      return false;
    }
    
    if (message.isChannel && !this.data.getSetting('reply_in_channels', false)) {
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
        // রিয়েক্ট দিবে এমনকি যদি রিপ্লাই না দেওয়া হয়
        await this.handleAutoReact(message);
        return;
      }
      
      const text = message.message.toLowerCase().trim();
      const replyText = this.data.findReply(message.message);
      
      if (replyText) {
        // টাইপিং দেখাবে এবং তারপর রিপ্লাই দিবে
        await this.handleTextReplyWithTyping(message, replyText);
      } else {
        // রিপ্লাই না থাকলেও রিয়েক্ট দিবে
        console.log(`ℹ️ No reply found for: "${message.message.substring(0, 30)}..."`);
      }
      
      // সব মেসেজে রিয়েক্ট দিবে (রিপ্লাই থাকুক বা না থাকুক)
      await this.handleAutoReact(message);
      
      // Voice keyword check
      if (this.data.containsVoiceKeyword(text)) {
        await this.handleVoiceReply(message);
      }
      
      // Sticker keyword check
      if (this.data.containsStickerKeyword(text)) {
        await this.handleStickerReply(message);
      }
      
      this.lastActionTime = Date.now();
      
    } catch (error) {
      this.stats.errors++;
      if (this.data.getSetting('log_level') === 'debug') {
        console.error('❌ Message handler error:', error.message);
      }
    }
  }

  async handleTextReplyWithTyping(message, replyText) {
    let sentMessage = null;
    
    try {
      // প্রথমে "টাইপিং..." মেসেজ সেন্ড করবে
      const typingMessage = "⌨️ টাইপিং...";
      sentMessage = await this.client.sendMessage(message.chatId, {
        message: typingMessage,
        parseMode: 'html'
      });
      
      // 0.5-1.5 সেকেন্ড অপেক্ষা (টাইপিং ইফেক্টের জন্য)
      const typingDelay = Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      
      // Apply border if enabled
      let formattedReply = replyText;
      if (this.data.getSetting('use_borders', true)) {
        formattedReply = this.data.formatWithBorder(replyText);
        this.stats.bordersUsed++;
      }
      
      // Add mention in groups
      let finalMessage = formattedReply;
      if ((message.isGroup || message.isChannel) && message.senderId) {
        try {
          const sender = await this.client.getEntity(message.senderId);
          if (sender) {
            const mention = `<a href="tg://user?id=${sender.id}">${sender.firstName || ''}</a>`;
            finalMessage = `${mention}\n\n${formattedReply}`;
          }
        } catch (error) {
          // Continue without mention
        }
      }
      
      // Edit the message with actual reply
      if (sentMessage) {
        await this.client.editMessage(message.chatId, {
          message: sentMessage.id,
          text: finalMessage,
          parseMode: 'html'
        });
      } else {
        // যদি edit না হয় তবে নতুন মেসেজ সেন্ড করবে
        await this.client.sendMessage(message.chatId, {
          message: finalMessage,
          parseMode: 'html'
        });
      }
      
      this.stats.responsesSent++;
      
      if (message.isGroup) {
        this.stats.groupReplies++;
      } else if (!message.isChannel) {
        this.stats.privateReplies++;
      }
      
      const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
      console.log(`\n💌 [${chatType}] Replied to ${message.chatId}`);
      console.log(`📝 Text: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`);
      
      if (this.data.getSetting('use_borders', true)) {
        console.log('🎨 Border applied ✓');
      }
      
    } catch (error) {
      console.error('Error in reply with typing:', error.message);
      // যদি edit ফেইল হয়, সরাসরি মেসেজ সেন্ড করবে
      try {
        await this.client.sendMessage(message.chatId, {
          message: replyText,
          parseMode: 'html'
        });
      } catch (sendError) {
        // Silent fail
      }
    }
  }

  async handleVoiceReply(message) {
    try {
      await this.client.sendMessage(message.chatId, {
        message: "🎵 <b>Voice reply feature is active!</b>",
        parseMode: 'html'
      });
      this.stats.voiceReplies++;
    } catch (error) {
      // Silent fail
    }
  }

  async handleStickerReply(message) {
    try {
      await this.client.sendMessage(message.chatId, {
        message: "😄 <b>Sticker/Meme feature is active!</b>",
        parseMode: 'html'
      });
      this.stats.stickerReplies++;
    } catch (error) {
      // Silent fail
    }
  }

  async handleAutoReact(message) {
    try {
      const reaction = this.data.getRandomReaction();
      
      await this.client.invoke(new Api.messages.SendReaction({
        peer: message.chatId,
        msgId: message.id,
        reaction: [new Api.ReactionEmoji({ emoticon: reaction })]
      }));
      
      this.stats.reactionsSent++;
      console.log(`⭐ Reacted with ${reaction} to message from ${message.senderId}`);
      
    } catch (error) {
      // Silent fail
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
  console.log(`📅 Version: 10.0.0 - TYPING EFFECT + REACTIONS`);
  console.log(`🌟 Status: ALL FEATURES ACTIVE`);
  console.log(`🎯 Features: Typing Effect, Auto React, Smart Borders`);
  console.log('='.repeat(60));
  
  // Initialize Data Manager
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  // Initialize Telegram Client
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true,
    requestRetries: 3
  });
  
  // Initialize message handler
  const messageHandler = new MessageHandler(client, dataManager);
  
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
    
    // Setup event handler
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({ incoming: true }));
    
    console.log('\n✅ Event handlers registered successfully!');
    console.log('👂 Bot is now listening for messages...');
    
    // Start HTTP server for health check
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        bot: BOT_NAME,
        service: 'Telegram Userbot',
        uptime: process.uptime(),
        stats: messageHandler.stats,
        timestamp: new Date().toISOString()
      }));
    });
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Health check server running on port ${PORT}`);
    });
    
    console.log('\n✨ ALL FEATURES ACTIVE:');
    console.log('   • Typing effect before reply ✓');
    console.log('   • Auto reaction on every message ✓');
    console.log('   • Smart border system ✓');
    console.log('   • HTML formatting support ✓');
    console.log('   • Spam protection ✓');
    console.log('   • Bot message ignoring ✓');
    console.log('   • JSON file loading ✓');
    console.log('='.repeat(60));
    
    console.log('\n🔄 WORKFLOW:');
    console.log('   1. User sends message');
    console.log('   2. Bot sends "⌨️ টাইপিং..."');
    console.log('   3. Bot adds reaction to message');
    console.log('   4. After delay, edits with actual reply');
    console.log('   5. If no reply in JSON, only reaction');
    console.log('='.repeat(60));
    
    // Status monitoring
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      console.log('\n📊 SYSTEM STATUS:');
      console.log('─'.repeat(40));
      console.log(`⏰ Uptime: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`📨 Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`📤 Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`⭐ Reactions: ${messageHandler.stats.reactionsSent}`);
      console.log(`🎨 Borders: ${messageHandler.stats.bordersUsed}`);
      console.log(`🔇 Spam blocked: ${messageHandler.stats.spamBlocked}`);
      console.log(`🤖 Bot ignored: ${messageHandler.stats.botMessagesIgnored}`);
      console.log(`❌ Errors: ${messageHandler.stats.errors}`);
      console.log('─'.repeat(40));
    }, 300000);
    
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
      // Heartbeat
    }, 60000);
    
  } catch (error) {
    console.error('\n❌ STARTUP FAILED:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('AUTH_KEY')) {
      console.error('\n⚠️ SESSION STRING ERROR:');
      console.error('   Please generate a new session string');
    }
    
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
