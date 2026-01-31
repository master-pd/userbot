// utils/healthMonitor.js
const os = require('os');
const logger = require('./logger');

class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      uptime: 0,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: 0,
        percentage: 0
      },
      cpu: {
        count: os.cpus().length,
        load: []
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release()
      },
      process: {
        pid: process.pid,
        version: process.version,
        uptime: 0
      }
    };
    
    this.checks = [];
    this.lastCheckTime = 0;
    this.checkInterval = 60000; // 1 minute
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 30000);
    
    // Run health checks every minute
    setInterval(() => {
      this.runHealthChecks();
    }, this.checkInterval);
    
    logger.info('Health monitor started');
  }

  updateMetrics() {
    const now = Date.now();
    
    this.metrics.uptime = now - this.startTime;
    this.metrics.process.uptime = process.uptime();
    
    // Memory usage
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;
    
    this.metrics.memory.free = freeMem;
    this.metrics.memory.used = usedMem;
    this.metrics.memory.percentage = Math.round(memPercentage * 100) / 100;
    
    // CPU load (1, 5, 15 minutes)
    const load = os.loadavg();
    this.metrics.cpu.load = load.map(l => Math.round(l * 100) / 100);
    
    // Log high memory usage
    if (memPercentage > 80 && Math.random() < 0.1) {
      logger.warn(`High memory usage: ${memPercentage.toFixed(1)}%`);
    }
    
    // Log high CPU load
    if (load[0] > this.metrics.cpu.count * 0.8 && Math.random() < 0.1) {
      logger.warn(`High CPU load: ${load[0].toFixed(2)}`);
    }
  }

  addHealthCheck(name, checkFunction, interval = this.checkInterval) {
    this.checks.push({
      name,
      checkFunction,
      interval,
      lastRun: 0,
      status: 'unknown',
      lastResult: null
    });
    
    logger.info(`Added health check: ${name}`);
  }

  async runHealthChecks() {
    const now = Date.now();
    this.lastCheckTime = now;
    
    logger.debug('Running health checks');
    
    for (const check of this.checks) {
      if (now - check.lastRun >= check.interval) {
        try {
          const result = await check.checkFunction();
          check.status = 'healthy';
          check.lastResult = result;
          check.lastRun = now;
          
          logger.debug(`Health check passed: ${check.name}`);
        } catch (error) {
          check.status = 'unhealthy';
          check.lastResult = error.message;
          check.lastRun = now;
          
          logger.error(`Health check failed: ${check.name}`, { error: error.message });
        }
      }
    }
  }

  getHealthStatus() {
    const unhealthyChecks = this.checks.filter(c => c.status === 'unhealthy');
    const healthyChecks = this.checks.filter(c => c.status === 'healthy');
    
    const status = {
      overall: unhealthyChecks.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      checks: {
        total: this.checks.length,
        healthy: healthyChecks.length,
        unhealthy: unhealthyChecks.length,
        details: this.checks.map(c => ({
          name: c.name,
          status: c.status,
          lastRun: new Date(c.lastRun).toISOString(),
          lastResult: c.lastResult
        }))
      }
    };
    
    // Calculate health score (0-100)
    const healthScore = this.checks.length > 0
      ? Math.round((healthyChecks.length / this.checks.length) * 100)
      : 100;
    
    status.healthScore = healthScore;
    
    return status;
  }

  getMetrics() {
    return {
      ...this.metrics,
      formatted: {
        uptime: this.formatUptime(this.metrics.uptime),
        memory: {
          used: this.formatBytes(this.metrics.memory.used),
          free: this.formatBytes(this.metrics.memory.free),
          total: this.formatBytes(this.metrics.memory.total),
          percentage: `${this.metrics.memory.percentage}%`
        },
        cpu: {
          count: this.metrics.cpu.count,
          load: this.metrics.cpu.load.join(', '),
          loadPerCore: this.metrics.cpu.load.map(l => (l / this.metrics.cpu.count).toFixed(2))
        }
      }
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getPerformanceReport() {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    return {
      summary: {
        status: health.overall,
        healthScore: health.healthScore,
        uptime: metrics.formatted.uptime,
        memoryUsage: metrics.formatted.memory.percentage,
        cpuLoad: metrics.formatted.cpu.load
      },
      details: {
        metrics: metrics,
        health: health
      },
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];
    
    // Memory recommendations
    if (this.metrics.memory.percentage > 85) {
      recommendations.push({
        level: 'high',
        category: 'memory',
        message: 'Memory usage is very high. Consider optimizing or increasing resources.',
        action: 'Check for memory leaks or reduce cache sizes.'
      });
    } else if (this.metrics.memory.percentage > 70) {
      recommendations.push({
        level: 'medium',
        category: 'memory',
        message: 'Memory usage is moderately high.',
        action: 'Monitor memory usage and consider optimization.'
      });
    }
    
    // CPU recommendations
    const loadPerCore = this.metrics.cpu.load[0] / this.metrics.cpu.count;
    if (loadPerCore > 1.5) {
      recommendations.push({
        level: 'high',
        category: 'cpu',
        message: 'CPU load is very high per core.',
        action: 'Check for CPU-intensive operations and optimize.'
      });
    } else if (loadPerCore > 1.0) {
      recommendations.push({
        level: 'medium',
        category: 'cpu',
        message: 'CPU load is moderately high.',
        action: 'Monitor CPU usage and optimize if persistent.'
      });
    }
    
    // Uptime recommendations
    const uptimeDays = this.metrics.uptime / (1000 * 60 * 60 * 24);
    if (uptimeDays > 30) {
      recommendations.push({
        level: 'low',
        category: 'system',
        message: 'System has been running for over 30 days.',
        action: 'Consider restarting for updates and cleanup.'
      });
    }
    
    return recommendations;
  }

  reset() {
    this.startTime = Date.now();
    this.checks.forEach(check => {
      check.lastRun = 0;
      check.status = 'unknown';
      check.lastResult = null;
    });
    
    logger.info('Health monitor reset');
    return true;
  }
}

module.exports = HealthMonitor;
