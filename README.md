# 🤖 YOUR CRUSH - Professional Telegram Userbot

## 📋 Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Deployment](#-quick-deployment-to-render)
- [Detailed Setup](#-detailed-setup-guide)
- [Configuration](#-configuration)
- [File Structure](#-file-structure)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## ✨ Features

### 🎯 Core Features
- **100% Rule-Based Intelligence** - No external AI/ML dependencies
- **Dual Mode Operation** - Supports both Private Chats & Groups
- **Realistic Human Simulation** - Typing indicators, reaction delays, random responses
- **Smart Rate Limiting** - Configurable actions per minute
- **Offline Operation** - All data stored locally in JSON files
- **Health Monitoring** - Built-in HTTP server for Render health checks
- **Graceful Shutdown** - Proper Telegram session cleanup

### 🛡️ Safety & Compliance
- **Zero Data Collection** - No user data logging or transmission
- **Private by Default** - Respects user privacy
- **Controlled Responses** - Only replies when explicitly configured
- **Anti-Spam Protection** - Built-in cooldown mechanisms
- **No Dynamic Generation** - All responses pre-defined in JSON files

## 🏗️ Architecture

```plaintext
┌─────────────────────────────────────────────────────────────┐
│                    YOUR CRUSH USERBOT                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Telegram  │  │   Data       │  │   Message        │   │
│  │   Client    │◄─┤   Manager    │◄─┤   Handler        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         │                │                       │          │
│         ▼                ▼                       ▼          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Rate      │  │   Typing     │  │   State          │   │
│  │   Limiter   │  │   System     │  │   Machine        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    JSON Data Files                           │
│  • reply.json      • reaction.json    • voice.json          │
│  • group_reply.json • video.json                            │
└─────────────────────────────────────────────────────────────┘

```

---

Group Features only paid 

---
