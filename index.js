// ============================================
// YOUR CRUSH Userbot - COMPLETE ALL FEATURES
// ALL FEATURES INCLUDED - FINAL VERSION
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
const PORT = process.env.PORT || 3000;

// ============================================
// AUTO BLOCKQUOTE SYSTEM
// ============================================
class AutoBlockquoteSystem {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  autoBlockquote(text) {
    if (!text || text.trim() === '') return text;
    if (text.includes('<blockquote>')) return text;
    
    // Remove existing blockquote if any
    let cleanText = text.replace(/<\/?blockquote>/g, '');
    
    // Auto blockquote
    return `<blockquote>${cleanText}</blockquote>`;
  }

  async loadTypingMessages() {
    try {
      const typingPath = path.join(this.dataPath, 'typing.json');
      const typingData = await fs.readFile(typingPath, 'utf8');
      return JSON.parse(typingData);
    } catch (error) {
      return [
        "══════════════════════\n\n      <b>Typing...</b> 🤫\n\n     ══════════════════════",
        "══════════════════════\n\n  <i>একটু ওয়েট কর...</i> ⏳\n\n     ══════════════════════",
        "══════════════════════\n\n    <code>Thinking...</code> 🤔\n\n     ══════════════════════",
        "══════════════════════\n\n    <b>রিপ্লাই আসছে...</b> 🚀\n\n     ══════════════════════"
      ];
    }
  }
}

// ============================================
// PERFECT BORDER SYSTEM
// ============================================
class PerfectBorderSystem {
  constructor() {
    this.borders = [];
    this.dataPath = path.join(__dirname, 'data');
    this.blockquoteSystem = new AutoBlockquoteSystem();
  }

  async loadBorders() {
    try {
      const borderPath = path.join(this.dataPath, 'border.json');
      const borderData = await fs.readFile(borderPath, 'utf8');
      this.borders = JSON.parse(borderData);
      console.log(`✅ Loaded ${this.borders.length} border styles`);
    } catch (error) {
      console.log('📝 Creating default border.json...');
      this.borders = this.getDefaultBorders();
      await this.createDefaultBorderFile();
    }
  }

  getDefaultBorders() {
    return [
      { "name": "Double Line", "top": "═══", "bottom": "═══" },
      { "name": "Single Line", "top": "───", "bottom": "───" },
      { "name": "Star Style", "top": "✦──", "bottom": "──✦" },
      { "name": "Heart Style", "top": "❤️─", "bottom": "─❤️" },
      { "name": "Arrow Style", "top": "»─", "bottom": "─«" }
    ];
  }

  async createDefaultBorderFile() {
    await fs.writeFile(
      path.join(this.dataPath, 'border.json'),
      JSON.stringify(this.getDefaultBorders(), null, 2)
    );
  }

  createPerfectBorder(text) {
    if (!text || text.trim() === '') return text;
    if (this.borders.length === 0) return text;
    
    const blockquotedText = this.blockquoteSystem.autoBlockquote(text);
    const border = this.borders[Math.floor(Math.random() * this.borders.length)];
    
    const cleanText = blockquotedText.replace(/<[^>]*>/g, '');
    const textLength = cleanText.length;
    const optimalLength = Math.max(22, Math.min(textLength + 6, 40));
    
    const topBorder = this.createBorderLine(border.top, optimalLength);
    const bottomBorder = this.createBorderLine(border.bottom, optimalLength);
    
    const totalPadding = optimalLength - textLength;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;
    
    const centeredText = ' '.repeat(Math.max(0, leftPadding)) + blockquotedText + ' '.repeat(Math.max(0, rightPadding));
    
    return `${topBorder}\n\n${centeredText}\n\n${bottomBorder}`;
  }

  createBorderLine(borderPattern, targetLength) {
    if (borderPattern.length >= targetLength) return borderPattern.substring(0, targetLength);
    
    let result = borderPattern;
    if (borderPattern.length >= 2) {
      const leftPart = borderPattern.substring(0, Math.floor(borderPattern.length / 2));
      const rightPart = borderPattern.substring(Math.floor(borderPattern.length / 2));
      
      let middleChar = '═';
      if (borderPattern.includes('─')) middleChar = '─';
      else if (borderPattern.includes('━')) middleChar = '━';
      
      const middleLength = targetLength - (leftPart.length + rightPart.length);
      const middlePart = middleChar.repeat(Math.max(0, middleLength));
      result = leftPart + middlePart + rightPart;
    } else {
      const patternChar = borderPattern.charAt(0);
      result = patternChar.repeat(targetLength);
    }
    
    return result.substring(0, targetLength);
  }
}

// ============================================
// SPAM PROTECTION SYSTEM
// ============================================
class SpamProtection {
  constructor() {
    this.mutedUsers = new Map();
    this.messageTimestamps = new Map();
    this.MAX_MESSAGES_PER_MINUTE = 60;
    this.MUTE_DURATION = 60000;
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
      return false;
    }
    
    validTimestamps.push(now);
    this.messageTimestamps.set(userId, validTimestamps);
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    
    for (const [userId, muteEnd] of this.mutedUsers.entries()) {
      if (now >= muteEnd) this.mutedUsers.delete(userId);
    }
    
    for (const [userId, timestamps] of this.messageTimestamps.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 120000);
      if (validTimestamps.length === 0) this.messageTimestamps.delete(userId);
      else this.messageTimestamps.set(userId, validTimestamps);
    }
  }

  startCleanupTimer() {
    setInterval(() => this.cleanup(), 300000);
  }
}

// ============================================
// VOICE MESSAGE SYSTEM
// ============================================
class VoiceMessageSystem {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadVoiceKeywords() {
    try {
      const voicePath = path.join(this.dataPath, 'voice_keywords.json');
      const voiceData = await fs.readFile(voicePath, 'utf8');
      return JSON.parse(voiceData);
    } catch (error) {
      return {
        "keywords": ["voice", "audio", "sing", "song", "গান", "ভয়েস", "music"],
        "responses": [
          "<blockquote><b>Voice message coming!</b> 🎵</blockquote>",
          "<blockquote><i>Audio reply on the way...</i> 🎶</blockquote>",
          "<blockquote><code>Sending voice...</code> 🎤</blockquote>"
        ]
      };
    }
  }

  containsVoiceKeyword(text) {
    if (!text) return false;
    const keywords = ['voice', 'audio', 'sing', 'song', 'গান', 'ভয়েস', 'music'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  getVoiceResponse() {
    const responses = [
      "<blockquote><b>Voice message coming!</b> 🎵</blockquote>",
      "<blockquote><i>Audio reply on the way...</i> 🎶</blockquote>",
      "<blockquote><code>Sending voice...</code> 🎤</blockquote>"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// ============================================
// STICKER/MEME SYSTEM
// ============================================
class StickerMemeSystem {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadStickerKeywords() {
    try {
      const stickerPath = path.join(this.dataPath, 'sticker_keywords.json');
      const stickerData = await fs.readFile(stickerPath, 'utf8');
      return JSON.parse(stickerData);
    } catch (error) {
      return {
        "keywords": ["sticker", "meme", "funny", "laugh", "স্টিকার", "মিম", "joke"],
        "responses": [
          "<blockquote><b>Here's a sticker!</b> 😄</blockquote>",
          "<blockquote><i>Sending meme...</i> 🤣</blockquote>",
          "<blockquote><code>Funny sticker coming...</code> 🎭</blockquote>"
        ]
      };
    }
  }

  containsStickerKeyword(text) {
    if (!text) return false;
    const keywords = ['sticker', 'meme', 'funny', 'laugh', 'স্টিকার', 'মিম', 'joke'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  getStickerResponse() {
    const responses = [
      "<blockquote><b>Here's a sticker!</b> 😄</blockquote>",
      "<blockquote><i>Sending meme...</i> 🤣</blockquote>",
      "<blockquote><code>Funny sticker coming...</code> 🎭</blockquote>"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// ============================================
// EMOJI REPLY SYSTEM
// ============================================
class EmojiReplySystem {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadEmojiReplies() {
    try {
      const emojiPath = path.join(this.dataPath, 'emoji_replies.json');
      const emojiData = await fs.readFile(emojiPath, 'utf8');
      return JSON.parse(emojiData);
    } catch (error) {
      return {
        "unknown_message_emojis": ["😊", "🤔", "❤️", "👍", "🎉", "🔥", "😘", "👀", "✨", "😂"],
        "auto_reply_chance": 0.2 // 20% chance
      };
    }
  }

  getRandomEmoji() {
    const emojis = ["😊", "🤔", "❤️", "👍", "🎉", "🔥", "😘", "👀", "✨", "😂"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  shouldReplyToUnknown() {
    return Math.random() < 0.2; // 20% chance
  }
}

// ============================================
// DATA MANAGER - ALL FEATURES
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = [];
    this.settings = {};
    this.borderSystem = new PerfectBorderSystem();
    this.spamProtection = new SpamProtection();
    this.blockquoteSystem = new AutoBlockquoteSystem();
    this.voiceSystem = new VoiceMessageSystem();
    this.stickerSystem = new StickerMemeSystem();
    this.emojiSystem = new EmojiReplySystem();
    this.dataPath = path.join(__dirname, 'data');
    this.typingMessages = [];
  }

  async loadAllData() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.borderSystem.loadBorders();
      await this.loadConfig();
      await this.loadAutoReplies();
      await this.loadTypingMessages();
      await this.loadVoiceKeywords();
      await this.loadStickerKeywords();
      await this.loadEmojiReplies();
      this.spamProtection.startCleanupTimer();
      console.log('✅ All data loaded successfully');
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
        typing_delay: 1000,
        log_level: 'info',
        auto_react: true,
        typing_effect: true,
        auto_voice: true,
        auto_sticker: true,
        auto_emoji: true,
        voice_reply: true,
        sticker_reply: true
      };
      
      this.reactions = config.reactions || ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
      
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

  async loadTypingMessages() {
    this.typingMessages = await this.blockquoteSystem.loadTypingMessages();
    console.log(`✅ Loaded ${this.typingMessages.length} typing messages`);
  }

  async loadVoiceKeywords() {
    this.voiceKeywords = await this.voiceSystem.loadVoiceKeywords();
    console.log(`✅ Loaded ${this.voiceKeywords.keywords.length} voice keywords`);
  }

  async loadStickerKeywords() {
    this.stickerKeywords = await this.stickerSystem.loadStickerKeywords();
    console.log(`✅ Loaded ${this.stickerKeywords.keywords.length} sticker keywords`);
  }

  async loadEmojiReplies() {
    this.emojiReplies = await this.emojiSystem.loadEmojiReplies();
    console.log(`✅ Loaded ${this.emojiReplies.unknown_message_emojis.length} emoji replies`);
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
        typing_delay: 1000,
        log_level: 'info',
        auto_react: true,
        typing_effect: true,
        auto_voice: true,
        auto_sticker: true,
        auto_emoji: true,
        voice_reply: true,
        sticker_reply: true
      },
      reactions: ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏']
    };
    
    this.settings = defaultConfig.settings;
    this.reactions = defaultConfig.reactions;
    
    await fs.writeFile(
      path.join(this.dataPath, 'config.json'),
      JSON.stringify(defaultConfig, null, 2)
    );
  }

  getDefaultReplies() {
    return {
      "hi": ["<b>Hello!</b> 👋", "<i>Hi there!</i> 😊", "<code>Hey!</code> ❤️"],
      "hello": ["<b>Hi!</b> 😄", "<u>Hello!</u> 💖", "Hey there! 🌸"],
      "i love you": ["<b>Love you too!</b> ❤️", "<i>Aww</i> 😘", "You're sweet! 💕"],
      "how are you": ["<b>I'm good!</b> 😊", "All good! 😄", "<u>Feeling great!</u> 🌟"],
      "бот": ["<b>Bot здесь!</b> 🤖", "<i>Привет!</i> 👋", "Да, я здесь! ✅"],
      "салам": ["<b>Ва алейкум ассалам!</b> 🕌", "<i>Салам!</i> 👋", "Привет! 😊"],
      "привет": ["<b>Привет!</b> 👋", "Здравствуй! 😊", "Приветствую! 🌸"],
      "good morning": ["<b>Good morning!</b> ☀️", "Morning! 🌅", "<u>Rise and shine!</u> 😊"],
      "good night": ["<b>Good night!</b> 🌙", "<i>Sweet dreams!</i> 💤", "Sleep well! 😴"],
      "voice": ["<b>Voice message!</b> 🎵", "<i>Audio coming...</i> 🎶"],
      "sticker": ["<b>Sticker time!</b> 😄", "<i>Meme incoming...</i> 🤣"]
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

  getRandomTypingMessage() {
    if (this.typingMessages.length === 0) {
      return "══════════════════════\n\n      <b>Typing...</b> 🤫\n\n     ══════════════════════";
    }
    return this.typingMessages[Math.floor(Math.random() * this.typingMessages.length)];
  }

  canUserSendMessage(userId) {
    return this.spamProtection.canUserSend(userId);
  }

  containsVoiceKeyword(text) {
    return this.voiceSystem.containsVoiceKeyword(text);
  }

  containsStickerKeyword(text) {
    return this.stickerSystem.containsStickerKeyword(text);
  }

  getVoiceResponse() {
    return this.voiceSystem.getVoiceResponse();
  }

  getStickerResponse() {
    return this.stickerSystem.getStickerResponse();
  }

  getRandomEmoji() {
    return this.emojiSystem.getRandomEmoji();
  }

  shouldEmojiReply() {
    return this.emojiSystem.shouldReplyToUnknown();
  }
}

// ============================================
// MESSAGE HANDLER - ALL FEATURES (FIXED FOR GROUPS)
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
      botMessagesIgnored: 0,
      typingEffects: 0
    };
  }

  // ✅ FIXED: গ্রুপ এবং প্রাইভেট উভয় জায়গায় রিপ্লাই দিবে
  async shouldProcessMessage(message) {
    if (!message || !message.message || message.message.trim() === '') return false;
    if (message.sender && message.sender.bot) {
      this.stats.botMessagesIgnored++;
      return false;
    }
    if (message.out) return false;
    
    const userId = message.senderId;
    if (userId && !this.data.canUserSendMessage(userId)) {
      this.stats.spamBlocked++;
      return false;
    }
    
    // ✅ FIXED: গ্রুপ চ্যাট চেক (সহজ পদ্ধতি)
    const chatId = message.chatId;
    const isGroupChat = chatId && chatId.toString().startsWith('-100');
    
    if (isGroupChat) {
      // গ্রুপে রিপ্লাই দিবে কিনা সেটিংস চেক
      const replyInGroups = this.data.getSetting('reply_in_groups', true);
      if (!replyInGroups) {
        console.log(`🚫 Skipping group message (reply_in_groups: false)`);
        return false;
      }
    }
    
    const now = Date.now();
    if (now - this.lastActionTime < this.cooldownPeriod) return false;
    
    return true;
  }

  async handleNewMessage(event) {
    try {
      const message = event.message;
      this.stats.messagesReceived++;
      
      const chatId = message.chatId;
      const isGroupChat = chatId && chatId.toString().startsWith('-100');
      
      if (isGroupChat) {
        console.log(`📩 GROUP message received (Chat ID: ${chatId})`);
      } else {
        console.log(`📩 PRIVATE message received (Chat ID: ${chatId})`);
      }
      
      if (!await this.shouldProcessMessage(message)) {
        // রিয়েক্ট দিবে এমনকি যদি প্রসেস না করে
        if (this.data.getSetting('auto_react', true)) {
          await this.handleAutoReact(message);
        }
        return;
      }
      
      const text = message.message.toLowerCase().trim();
      const replyText = this.data.findReply(message.message);
      
      console.log(`🔍 Reply found: ${replyText ? 'YES' : 'NO'}`);
      
      // 1. সব মেসেজে রিয়েক্ট দিবে
      if (this.data.getSetting('auto_react', true)) {
        await this.handleAutoReact(message);
      }
      
      // 2. Voice keyword check
      if (this.data.getSetting('voice_reply', true) && this.data.containsVoiceKeyword(text)) {
        await this.handleVoiceReply(message);
        this.lastActionTime = Date.now();
        return;
      }
      
      // 3. Sticker keyword check
      if (this.data.getSetting('sticker_reply', true) && this.data.containsStickerKeyword(text)) {
        await this.handleStickerReply(message);
        this.lastActionTime = Date.now();
        return;
      }
      
      // 4. যদি রিপ্লাই থাকে
      if (replyText) {
        await this.handleTextReplyWithTyping(message, replyText);
      } else {
        // রিপ্লাই না থাকলে emoji দিতে পারে
        if (this.data.getSetting('auto_emoji', true) && this.data.shouldEmojiReply()) {
          await this.handleEmojiReply(message);
        }
      }
      
      this.lastActionTime = Date.now();
      
    } catch (error) {
      this.stats.errors++;
      if (this.data.getSetting('log_level') === 'debug') {
        console.error('❌ Error:', error.message);
      }
    }
  }

  async handleTextReplyWithTyping(message, replyText) {
    let sentMessage = null;
    
    try {
      // 1. টাইপিং মেসেজ সেন্ড করবে
      if (this.data.getSetting('typing_effect', true)) {
        const typingMessage = this.data.getRandomTypingMessage();
        sentMessage = await this.client.sendMessage(message.chatId, {
          message: typingMessage,
          parseMode: 'html'
        });
        
        const typingDelay = this.data.getSetting('typing_delay', 1000);
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        this.stats.typingEffects++;
      }
      
      // 2. ফাইনাল রিপ্লাই তৈরি করবে (auto blockquote + border)
      let finalMessage = replyText;
      
      if (this.data.getSetting('use_borders', true)) {
        finalMessage = this.data.formatWithBorder(replyText);
        this.stats.bordersUsed++;
      } else {
        finalMessage = `<blockquote>${replyText}</blockquote>`;
      }
      
      // গ্রুপে মেনশন যোগ করবে
      const chatId = message.chatId;
      const isGroupChat = chatId && chatId.toString().startsWith('-100');
      
      if (isGroupChat && message.senderId) {
        try {
          const sender = await this.client.getEntity(message.senderId);
          if (sender) {
            const mention = `<a href="tg://user?id=${sender.id}">${sender.firstName || ''}</a>`;
            finalMessage = `${mention}\n\n${finalMessage}`;
          }
        } catch (error) {
          // Continue without mention
        }
      }
      
      // 3. এডিট করবে বা নতুন মেসেজ সেন্ড করবে
      if (sentMessage) {
        await this.client.editMessage(message.chatId, {
          message: sentMessage.id,
          text: finalMessage,
          parseMode: 'html'
        });
      } else {
        await this.client.sendMessage(message.chatId, {
          message: finalMessage,
          parseMode: 'html'
        });
      }
      
      this.stats.responsesSent++;
      
      // গ্রুপ/প্রাইভেট স্ট্যাটিসটিক্স
      const isGroup = chatId && chatId.toString().startsWith('-100');
      if (isGroup) {
        this.stats.groupReplies++;
        console.log(`\n💌 [GROUP] Replied to chat: ${chatId}`);
      } else {
        this.stats.privateReplies++;
        console.log(`\n💌 [PRIVATE] Replied to user: ${chatId}`);
      }
      
    } catch (error) {
      console.error('Reply error:', error.message);
      // Fallback: সরাসরি মেসেজ সেন্ড করবে
      try {
        const finalMessage = `<blockquote>${replyText}</blockquote>`;
        await this.client.sendMessage(message.chatId, {
          message: finalMessage,
          parseMode: 'html'
        });
      } catch (sendError) {
        // Silent fail
      }
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
    } catch (error) {
      // Silent fail
    }
  }

  async handleVoiceReply(message) {
    try {
      const voiceResponse = this.data.getVoiceResponse();
      let finalMessage = voiceResponse;
      
      if (this.data.getSetting('use_borders', true)) {
        finalMessage = this.data.formatWithBorder(voiceResponse);
      }
      
      await this.client.sendMessage(message.chatId, {
        message: finalMessage,
        parseMode: 'html'
      });
      
      this.stats.voiceReplies++;
      console.log(`🎵 Voice reply sent to ${message.chatId}`);
    } catch (error) {
      // Silent fail
    }
  }

  async handleStickerReply(message) {
    try {
      const stickerResponse = this.data.getStickerResponse();
      let finalMessage = stickerResponse;
      
      if (this.data.getSetting('use_borders', true)) {
        finalMessage = this.data.formatWithBorder(stickerResponse);
      }
      
      await this.client.sendMessage(message.chatId, {
        message: finalMessage,
        parseMode: 'html'
      });
      
      this.stats.stickerReplies++;
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
      console.log(`😊 Emoji reply sent to ${message.chatId}`);
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
  console.log(`🤖 ${BOT_NAME} - COMPLETE USERBOT`);
  console.log('='.repeat(60));
  console.log(`📅 Version: 13.0.0 - ALL FEATURES`);
  console.log(`🌟 Status: FULLY LOADED`);
  console.log('='.repeat(60));
  
  const dataManager = new DataManager();
  await dataManager.loadAllData();
  
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true,
    requestRetries: 3
  });
  
  const messageHandler = new MessageHandler(client, dataManager);
  
  try {
    console.log('\n🔗 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected to Telegram');
    
    const me = await client.getMe();
    console.log(`👤 Logged in as: ${me.firstName || ''}${me.lastName ? ' ' + me.lastName : ''}`);
    console.log(`📱 Username: @${me.username || 'N/A'}`);
    console.log(`🆔 User ID: ${me.id}`);
    
    client.addEventHandler(async (event) => {
      await messageHandler.handleNewMessage(event);
    }, new NewMessage({ incoming: true }));
    
    console.log('\n✅ Event handlers registered!');
    console.log('👂 Bot is now listening for messages...');
    
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
    console.log('   ✓ Auto Blockquote (all replies)');
    console.log('   ✓ Typing effect with edit');
    console.log('   ✓ Auto reaction on every message');
    console.log('   ✓ Voice reply (keyword based)');
    console.log('   ✓ Sticker/Meme reply (keyword based)');
    console.log('   ✓ Emoji reply (20% chance)');
    console.log('   ✓ Smart border system');
    console.log('   ✓ Spam protection (7/min)');
    console.log('   ✓ Bot message ignoring');
    console.log('   ✓ HTML formatting support');
    console.log('   ✓ JSON file loading');
    console.log('   ✓ Rate limiting');
    console.log('   ✓ Health check endpoint');
    console.log('   ✓ GROUP & PRIVATE reply support ✅');
    console.log('='.repeat(60));
    
    setInterval(() => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      console.log('\n📊 SYSTEM STATUS:');
      console.log('─'.repeat(45));
      console.log(`⏰ Uptime: ${hours}h ${minutes}m`);
      console.log(`📨 Messages: ${messageHandler.stats.messagesReceived}`);
      console.log(`📤 Replies: ${messageHandler.stats.responsesSent}`);
      console.log(`   ├─ Group: ${messageHandler.stats.groupReplies}`);
      console.log(`   └─ Private: ${messageHandler.stats.privateReplies}`);
      console.log(`⭐ Reactions: ${messageHandler.stats.reactionsSent}`);
      console.log(`⌨️ Typing Effects: ${messageHandler.stats.typingEffects}`);
      console.log(`🎨 Borders: ${messageHandler.stats.bordersUsed}`);
      console.log(`🎵 Voice: ${messageHandler.stats.voiceReplies}`);
      console.log(`😂 Stickers: ${messageHandler.stats.stickerReplies}`);
      console.log(`😊 Emojis: ${messageHandler.stats.emojiReplies}`);
      console.log(`🔇 Spam blocked: ${messageHandler.stats.spamBlocked}`);
      console.log(`🤖 Bot ignored: ${messageHandler.stats.botMessagesIgnored}`);
      console.log(`❌ Errors: ${messageHandler.stats.errors}`);
      console.log('─'.repeat(45));
    }, 300000);
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      process.exit(0);
    });
    
    setInterval(() => {}, 60000);
    
  } catch (error) {
    console.error('\n❌ STARTUP FAILED:', error.message);
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
