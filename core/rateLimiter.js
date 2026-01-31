// core/rateLimiter.js
class RateLimiter {
  constructor(maxPerMinute = 50) {
    this.maxPerMinute = parseInt(maxPerMinute);
    this.windowMs = 60000; // 1 minute
    this.actionTimestamps = [];
    this.blockedUntil = 0;
    this.stats = {
      totalActions: 0,
      blockedActions: 0,
      windows: 0,
      maxActionsInWindow: 0
    };
    
    // Safety limits
    this.absoluteMaxPerMinute = 100; // Hard limit
    this.cooldownMultiplier = 1.5; // Exponential backoff
    
    if (this.maxPerMinute > this.absoluteMaxPerMinute) {
      console.warn(`⚠️ Rate limit ${this.maxPerMinute} exceeds safe maximum, capping at ${this.absoluteMaxPerMinute}`);
      this.maxPerMinute = this.absoluteMaxPerMinute;
    }
    
    console.log(`⚙️ Rate limiter initialized: ${this.maxPerMinute} actions/minute`);
  }

  canPerformAction() {
    const now = Date.now();
    
    // Check if blocked
    if (now < this.blockedUntil) {
      const remaining = Math.ceil((this.blockedUntil - now) / 1000);
      if (Math.random() < 0.01) { // Log only 1% of blocks to avoid spam
        console.log(`⏳ Rate limited, blocked for ${remaining}s`);
      }
      this.stats.blockedActions++;
      return false;
    }
    
    // Clean old timestamps
    const cutoff = now - this.windowMs;
    this.actionTimestamps = this.actionTimestamps.filter(t => t > cutoff);
    
    // Check current window
    if (this.actionTimestamps.length >= this.maxPerMinute) {
      // Calculate block time with exponential backoff
      const oldest = this.actionTimestamps[0];
      const timeInWindow = now - oldest;
      const baseWait = this.windowMs - timeInWindow;
      const blockTime = Math.min(baseWait * this.cooldownMultiplier, 300000); // Max 5 minutes
      
      this.blockedUntil = now + blockTime;
      this.stats.blockedActions++;
      
      console.log(`🚫 Rate limit exceeded! Blocked for ${Math.ceil(blockTime/1000)}s`);
      console.log(`   Actions in window: ${this.actionTimestamps.length}/${this.maxPerMinute}`);
      
      // Track max actions
      if (this.actionTimestamps.length > this.stats.maxActionsInWindow) {
        this.stats.maxActionsInWindow = this.actionTimestamps.length;
      }
      
      return false;
    }
    
    // Allow action
    this.actionTimestamps.push(now);
    this.stats.totalActions++;
    
    // Track windows
    if (this.actionTimestamps.length === 1) {
      this.stats.windows++;
    }
    
    return true;
  }

  getWaitTime() {
    const now = Date.now();
    
    // If blocked, return block time
    if (now < this.blockedUntil) {
      return this.blockedUntil - now;
    }
    
    // Clean old timestamps
    const cutoff = now - this.windowMs;
    this.actionTimestamps = this.actionTimestamps.filter(t => t > cutoff);
    
    // If at limit, calculate wait time
    if (this.actionTimestamps.length >= this.maxPerMinute) {
      const oldest = this.actionTimestamps[0];
      return this.windowMs - (now - oldest);
    }
    
    return 0;
  }

  getRemainingActions() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    this.actionTimestamps = this.actionTimestamps.filter(t => t > cutoff);
    
    const remaining = this.maxPerMinute - this.actionTimestamps.length;
    return Math.max(0, remaining);
  }

  getCurrentWindowStats() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    this.actionTimestamps = this.actionTimestamps.filter(t => t > cutoff);
    
    const windowStart = this.actionTimestamps.length > 0 
      ? this.actionTimestamps[0] 
      : now;
    
    const windowEnd = windowStart + this.windowMs;
    const timeRemaining = Math.max(0, windowEnd - now);
    
    return {
      actionsInWindow: this.actionTimestamps.length,
      maxPerWindow: this.maxPerMinute,
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(windowEnd).toISOString(),
      timeRemainingSeconds: Math.ceil(timeRemaining / 1000),
      blockedUntil: this.blockedUntil > now ? new Date(this.blockedUntil).toISOString() : null,
      blockedSeconds: this.blockedUntil > now ? Math.ceil((this.blockedUntil - now) / 1000) : 0
    };
  }

  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    const actionsLastMinute = this.actionTimestamps.filter(t => t >= oneMinuteAgo).length;
    const actionsLastFiveMinutes = this.actionTimestamps.filter(t => t >= fiveMinutesAgo).length;
    
    return {
      ...this.stats,
      currentWindow: this.getCurrentWindowStats(),
      recentActivity: {
        lastMinute: actionsLastMinute,
        lastFiveMinutes: actionsLastFiveMinutes,
        perMinuteAverage: actionsLastFiveMinutes / 5
      },
      configuration: {
        maxPerMinute: this.maxPerMinute,
        windowMs: this.windowMs,
        absoluteMax: this.absoluteMaxPerMinute,
        cooldownMultiplier: this.cooldownMultiplier
      }
    };
  }

  reset() {
    this.actionTimestamps = [];
    this.blockedUntil = 0;
    console.log('🔄 Rate limiter reset');
    return true;
  }

  updateLimit(newLimit) {
    const parsed = parseInt(newLimit);
    
    if (isNaN(parsed) || parsed < 1) {
      console.error('Invalid rate limit value:', newLimit);
      return false;
    }
    
    if (parsed > this.absoluteMaxPerMinute) {
      console.warn(`Requested limit ${parsed} exceeds safe maximum ${this.absoluteMaxPerMinute}`);
      return false;
    }
    
    const oldLimit = this.maxPerMinute;
    this.maxPerMinute = parsed;
    
    console.log(`⚙️ Updated rate limit: ${oldLimit} → ${this.maxPerMinute} actions/minute`);
    return true;
  }

  forceAllow() {
    // Emergency override - use with caution
    if (this.blockedUntil > 0) {
      console.warn('⚠️ Force allowing action despite block');
      this.blockedUntil = 0;
    }
    
    this.actionTimestamps = this.actionTimestamps.slice(-Math.floor(this.maxPerMinute * 0.5));
    return true;
  }
}

module.exports = RateLimiter;
