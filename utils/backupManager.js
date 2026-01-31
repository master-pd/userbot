// utils/backupManager.js
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.dataDir = path.join(__dirname, '..', 'data');
    this.configDir = path.join(__dirname, '..', 'config');
    this.maxBackups = 10;
    this.autoBackupInterval = 3600000; // 1 hour
  }

  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('✅ Backup manager initialized');
      
      // Schedule auto backups
      this.scheduleAutoBackup();
      
    } catch (error) {
      console.error('Failed to initialize backup manager:', error.message);
    }
  }

  scheduleAutoBackup() {
    setInterval(async () => {
      try {
        await this.createBackup('auto');
        console.log('✅ Auto backup completed');
      } catch (error) {
        console.error('Auto backup failed:', error.message);
      }
    }, this.autoBackupInterval);
    
    console.log(`⏰ Auto backup scheduled every ${this.autoBackupInterval / 60000} minutes`);
  }

  async createBackup(type = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${type}_${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup data files
      await this.backupDirectory(this.dataDir, path.join(backupPath, 'data'));
      
      // Backup config files
      await this.backupDirectory(this.configDir, path.join(backupPath, 'config'));
      
      // Create metadata
      const metadata = {
        name: backupName,
        type: type,
        timestamp: new Date().toISOString(),
        size: await this.getDirectorySize(backupPath),
        files: await this.countFiles(backupPath)
      };
      
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
      
      console.log(`✅ Backup created: ${backupName} (${metadata.size})`);
      
      // Clean old backups
      await this.cleanOldBackups();
      
      return {
        success: true,
        backup: metadata,
        path: backupPath
      };
      
    } catch (error) {
      console.error('Backup creation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async backupDirectory(sourceDir, targetDir) {
    try {
      await fs.mkdir(targetDir, { recursive: true });
      
      const files = await fs.readdir(sourceDir);
      
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        const stats = await fs.stat(sourcePath);
        
        if (stats.isDirectory()) {
          await this.backupDirectory(sourcePath, targetPath);
        } else {
          await fs.copyFile(sourcePath, targetPath);
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to backup ${sourceDir}: ${error.message}`);
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
    } catch (error) {
      // Silent fail
    }
    
    return this.formatBytes(totalSize);
  }

  async countFiles(dirPath) {
    let count = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          count += await this.countFiles(filePath);
        } else {
          count++;
        }
      }
      
    } catch (error) {
      // Silent fail
    }
    
    return count;
  }

  async cleanOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          await fs.rm(backup.path, { recursive: true, force: true });
          console.log(`🧹 Deleted old backup: ${backup.name}`);
        }
        
        return {
          deleted: toDelete.length,
          remaining: backups.length - toDelete.length
        };
      }
      
      return { deleted: 0, remaining: backups.length };
      
    } catch (error) {
      console.error('Failed to clean old backups:', error.message);
      return { deleted: 0, error: error.message };
    }
  }

  async listBackups() {
    try {
      const items = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const item of items) {
        const backupPath = path.join(this.backupDir, item);
        
        try {
          const stats = await fs.stat(backupPath);
          
          if (stats.isDirectory()) {
            const metadataPath = path.join(backupPath, 'metadata.json');
            
            try {
              const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
              backups.push({
                ...metadata,
                path: backupPath,
                age: Date.now() - new Date(metadata.timestamp).getTime()
              });
            } catch {
              // No metadata, but still count as backup
              backups.push({
                name: item,
                type: 'unknown',
                timestamp: stats.mtime.toISOString(),
                path: backupPath,
                age: Date.now() - stats.mtime.getTime()
              });
            }
          }
        } catch {
          // Skip inaccessible items
        }
      }
      
      // Sort by age (newest first)
      backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      return backups;
      
    } catch (error) {
      console.error('Failed to list backups:', error.message);
      return [];
    }
  }

  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Backup not found: ${backupName}`);
      }
      
      // Read metadata
      const metadataPath = path.join(backupPath, 'metadata.json');
      let metadata = {};
      
      try {
        metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      } catch {
        console.warn('No metadata found in backup');
      }
      
      // Create restore directory with timestamp
      const restoreDir = path.join(this.backupDir, `restore_${new Date().toISOString().replace(/[:.]/g, '-')}`);
      await fs.mkdir(restoreDir, { recursive: true });
      
      // Backup current data before restore
      console.log('💾 Backing up current data...');
      await this.backupDirectory(this.dataDir, path.join(restoreDir, 'data_before'));
      await this.backupDirectory(this.configDir, path.join(restoreDir, 'config_before'));
      
      // Restore from backup
      console.log('🔄 Restoring from backup...');
      await this.restoreDirectory(path.join(backupPath, 'data'), this.dataDir);
      await this.restoreDirectory(path.join(backupPath, 'config'), this.configDir);
      
      console.log(`✅ Backup restored: ${backupName}`);
      
      return {
        success: true,
        backup: metadata,
        restorePath: restoreDir,
        message: `Restored from ${backupName}. Original data saved in ${restoreDir}`
      };
      
    } catch (error) {
      console.error('Restore failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async restoreDirectory(sourceDir, targetDir) {
    try {
      // Clear target directory
      await fs.rm(targetDir, { recursive: true, force: true });
      await fs.mkdir(targetDir, { recursive: true });
      
      // Copy files
      await this.backupDirectory(sourceDir, targetDir);
      
    } catch (error) {
      throw new Error(`Failed to restore ${sourceDir}: ${error.message}`);
    }
  }

  async getBackupStats() {
    const backups = await this.listBackups();
    const totalSize = await this.getDirectorySizeBytes(this.backupDir);
    
    return {
      totalBackups: backups.length,
      maxBackups: this.maxBackups,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: backups.length > 0 ? this.formatAge(backups[backups.length - 1].age) : 'None',
      newestBackup: backups.length > 0 ? this.formatAge(backups[0].age) : 'None',
      autoBackupInterval: `${this.autoBackupInterval / 60000} minutes`,
      backups: backups.map(b => ({
        name: b.name,
        type: b.type,
        age: this.formatAge(b.age),
        size: b.size || 'Unknown'
      }))
    };
  }

  async getDirectorySizeBytes(dirPath) {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySizeBytes(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
    } catch (error) {
      // Silent fail
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      await fs.rm(backupPath, { recursive: true, force: true });
      
      console.log(`🗑️ Deleted backup: ${backupName}`);
      
      return {
        success: true,
        message: `Backup ${backupName} deleted`
      };
      
    } catch (error) {
      console.error('Failed to delete backup:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BackupManager;
