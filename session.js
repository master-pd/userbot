const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

console.log('=====================================');
console.log('SESSION STRING GENERATOR FOR RENDER');
console.log('=====================================');

async function generateSession() {
  const API_ID = await input.text('Enter your API_ID from https://my.telegram.org: ');
  const API_HASH = await input.text('Enter your API_HASH: ');
  const PHONE_NUMBER = await input.text('Enter your phone number (with country code): ');
  
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, parseInt(API_ID), API_HASH, {
    connectionRetries: 5,
  });

  console.log('\n🔗 Connecting to Telegram...');
  
  await client.start({
    phoneNumber: () => PHONE_NUMBER,
    password: async () => await input.text('Enter your 2FA password (if any): '),
    phoneCode: async () => await input.text('Enter the code you received: '),
    onError: (err) => console.log('Error:', err),
  });

  const sessionString = client.session.save();
  
  console.log('\n✅ SESSION GENERATED SUCCESSFULLY!');
  console.log('=====================================');
  console.log('Copy this SESSION_STRING to Render:');
  console.log('=====================================');
  console.log(sessionString);
  console.log('=====================================');
  
  console.log('\n📋 Render Environment Variables to set:');
  console.log('API_ID:', API_ID);
  console.log('API_HASH:', API_HASH);
  console.log('SESSION_STRING:', sessionString);
  console.log('PHONE_NUMBER:', PHONE_NUMBER);
  
  const me = await client.getMe();
  console.log('\n👤 Your Account Info:');
  console.log('Name:', me.firstName, me.lastName || '');
  console.log('Username:', me.username || 'N/A');
  console.log('User ID:', me.id);
  console.log('\n✅ Set OWNER_ID in Render as:', me.id);
  
  await client.disconnect();
  console.log('\n🚀 Now deploy to Render with these environment variables!');
}

generateSession().catch(console.error);
