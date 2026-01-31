// session.js - Generate Session String Locally
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_ID = process.env.API_ID || 0;
const API_HASH = process.env.API_HASH || '';

async function generateSession() {
  console.log('='.repeat(50));
  console.log('🔐 Telegram Session Generator');
  console.log('='.repeat(50));
  
  if (!API_ID || !API_HASH) {
    console.error('❌ Please set API_ID and API_HASH environment variables first!');
    console.error('Example:');
    console.error('  export API_ID=1234567');
    console.error('  export API_HASH=abcdef1234567890');
    process.exit(1);
  }
  
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5
  });
  
  await client.start({
    phoneNumber: async () => new Promise((resolve) => {
      rl.question('📱 Enter your phone number (with country code): ', resolve);
    }),
    password: async () => new Promise((resolve) => {
      rl.question('🔒 Enter your 2FA password (if any): ', resolve);
    }),
    phoneCode: async () => new Promise((resolve) => {
      rl.question('📨 Enter the code you received: ', resolve);
    }),
    onError: (err) => console.error('❌ Error:', err)
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Login successful!');
  console.log('='.repeat(50));
  console.log('\n📋 SESSION STRING (Copy this for Render):');
  console.log('='.repeat(50));
  console.log(client.session.save());
  console.log('='.repeat(50));
  
  console.log('\n💡 Paste this in Render as SESSION_STRING environment variable');
  await client.disconnect();
  rl.close();
}

generateSession().catch(console.error);
