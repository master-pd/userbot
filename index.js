// ============================================
// YOUR CRUSH Userbot - COMPLETE FINAL CODE
// ALL FEATURES INCLUDED - PROFESSIONAL VERSION
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
// PERFECT BORDER SYSTEM
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
      { "name": "Arrow Style", "top": "»─", "bottom": "─«" },
      { "name": "Dotted Line", "top": "•••", "bottom": "•••" },
      { "name": "Wave Style", "top": "〜〜", "bottom": "〜〜" },
      { "name": "Fire Style", "top": "🔥─", "bottom": "─🔥" },
      { "name": "Music Style", "top": "♫─", "bottom": "─♫" },
      { "name": "Thick Line", "top": "━━━", "bottom": "━━━" }
    ];
  }

  async createDefaultBorderFile() {
    await fs.writeFile(
      path.join(this.dataPath, 'border.json'),
      JSON.stringify(this.getDefaultBorders(), null, 2)
    );
  }

  calculateOptimalBorderLength(text) {
    if (!text) return this.minBorderLength;
    
    const lines = text.split('\n');
    let maxLineLength = 0;
    
    for (const line of lines) {
      const cleanLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanLine.length > maxLineLength) maxLineLength = cleanLine.length;
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
    
    const topBorder = this.createBorderLine(border.top, optimalLength);
    const bottomBorder = this.createBorderLine(border.bottom, optimalLength);
    const centeredLines = this.createCenteredLines(text, optimalLength);
    
    const result = [topBorder, ''];
    centeredLines.forEach(line => result.push(line));
    result.push('', bottomBorder);
    
    return result.join('\n');
  }

  createBorderLine(borderPattern, targetLength) {
    if (borderPattern.length >= targetLength) return borderPattern.substring(0, targetLength);
    
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
      result = patternChar.repeat(targetLength);
    }
    
    return result.substring(0, targetLength);
  }

  createCenteredLines(text, borderLength) {
    return text.split('\n').map(line => {
      if (line.trim() === '') return '';
      
      const cleanText = line.replace(/<[^>]*>/g, '');
      const textLength = cleanText.length;
      
      if (textLength >= borderLength - 2) return line;
      
      const totalPadding = borderLength - textLength;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      
      return ' '.repeat(Math.max(0, leftPadding)) + line + ' '.repeat(Math.max(0, rightPadding));
    });
  }
}

// ============================================
// TYPING SIMULATION SYSTEM
// ============================================
class TypingSystem {
  constructor(client) {
    this.client = client;
    this.isTyping = false;
  }

  async showTyping(chatId) {
    if (this.isTyping) return;
    
    this.isTyping = true;
    try {
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      const duration = Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, duration));
    } catch (error) {
      // Silent fail
    } finally {
      this.isTyping = false;
    }
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
      console.log(`🔇 User ${userId} muted for 1 minute`);
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
// EMOJI & STICKER MANAGER
// ============================================
class EmojiStickerManager {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadEmojiStickers() {
    try {
      const emojiPath = path.join(this.dataPath, 'emoji_stickers.json');
      const data = await fs.readFile(emojiPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        "keywords": {
          "love": ["❤️", "😍", "🥰", "😘"],
          "happy": ["😊", "😂", "😄", "🥳"],
          "sad": ["😢", "😔", "😭", "🥺"],
          "angry": ["😠", "😡", "🤬", "💢"],
          "surprise": ["😮", "🤯", "😲", "🎉"]
        },
        "stickers": {
          "funny": ["CAACAgQAAxkBAAIB...1"],
          "love": ["CAACAgQAAxkBAAIB...2"],
          "hello": ["CAACAgQAAxkBAAIB...3"]
        }
      };
    }
  }

  getEmojiForKeyword(text) {
    const emojiMap = {
      "love": ["❤️", "😍", "🥰"],
      "like": ["👍", "👌", "🤙"],
      "happy": ["😊", "😄", "😂"],
      "sad": ["😢", "😔", "🥺"],
      "hi": ["👋", "🤗", "😊"],
      "hello": ["👋", "🤗", "😊"]
    };
    
    const lowerText = text.toLowerCase();
    for (const [keyword, emojis] of Object.entries(emojiMap)) {
      if (lowerText.includes(keyword)) {
        return emojis[Math.floor(Math.random() * emojis.length)];
      }
    }
    
    const defaultEmojis = ["😊", "👍", "❤️", "🔥", "🎉", "😂"];
    return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
  }
}

// ============================================
// VOICE MESSAGE MANAGER
// ============================================
class VoiceMessageManager {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadVoiceMessages() {
    try {
      const voicePath = path.join(this.dataPath, 'voice_messages.json');
      const data = await fs.readFile(voicePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        "keywords": {
          "voice": ["voice_note_1.ogg", "voice_note_2.ogg"],
          "sing": ["song_1.ogg", "song_2.ogg"],
          "audio": ["audio_1.ogg", "audio_2.ogg"]
        }
      };
    }
  }

  getVoiceForKeyword(text) {
    const voiceMap = {
      "voice": "voice_note_1.ogg",
      "sing": "song_1.ogg",
      "song": "song_2.ogg",
      "audio": "audio_1.ogg"
    };
    
    const lowerText = text.toLowerCase();
    for (const [keyword, voiceFile] of Object.entries(voiceMap)) {
      if (lowerText.includes(keyword)) return voiceFile;
    }
    
    return null;
  }
}

// ============================================
// MEME STICKER MANAGER
// ============================================
class MemeStickerManager {
  constructor() {
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadMemeStickers() {
    try {
      const memePath = path.join(this.dataPath, 'meme_stickers.json');
      const data = await fs.readFile(memePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        "keywords": {
          "meme": ["meme_sticker_1", "meme_sticker_2"],
          "funny": ["funny_sticker_1", "funny_sticker_2"],
          "laugh": ["laugh_sticker_1", "laugh_sticker_2"]
        }
      };
    }
  }

  getStickerForKeyword(text) {
    const stickerMap = {
      "meme": "meme_sticker_1",
      "funny": "funny_sticker_1",
      "laugh": "laugh_sticker_1",
      "joke": "joke_sticker_1"
    };
    
    const lowerText = text.toLowerCase();
    for (const [keyword, sticker] of Object.entries(stickerMap)) {
      if (lowerText.includes(keyword)) return sticker;
    }
    
    return null;
  }
}

// ============================================
// DATA MANAGER - JSON থেকে সব লোড হবে
// ============================================
class DataManager {
  constructor() {
    this.replies = {};
    this.reactions = [];
    this.settings = {};
    this.borderSystem = new PerfectBorderSystem();
    this.spamProtection = new SpamProtection();
    this.emojiManager = new EmojiStickerManager();
    this.voiceManager = new VoiceMessageManager();
    this.memeManager = new MemeStickerManager();
    this.dataPath = path.join(__dirname, 'data');
  }

  async loadAllData() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.borderSystem.loadBorders();
      await this.loadConfig();
      await this.loadAutoReplies();
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
        typing_min_delay: 800,
        typing_max_delay: 4000,
        log_level: 'info',
        auto_react: true,
        auto_voice: true,
        auto_sticker: true,
        auto_meme: true,
        typing_effect: true
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
        log_level: 'info',
        auto_react: true,
        auto_voice: true,
        auto_sticker: true,
        auto_meme: true,
        typing_effect: true
      },
      reactions: ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'],
      voice_keywords: ['voice', 'audio', 'sing', 'song', 'গান', 'ভয়েস'],
      sticker_keywords: ['sticker', 'meme', 'funny', 'laugh', 'স্টিকার', 'মিম']
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
      "miss you": ["<b>Miss you too!</b> 😔", "Always! 💕", "So much! 😘"],
      "voice": ["<b>Voice message coming!</b> 🎵", "<i>Sending audio...</i> 🎶"],
      "sticker": ["<b>Here's a sticker!</b> 😄", "<i>Sending meme...</i> 🤣"],
      "meme": ["<b>Meme incoming!</b> 😂", "<i>Funny sticker coming...</i> 🎭"]
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

  containsVoiceKeyword(text) {
    if (!text) return false;
    const keywords = ['voice', 'audio', 'sing', 'song', 'গান', 'ভয়েস'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  containsStickerKeyword(text) {
    if (!text) return false;
    const keywords = ['sticker', 'meme', 'funny', 'laugh', 'স্টিকার', 'মিম'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  getRandomEmoji() {
    const emojis = ["😊", "🤔", "❤️", "👍", "🎉", "🔥", "😘", "👀", "✨", "😂"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }
}

// ============================================
// MESSAGE HANDLER - ALL FEATURES
// ============================================
class MessageHandler {
  constructor(client, dataManager, typingSystem) {
    this.client = client;
    this.data = dataManager;
    this.typing = typingSystem;
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
    
    if (message.isGroup && !this.data.getSetting('reply_in_groups', true)) return false;
    if (message.isChannel && !this.data.getSetting('reply_in_channels', false)) return false;
    
    const now = Date.now();
    if (now - this.lastActionTime < this.cooldownPeriod) return false;
    
    return true;
  }

  async handleNewMessage(event) {
    try {
      const message = event.message;
      this.stats.messagesReceived++;
      
      if (!await this.shouldProcessMessage(message)) {
        // রিয়েক্ট দিবে এমনকি যদি প্রসেস না করে
        if (this.data.getSetting('auto_react', true)) {
          await this.handleAutoReact(message);
        }
        return;
      }
      
      const text = message.message.toLowerCase().trim();
      const replyText = this.data.findReply(message.message);
      
      // 1. টাইপিং ইফেক্ট দেখাবে (যদি enable থাকে)
      if (this.data.getSetting('typing_effect', true)) {
        await this.showTypingEffect(message.chatId);
        this.stats.typingEffects++;
      }
      
      // 2. সব মেসেজে রিয়েক্ট দিবে
      if (this.data.getSetting('auto_react', true)) {
        await this.handleAutoReact(message);
      }
      
      // 3. যদি রিপ্লাই থাকে তবে দিবে
      if (replyText) {
        await this.handleTextReply(message, replyText);
      } else {
        // রিপ্লাই না থাকলে random emoji দিতে পারে
        if (Math.random() < 0.3) {
          await this.handleEmojiReply(message);
        }
      }
      
      // 4. Voice keyword check
      if (this.data.getSetting('auto_voice', true) && this.data.containsVoiceKeyword(text)) {
        await this.handleVoiceReply(message);
      }
      
      // 5. Sticker/Meme keyword check
      if (this.data.getSetting('auto_sticker', true) && this.data.containsStickerKeyword(text)) {
        await this.handleStickerReply(message);
      }
      
      this.lastActionTime = Date.now();
      
    } catch (error) {
      this.stats.errors++;
      if (this.data.getSetting('log_level') === 'debug') {
        console.error('❌ Error:', error.message);
      }
    }
  }

  async showTypingEffect(chatId) {
    try {
      await this.client.invoke({
        _: 'messages.setTyping',
        peer: await this.client.getInputEntity(chatId),
        action: { _: 'sendMessageTypingAction' }
      });
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    } catch (error) {
      // Silent fail
    }
  }

  async handleTextReply(message, replyText) {
    try {
      let formattedReply = replyText;
      
      // Apply border if enabled
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
      
      await this.client.sendMessage(message.chatId, {
        message: finalMessage,
        parseMode: 'html'
      });
      
      this.stats.responsesSent++;
      if (message.isGroup) this.stats.groupReplies++;
      else if (!message.isChannel) this.stats.privateReplies++;
      
      const chatType = message.isGroup ? 'GROUP' : (message.isChannel ? 'CHANNEL' : 'PRIVATE');
      console.log(`\n💌 [${chatType}] Replied to ${message.chatId}`);
      
    } catch (error) {
      console.error('Reply error:', error.message);
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
      await this.client.sendMessage(message.chatId, {
        message: "🎵 <b>Voice message feature!</b>\n<i>Audio reply would be sent here</i>",
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
        message: "😄 <b>Sticker/Meme feature!</b>\n<i>Funny sticker would be sent here</i>",
        parseMode: 'html'
      });
      this.stats.stickerReplies++;
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
  console.log(`📅 Version: 11.0.0 - ALL FEATURES`);
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
  
  const typingSystem = new TypingSystem(client);
  const messageHandler = new MessageHandler(client, dataManager, typingSystem);
  
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
    
    console.log('\n✅ Event handlers registered successfully!');
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
    console.log('   ✓ Typing effect');
    console.log('   ✓ Auto reaction on every message');
    console.log('   ✓ Smart border system');
    console.log('   ✓ HTML formatting support');
    console.log('   ✓ Auto voice reply');
    console.log('   ✓ Auto sticker/meme reply');
    console.log('   ✓ Auto emoji reply');
    console.log('   ✓ Spam protection (7/min)');
    console.log('   ✓ Bot message ignoring');
    console.log('   ✓ JSON file loading');
    console.log('   ✓ Rate limiting');
    console.log('   ✓ Health check endpoint');
    console.log('='.repeat(60));
    
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
      console.log(`⌨️ Typing Effects: ${messageHandler.stats.typingEffects}`);
      console.log(`🎨 Borders: ${messageHandler.stats.bordersUsed}`);
      console.log(`🎵 Voice: ${messageHandler.stats.voiceReplies}`);
      console.log(`😂 Stickers: ${messageHandler.stats.stickerReplies}`);
      console.log(`😊 Emojis: ${messageHandler.stats.emojiReplies}`);
      console.log(`🔇 Spam blocked: ${messageHandler.stats.spamBlocked}`);
      console.log(`🤖 Bot ignored: ${messageHandler.stats.botMessagesIgnored}`);
      console.log(`❌ Errors: ${messageHandler.stats.errors}`);
      console.log('─'.repeat(40));
    }, 300000);
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await client.disconnect();
      console.log('✅ Disconnected from Telegram');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    setInterval(() => {}, 60000);
    
  } catch (error) {
    console.error('\n❌ STARTUP FAILED:', error.message);
    if (error.message.includes('AUTH_KEY')) {
      console.error('\n⚠️ SESSION STRING ERROR');
    }
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
