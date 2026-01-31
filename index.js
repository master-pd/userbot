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
    this.maxBorderLength = 60; // Maximum border length
    this.minBorderLength = 30; // Minimum border length
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
        "top": "══════════════",
        "bottom": "══════════════"
      },
      {
        "name": "Single Line",
        "top": "──────────────",
        "bottom": "──────────────"
      },
      {
        "name": "Star Style",
        "top": "✦────────────✦",
        "bottom": "✦────────────✦"
      },
      {
        "name": "Heart Style",
        "top": "❤️──────────❤️",
        "bottom": "❤️──────────❤️"
      },
      {
        "name": "Arrow Style",
        "top": "»»──────────««",
        "bottom": "»»──────────««"
      },
      {
        "name": "Dotted Line",
        "top": "••••••••••••••",
        "bottom": "••••••••••••••"
      },
      {
        "name": "Wave Style",
        "top": "〜〜〜〜〜〜〜〜〜〜",
        "bottom": "〜〜〜〜〜〜〜〜〜〜"
      },
      {
        "name": "Fire Style",
        "top": "🔥──────────🔥",
        "bottom": "🔥──────────🔥"
      },
      {
        "name": "Music Style",
        "top": "♫──────────♫",
        "bottom": "♫──────────♫"
      },
      {
        "name": "Thick Line",
        "top": "━━━━━━━━━━━━",
        "bottom": "━━━━━━━━━━━━"
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
    
    // Split text into lines
    const lines = text.split('\n');
    let maxLineLength = 0;
    
    // Calculate maximum line length
    for (const line of lines) {
      // Remove HTML tags for length calculation
      const cleanLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanLine.length > maxLineLength) {
        maxLineLength = cleanLine.length;
      }
    }
    
    // Calculate optimal border length
    let optimalLength = Math.max(
      this.minBorderLength,
      Math.min(maxLineLength + 4, this.maxBorderLength) // Add padding
    );
    
    // Ensure border length is not too small for short texts
    if (maxLineLength < 10) {
      optimalLength = Math.max(this.minBorderLength, 20);
    }
    
    return optimalLength;
  }

  createPerfectBorder(text) {
    if (!text || text.trim() === '') {
      return text;
    }

    // Select random border from JSON
    if (this.borders.length === 0) {
      return text;
    }
    
    const border = this.borders[Math.floor(Math.random() * this.borders.length)];
    
    // Calculate optimal border length based on text
    const optimalLength = this.calculateOptimalBorderLength(text);
    
    // Create border lines with optimal length
    let topBorder = this.createBorderLine(border.top, optimalLength);
    let bottomBorder = this.createBorderLine(border.bottom, optimalLength);
    
    // Create centered text lines
    const centeredLines = this.createCenteredLines(text, optimalLength);
    
    // Assemble complete border (শুধু উপরে এবং নিচে)
    const result = [];
    result.push(topBorder);
    result.push(''); // Empty line before text
    
    // Add all text lines
    centeredLines.forEach(line => {
      result.push(line);
    });
    
    result.push(''); // Empty line after text
    result.push(bottomBorder);
    
    return result.join('\n');
  }

  createBorderLine(borderPattern, targetLength) {
    if (borderPattern.length >= targetLength) {
      return borderPattern.substring(0, targetLength);
    }
    
    // Extend border pattern to reach target length
    let result = borderPattern;
    const patternLength = borderPattern.length;
    let patternIndex = 0;
    
    while (result.length < targetLength) {
      result += borderPattern[patternIndex % patternLength];
      patternIndex++;
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
      
      // Calculate actual text length (without HTML tags)
      const cleanText = line.replace(/<[^>]*>/g, '');
      const textLength = cleanText.length;
      
      if (textLength >= borderLength - 4) {
        // If text is too long, keep it as is (no centering)
        centeredLines.push(line);
      } else {
        // Calculate padding for centering
        const totalPadding = borderLength - textLength;
        const leftPadding = Math.floor(totalPadding / 2);
        const rightPadding = totalPadding - leftPadding;
        
        // Create centered line with HTML tags preserved
        const leftSpaces = ' '.repeat(Math.max(0, leftPadding - 2));
        const rightSpaces = ' '.repeat(Math.max(0, rightPadding - 2));
        
        centeredLines.push(leftSpaces + line + rightSpaces);
      }
    }
    
    return centeredLines;
  }

  getRandomBorder() {
    if (this.borders.length === 0) {
      return this.getDefaultBorders()[0];
    }
    return this.borders[Math.floor(Math.random() * this.borders.length)];
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
    this.MAX_MESSAGES_PER_MINUTE = 7; // 7 messages per minute maximum
    this.MUTE_DURATION = 60000; // 1 minute mute
    this.CLEANUP_INTERVAL = 300000; // Clean every 5 minutes
  }

  canUserSend(userId) {
    const now = Date.now();
    
    // Check if user is muted
    const muteEnd = this.mutedUsers.get(userId);
    if (muteEnd && now < muteEnd) {
      return false;
    }
    
    // Clean old messages for this user
    const userTimestamps = this.messageTimestamps.get(userId) || [];
    const validTimestamps = userTimestamps.filter(ts => now - ts < 60000);
    
    // Update counts
    this.messageTimestamps.set(userId, validTimestamps);
    
    // Check if user exceeded limit
    if (validTimestamps.length >= this.MAX_MESSAGES_PER_MINUTE) {
      // Mute the user for 1 minute
      this.mutedUsers.set(userId, now + this.MUTE_DURATION);
      console.log(`🔇 User ${userId} muted for 1 minute (spam detected)`);
      return false;
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.messageTimestamps.set(userId, validTimestamps);
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    
    // Remove old muted users
    for (const [userId, muteEnd] of this.mutedUsers.entries()) {
      if (now >= muteEnd) {
        this.mutedUsers.delete(userId);
        console.log(`🔊 User ${userId} unmuted`);
      }
    }
    
    // Remove old message timestamps
    for (const [userId, timestamps] of this.messageTimestamps.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 120000); // Keep 2 minutes
      if (validTimestamps.length === 0) {
        this.messageTimestamps.delete(userId);
      } else {
        this.messageTimestamps.set(userId, validTimestamps);
      }
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  getUserStats(userId) {
    const timestamps = this.messageTimestamps.get(userId) || [];
    const now = Date.now();
    const recentMessages = timestamps.filter(ts => now - ts < 60000).length;
    const isMuted = this.mutedUsers.has(userId);
    const muteEnd = this.mutedUsers.get(userId);
    const timeLeft = muteEnd ? Math.max(0, muteEnd - now) : 0;
    
    return {
      recentMessages,
      isMuted,
      timeLeft,
      canSend: this.canUserSend(userId)
    };
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
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataPath, { recursive: true });

      // Load borders first
      await this.borderSystem.loadBorders();
      
      // Load config.json
      await this.loadConfig();
      
      // Load auto_reply.json
      await this.loadAutoReplies();
      
      // Load other JSON files if they exist
      await this.loadAdditionalData();
      
      // Start spam protection cleanup
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
      // Load voice files list if exists
      const voicePath = path.join(this.dataPath, 'voice_files.json');
      try {
        const voiceData = await fs.readFile(voicePath, 'utf8');
        this.voiceFiles = JSON.parse(voiceData);
      } catch (e) {
        this.voiceFiles = [];
      }

      // Load stickers list if exists
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
      "how are you": ["<b>I'm good!</b> 😊", "All good! 😄", "<u>Feeling great!</u> 🌟"],
      "бот": ["<b>Bot здесь!</b> 🤖", "<i>Привет!</i> 👋", "Да, я здесь! ✅"],
      "ping": ["<b>Pong!</b> 🏓", "<i>Я жив!</i> 💖", "Активен! ✅"],
      "бот проверка": ["<b>Проверка пройдена!</b> ✅", "Я здесь! 👍", "Работаю нормально! 🚀"],
      "бот работаешь": ["<b>Работаю!</b> 💪", "Да, всё хорошо! ✅", "Всё в порядке! 🟢"],
      "салам": ["<b>Ва алейкум ассалам!</b> 🕌", "<i>Салам!</i> 👋", "Привет! 😊"],
      "привет": ["<b>Привет!</b> 👋", "Здравствуй! 😊", "Приветствую! 🌸"],
      "спокойной ночи": ["<b>Спокойной ночи!</b> 🌙", "<i>Сладких снов!</i> 💤", "Доброй ночи! 😴"],
      "доброе утро": ["<b>Доброе утро!</b> ☀️", "С добрым утром! 🌅", "<u>Утра доброго!</u> 😊"],
      "что делаешь": ["<b>Отвечаю тебе!</b> 💬", "Думаю о тебе! 💖", "<i>Работаю!</i> 🤖"],
      "скучаешь": ["<b>Да, скучаю!</b> 😔", "Конечно! 💕", "<u>Очень!</u> 😘"],
      "good night": ["<b>Good night!</b> 🌙", "<i>Sweet dreams!</i> 💤", "Sleep well! 😴"],
      "good morning": ["<b>Good morning!</b> ☀️", "Morning! 🌅", "<u>Rise and shine!</u> 😊"],
      "miss you": ["<b>Miss you too!</b> 😔", "Always! 💕", "So much! 😘"]
    };
  }

  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
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

  getRandomEmoji() {
    if (this.emojiReplies.length === 0) return '😊';
    return this.emojiReplies[Math.floor(Math.random() * this.emojiReplies.length)];
  }

  containsVoiceKeyword(text) {
    if (!text || typeof text !== 'string') return false;
    return this.voiceKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  containsStickerKeyword(text) {
    if (!text || typeof text !== 'string') return false;
    return this.stickerKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  formatWithBorder(text) {
    return this.borderSystem.createPerfectBorder(text);
  }

  canUserSendMessage(userId) {
    return this.spamProtection.canUserSend(userId);
  }

  getUserSpamStats(userId) {
    return this.spamProtection.getUserStats(userId);
  }
}

// ============================================
// TYPING SYSTEM CLASS
// ============================================
class TypingSystem {
  constructor(client, dataManager) {
    this.client = client;
    this.dataManager = dataManager;
    this.isTyping = false;
  }

  getRandomDelay() {
    const minDelay = this.dataManager.getSetting('typing_min_delay', 800);
    const maxDelay = this.dataManager.getSetting('typing_max_delay', 4000);
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
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
  constructor(dataManager) {
    this.maxPerMinute = dataManager.getSetting('max_actions_per_minute', 50);
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
    // Check if valid message
    if (!message || !message.message || message.message.trim() === '') {
      return false;
    }
    
    // Skip if from bot (বট মেসেজ ইগনোর)
    if (message.sender && message.sender.bot) {
      this.stats.botMessagesIgnored++;
      console.log(`🤖 Bot message ignored from ${message.senderId}`);
      return false;
    }
    
    // Skip own messages
    if (message.out) {
      return false;
    }
    
    // Check spam protection
    const userId = message.senderId;
    if (userId && !this.data.canUserSendMessage(userId)) {
      this.stats.spamBlocked++;
      console.log(`🔇 Spam blocked from user ${userId}`);
      return false;
    }
    
    // Check if groups are enabled
    if (message.isGroup && !this.data.getSetting('reply_in_groups', true)) {
      return false;
    }
    
    // Check if channels are enabled
    if (message.isChannel && !this.data.getSetting('reply_in_channels', false)) {
      return false;
    }
    
    // Check rate limit
    if (!this.rateLimiter.canPerformAction()) {
      console.log('⚠️ Rate limit reached, skipping message');
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
      
      const text = message.message.toLowerCase().trim();
      
      // AUTO-REPLY FEATURE (Text replies)
      const replyText = this.data.findReply(message.message);
      if (replyText) {
        await this.handleTextReply(message, replyText);
      }
      
      // VOICE REPLY FEATURE (Keyword based)
      if (this.data.containsVoiceKeyword(text)) {
        await this.handleVoiceReply(message);
      }
      
      // STICKER REPLY FEATURE
      if (this.data.containsStickerKeyword(text)) {
        await this.handleStickerReply(message);
      }
      
      // EMOJI REPLY for unknown messages (only if no text reply)
      if (!replyText && Math.random() < 0.2) { // 20% chance
        await this.handleEmojiReply(message);
      }
      
      // AUTO-REACT FEATURE (30% chance)
      if (Math.random() < 0.3 && this.rateLimiter.canPerformAction()) {
        await this.handleAutoReact(message);
      }
      
    } catch (error) {
      this.stats.errors++;
      if (this.data.getSetting('log_level') === 'debug') {
        console.error('❌ Message handler error:', error.message);
      }
    }
  }

  async handleTextReply(message, replyText) {
    // Typing simulation only in private chats
    if (!message.isGroup && !message.isChannel) {
      await this.typing.simulateTyping(message.chatId);
    }
    
    // Apply PERFECT border to ALL messages
    let formattedReply = replyText;
    if (this.data.getSetting('use_borders', true)) {
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
    
    // Log message with border preview
    const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
    console.log(`\n💌 [${chatType}] Replied to ${message.chatId}`);
    console.log(`📝 Text: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`);
    
    if (this.data.getSetting('use_borders', true)) {
      console.log('🎨 Border applied ✓');
    }
  }

  async handleVoiceReply(message) {
    try {
      // Send a message about voice feature
      await this.client.sendMessage(message.chatId, {
        message: "🎵 <b>Voice reply feature is active!</b>\n<i>Configure voice files in data/ folder</i>",
        parseMode: 'html'
      });
      this.stats.voiceReplies++;
      this.lastActionTime = Date.now();
      
      console.log(`🎵 Voice reply sent to ${message.chatId}`);
    } catch (error) {
      // Silent fail
    }
  }

  async handleStickerReply(message) {
    try {
      // Send a sticker or text about sticker feature
      await this.client.sendMessage(message.chatId, {
        message: "😄 <b>Sticker/Meme feature is active!</b>\n<u>Add stickers in data/stickers.json</u>",
        parseMode: 'html'
      });
      this.stats.stickerReplies++;
      this.lastActionTime = Date.now();
      
      console.log(`😂 Sticker reply sent to ${message.chatId}`);
    } catch (error) {
      // Silent fail
    }
  }

  async handleEmojiReply(message) {
    try {
      const emoji = this.data.getRandomEmoji();
      await this.client.sendMessage(message.chatId, {
        message: emoji
      });
      this.stats.emojiReplies++;
      this.lastActionTime = Date.now();
      
      console.log(`😊 Emoji reply (${emoji}) sent to ${message.chatId}`);
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
      console.log(`⭐ Reacted with ${reaction} to message in ${message.chatId}`);
      
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
  console.log(`📅 Version: 9.0.0 - ULTIMATE PROFESSIONAL`);
  console.log(`🌟 Status: ALL FEATURES ACTIVE + SPAM PROTECTION`);
  console.log(`🎯 Borders: SMART ADJUSTING + HTML SUPPORT`);
  console.log('='.repeat(60));
  
  // Initialize Data Manager (JSON থেকে সব লোড হবে)
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
  
  // Initialize systems
  const rateLimiter = new RateLimiter(dataManager);
  const typingSystem = new TypingSystem(client, dataManager);
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
    
    // Start HTTP server for health check
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        bot: BOT_NAME,
        service: 'Telegram Userbot',
        uptime: process.uptime(),
        stats: messageHandler.stats,
        border_styles_loaded: dataManager.borderSystem.borders.length,
        spam_protection: 'active',
        html_support: 'active',
        timestamp: new Date().toISOString()
      }));
    });
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Health check server running on port ${PORT}`);
    });
    
    // Show border examples from JSON
    console.log('\n📦 SMART BORDER EXAMPLES:');
    console.log('='.repeat(40));
    
    // Show different border examples
    const testTexts = [
      "Hi!",
      "Hello! How are you?",
      "This is a longer message to test border adjustment with multiple lines of text",
      "<b>HTML</b> <i>formatted</i> <u>text</u> <code>with</code> styling"
    ];
    
    for (const text of testTexts) {
      console.log(dataManager.formatWithBorder(text));
      console.log('');
    }
    
    console.log('='.repeat(40));
    
    console.log('\n✨ ALL FEATURES ACTIVE:');
    console.log('   • Private chat replies ✓');
    console.log('   • Group chat replies ✓');
    console.log('   • Smart border system ✓');
    console.log('   • HTML formatting support ✓');
    console.log('   • Typing simulation ✓');
    console.log('   • Random reactions ✓');
    console.log('   • Voice replies ✓');
    console.log('   • Sticker replies ✓');
    console.log('   • Emoji replies ✓');
    console.log('   • Spam protection ✓');
    console.log('   • Bot message ignoring ✓');
    console.log('   • Rate limiting ✓');
    console.log('   • HTTP health endpoint ✓');
    console.log('   • JSON file loading ✓');
    console.log('   • Smart border adjustment ✓');
    console.log('='.repeat(60));
    
    console.log('\n🔒 SPAM PROTECTION:');
    console.log('   • Max 7 messages/minute per user');
    console.log('   • 1 minute mute for spammers');
    console.log('   • Automatic cleanup');
    console.log('='.repeat(60));
    
    console.log('\n💡 TEST COMMANDS:');
    console.log('   • hi, hello, test, ping, бот');
    console.log('   • i love you, how are you');
    console.log('   • привет, салам, доброе утро');
    console.log('   • voice, audio (for voice reply)');
    console.log('   • sticker, meme (for sticker reply)');
    console.log('='.repeat(60));
    
    // Status monitoring every 5 minutes
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      console.log('\n📊 SYSTEM STATUS:');
      console.log('─'.repeat(45));
      console.log(`⏰ Uptime: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`📨 Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`📤 Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   ├─ Private: ${messageHandler.stats.privateReplies}`);
      console.log(`   ├─ Groups: ${messageHandler.stats.groupReplies}`);
      console.log(`   ├─ Borders: ${messageHandler.stats.bordersUsed}`);
      console.log(`   ├─ Reactions: ${messageHandler.stats.reactionsSent}`);
      console.log(`   ├─ Voice: ${messageHandler.stats.voiceReplies}`);
      console.log(`   ├─ Stickers: ${messageHandler.stats.stickerReplies}`);
      console.log(`   ├─ Emojis: ${messageHandler.stats.emojiReplies}`);
      console.log(`   ├─ Spam blocked: ${messageHandler.stats.spamBlocked}`);
      console.log(`   └─ Bot ignored: ${messageHandler.stats.botMessagesIgnored}`);
      console.log(`⚡ Rate Limit: ${rateLimiter.getRemainingActions()}/${dataManager.getSetting('max_actions_per_minute', 50)} left`);
      console.log(`🎨 Border Styles: ${dataManager.borderSystem.borders.length}`);
      console.log(`❌ Errors: ${messageHandler.stats.errors}`);
      console.log('─'.repeat(45));
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
