// core/dataManager.js
const fs = require('fs').promises;
const path = require('path');

class DataManager {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data');
    this.replies = {};
    this.reactions = ['👍', '❤️', '🔥', '😂'];
    this.voices = [];
    this.videos = [];
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
    this.stats = {
      loads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      replyMatches: 0,
      replyMisses: 0
    };
  }

  async loadAllData() {
    try {
      console.log('📂 Loading data files...');
      
      // Ensure data directory exists
      try {
        await fs.access(this.dataPath);
      } catch {
        await fs.mkdir(this.dataPath, { recursive: true });
        console.log('Created data directory');
      }
      
      // Load replies
      await this.loadReplies();
      
      // Load reactions
      await this.loadReactions();
      
      // Load voices
      await this.loadVoices();
      
      // Load videos
      await this.loadVideos();
      
      this.stats.loads++;
      console.log('✅ All data loaded successfully');
      console.log(`   Replies: ${Object.keys(this.replies).length} patterns`);
      console.log(`   Reactions: ${this.reactions.length} emojis`);
      console.log(`   Voices: ${this.voices.length} files`);
      console.log(`   Videos: ${this.videos.length} links`);
      
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      this.initializeDefaultData();
    }
  }

  async loadReplies() {
    try {
      const filePath = path.join(this.dataPath, 'reply.json');
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (typeof parsed !== 'object') {
        throw new Error('Invalid reply.json format');
      }
      
      this.replies = parsed;
      console.log(`📝 Loaded ${Object.keys(this.replies).length} reply patterns`);
      
    } catch (error) {
      console.error('Failed to load reply.json:', error.message);
      this.replies = this.getDefaultReplies();
    }
  }

  async loadReactions() {
    try {
      const filePath = path.join(this.dataPath, 'reaction.json');
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.reactions && Array.isArray(parsed.reactions)) {
        this.reactions = parsed.reactions;
        console.log(`🎭 Loaded ${this.reactions.length} reactions`);
      } else {
        throw new Error('Invalid reaction.json format');
      }
      
    } catch (error) {
      console.warn('Using default reactions:', error.message);
      this.reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '🤔', '👏'];
    }
  }

  async loadVoices() {
    try {
      const filePath = path.join(this.dataPath, 'voice.json');
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.voices && Array.isArray(parsed.voices)) {
        this.voices = parsed.voices;
        console.log(`🎵 Loaded ${this.voices.length} voice configurations`);
      }
      
    } catch (error) {
      console.warn('No voice configuration loaded:', error.message);
      this.voices = [];
    }
  }

  async loadVideos() {
    try {
      const filePath = path.join(this.dataPath, 'video.json');
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.videos && Array.isArray(parsed.videos)) {
        this.videos = parsed.videos;
        console.log(`🎬 Loaded ${this.videos.length} video configurations`);
      }
      
    } catch (error) {
      console.warn('No video configuration loaded:', error.message);
      this.videos = [];
    }
  }

  initializeDefaultData() {
    console.log('⚠️ Initializing with default data');
    
    this.replies = this.getDefaultReplies();
    this.reactions = ['👍', '❤️', '🔥', '😂'];
    this.voices = [];
    this.videos = [];
  }

  getDefaultReplies() {
    return {
      "hi": ["Hello!", "Hi there!", "Hey!", "Hi! 👋"],
      "hello": ["Hi!", "Hello!", "Hey there!", "Hello! 😄"],
      "test": ["Test successful! ✅", "Working! 👍", "All systems go! 🚀"],
      "how are you": ["I'm good, thanks! 😊", "Doing well! How about you?"],
      "good morning": ["Good morning! 🌞", "Morning! Have a great day! 😊"],
      "good night": ["Good night! 🌙", "Sweet dreams! 💭"],
      "thanks": ["You're welcome! 😊", "Anytime! 👍"],
      "love you": ["❤️", "Aww! 😊", "You're sweet! ❤️"],
      "miss you": ["Miss you too! ❤️", "Aww! 😊", "❤️"],
      "bye": ["Bye! 👋", "Goodbye! 😊", "See you! 👋"]
    };
  }

  findReply(message) {
    if (!message || typeof message !== 'string') {
      this.stats.replyMisses++;
      return null;
    }
    
    const msg = message.toLowerCase().trim();
    
    // Check cache first
    const cacheKey = `reply:${msg}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.stats.cacheHits++;
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    
    // Strategy 1: Exact match
    if (this.replies[msg]) {
      const replies = this.replies[msg];
      const response = replies[Math.floor(Math.random() * replies.length)];
      
      // Cache the result
      this.cache.set(cacheKey, {
        value: response,
        timestamp: Date.now()
      });
      
      this.stats.replyMatches++;
      return response;
    }
    
    // Strategy 2: Word-by-word match
    const words = msg.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && this.replies[word]) {
        const replies = this.replies[word];
        const response = replies[Math.floor(Math.random() * replies.length)];
        
        this.cache.set(cacheKey, {
          value: response,
          timestamp: Date.now()
        });
        
        this.stats.replyMatches++;
        return response;
      }
    }
    
    // Strategy 3: Try without special characters
    const cleanMsg = msg.replace(/[^\w\s]/g, '');
    if (cleanMsg !== msg && this.replies[cleanMsg]) {
      const replies = this.replies[cleanMsg];
      const response = replies[Math.floor(Math.random() * replies.length)];
      
      this.cache.set(cacheKey, {
        value: response,
        timestamp: Date.now()
      });
      
      this.stats.replyMatches++;
      return response;
    }
    
    // No match found
    this.stats.replyMisses++;
    this.cache.set(cacheKey, {
      value: null,
      timestamp: Date.now()
    });
    
    return null;
  }

  getRandomReaction() {
    if (this.reactions.length === 0) {
      return '👍';
    }
    
    // Weight common reactions more
    const commonReactions = this.reactions.slice(0, Math.min(10, this.reactions.length));
    const allReactions = this.reactions;
    
    // 70% chance for common reactions, 30% for all reactions
    const pool = Math.random() < 0.7 ? commonReactions : allReactions;
    
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getRandomVoice() {
    if (this.voices.length === 0) {
      return null;
    }
    
    return this.voices[Math.floor(Math.random() * this.voices.length)];
  }

  getRandomVideo() {
    if (this.videos.length === 0) {
      return null;
    }
    
    return this.videos[Math.floor(Math.random() * this.videos.length)];
  }

  addReply(keyword, responses) {
    if (!this.replies[keyword]) {
      this.replies[keyword] = [];
    }
    
    if (Array.isArray(responses)) {
      this.replies[keyword].push(...responses);
    } else {
      this.replies[keyword].push(responses);
    }
    
    // Clear cache for this keyword
    const cacheKey = `reply:${keyword.toLowerCase()}`;
    this.cache.delete(cacheKey);
    
    console.log(`➕ Added ${Array.isArray(responses) ? responses.length : 1} response(s) for "${keyword}"`);
    return true;
  }

  removeReply(keyword, responseToRemove = null) {
    if (!this.replies[keyword]) {
      return false;
    }
    
    if (responseToRemove === null) {
      // Remove entire keyword
      delete this.replies[keyword];
      console.log(`➖ Removed keyword "${keyword}"`);
    } else {
      // Remove specific response
      const index = this.replies[keyword].indexOf(responseToRemove);
      if (index > -1) {
        this.replies[keyword].splice(index, 1);
        console.log(`➖ Removed response from "${keyword}": "${responseToRemove}"`);
      }
      
      // If no responses left, remove keyword
      if (this.replies[keyword].length === 0) {
        delete this.replies[keyword];
      }
    }
    
    // Clear cache
    const cacheKey = `reply:${keyword.toLowerCase()}`;
    this.cache.delete(cacheKey);
    
    return true;
  }

  addReaction(emoji) {
    if (!this.reactions.includes(emoji)) {
      this.reactions.push(emoji);
      console.log(`➕ Added reaction: ${emoji}`);
      return true;
    }
    return false;
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cleared cache (${size} entries)`);
    return size;
  }

  getStats() {
    const cacheHitRate = this.stats.cacheHits + this.stats.cacheMisses > 0
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1)
      : 0;
    
    const replyHitRate = this.stats.replyMatches + this.stats.replyMisses > 0
      ? (this.stats.replyMatches / (this.stats.replyMatches + this.stats.replyMisses) * 100).toFixed(1)
      : 0;
    
    return {
      ...this.stats,
      cache: {
        size: this.cache.size,
        hitRate: `${cacheHitRate}%`,
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses
      },
      data: {
        replyPatterns: Object.keys(this.replies).length,
        totalResponses: Object.values(this.replies).reduce((sum, arr) => sum + arr.length, 0),
        reactions: this.reactions.length,
        voices: this.voices.length,
        videos: this.videos.length
      },
      performance: {
        replyHitRate: `${replyHitRate}%`,
        matches: this.stats.replyMatches,
        misses: this.stats.replyMisses
      }
    };
  }

  async saveReplies() {
    try {
      const filePath = path.join(this.dataPath, 'reply.json');
      const data = JSON.stringify(this.replies, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
      console.log(`💾 Saved ${Object.keys(this.replies).length} reply patterns`);
      return true;
    } catch (error) {
      console.error('Failed to save replies:', error.message);
      return false;
    }
  }

  async saveReactions() {
    try {
      const filePath = path.join(this.dataPath, 'reaction.json');
      const data = JSON.stringify({ reactions: this.reactions }, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
      console.log(`💾 Saved ${this.reactions.length} reactions`);
      return true;
    } catch (error) {
      console.error('Failed to save reactions:', error.message);
      return false;
    }
  }
}

module.exports = DataManager;
