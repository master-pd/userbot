#!/bin/bash

# setup.sh - Installation script for YOUR CRUSH Userbot

echo "=========================================="
echo "🤖 YOUR CRUSH Userbot - Setup Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 16 ]; then
    echo -e "${RED}❌ Node.js 16 or higher is required${NC}"
    echo "Current version: $NODE_VERSION"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Check npm
echo "📦 Checking npm..."
npm --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data logs backups voices videos config

# Create default data files if they don't exist
if [ ! -f "data/reply.json" ]; then
    echo "📝 Creating default reply.json..."
    cat > data/reply.json << EOF
{
  "hi": ["Hello!", "Hi there!", "Hey!", "Hi! 👋", "Hello! How are you?", "Hey there! 😊"],
  "hello": ["Hi!", "Hello!", "Hey there!", "Hello! 😄", "Hi! What's up?", "Hey! Nice to see you!"],
  "test": ["Test successful! ✅", "Working! 👍", "All systems go! 🚀"]
}
EOF
fi

if [ ! -f "data/reaction.json" ]; then
    echo "🎭 Creating default reaction.json..."
    cat > data/reaction.json << EOF
{
  "reactions": ["👍", "❤️", "🔥", "😂", "😮", "😢", "😡", "🎉", "🤔", "👏"]
}
EOF
fi

if [ ! -f "data/voice.json" ]; then
    echo "🎵 Creating default voice.json..."
    cat > data/voice.json << EOF
{
  "voices": [
    {
      "id": "voice_hello",
      "description": "Hello voice message",
      "duration": 3,
      "note": "Add voice files in voices/ folder"
    }
  ]
}
EOF
fi

if [ ! -f "data/video.json" ]; then
    echo "🎬 Creating default video.json..."
    cat > data/video.json << EOF
{
  "videos": [
    {
      "id": "video_chill",
      "title": "Chill Music Stream",
      "url": "https://www.youtube.com/watch?v=5qap5aO4i9A",
      "description": "Lofi hip hop radio",
      "duration": "∞"
    }
  ]
}
EOF
fi

# Generate session
echo ""
echo "=========================================="
echo "🔑 Telegram Session Generation"
echo "=========================================="
echo ""
echo -e "${YELLOW}ℹ️  You need Telegram API credentials from:${NC}"
echo -e "${YELLOW}   https://my.telegram.org${NC}"
echo ""
read -p "Do you want to generate session now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting session generation..."
    echo ""
    node session.js
else
    echo "⏭️  Skipping session generation"
    echo "You can run later: npm run session"
fi

# Setup complete
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "1. Deploy to Render:"
echo "   - Push to GitHub/GitLab"
echo "   - Create Blueprint on Render"
echo "   - Set environment variables"
echo ""
echo "2. Local testing:"
echo "   - Create .env file with:"
echo "     API_ID=your_id"
echo "     API_HASH=your_hash"
echo "     SESSION_STRING=your_session"
echo "   - Run: npm start"
echo ""
echo "3. Customize responses:"
echo "   - Edit data/reply.json"
echo "   - Edit data/reaction.json"
echo ""
echo "📚 Documentation: README.md"
echo ""
