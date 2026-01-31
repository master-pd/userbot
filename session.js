require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;

async function generateSession() {
  console.log('Generating session string for Render...');
  
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () => await input.text('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });

  console.log('✅ Session generated successfully!');
  console.log('=====================================');
  console.log('SESSION_STRING:', client.session.save());
  console.log('=====================================');
  
  // Save to environment variable for Render
  console.log('\n📋 Copy this SESSION_STRING to Render Environment Variables:');
  console.log('Key: SESSION_STRING');
  console.log(`Value: ${client.session.save()}`);
  
  await client.disconnect();
}

generateSession().catch(console.error);
