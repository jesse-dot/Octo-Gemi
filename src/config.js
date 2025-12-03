import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  botPrefix: process.env.BOT_PREFIX || '!',
  botName: process.env.BOT_NAME || 'Octo-Gemi'
};

// Validate required environment variables
export function validateConfig() {
  const required = ['discordToken', 'geminiApiKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
