import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config, validateConfig } from './config.js';
import { geminiService } from './gemini.js';
import { processCommand } from './commands.js';
import { voiceManager } from './voice.js';

// Validate configuration before starting
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error.message);
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

/**
 * Use Gemini to decide if the bot should respond to this message
 */
async function shouldRespond(message) {
  // Ignore bot messages
  if (message.author.bot) return false;

  // Always respond if bot is mentioned
  if (message.mentions.has(client.user.id)) return true;

  // Always respond if message is a reply to the bot
  if (message.reference) {
    const repliedTo = message.channel.messages.cache
      .get(message.reference.messageId)?.author.id === client.user.id;
    if (repliedTo) return true;
  }

  // For other messages, ask Gemini if it should respond
  try {
    // Get recent conversation context (last 5 messages)
    const recentMessages = await message.channel.messages.fetch({ limit: 5 });
    const context = Array.from(recentMessages.values())
      .reverse()
      .map(m => `${m.author.username}: ${m.content}`)
      .join('\n');

    const decisionPrompt = `You are a Discord bot named ${config.botName}. Based on the following recent conversation, decide if you should naturally join in and respond to the latest message.

Recent conversation:
${context}

Latest message from ${message.author.username}: "${message.content}"

Consider responding if:
- The message seems directed at you or the group
- It's a question that you could helpfully answer
- The conversation topic is something you could contribute to
- Someone is greeting the channel
- It would be natural for you to chime in

Don't respond if:
- It's a private conversation between specific users
- The topic doesn't warrant your input
- Your response would interrupt the flow

Respond with ONLY "YES" if you should respond, or "NO" if you should stay quiet. No explanation needed.`;

    const decision = await geminiService.sendMessage('decision_' + message.id, decisionPrompt);
    
    // Clean up the decision context immediately (don't keep this history)
    geminiService.clearHistory('decision_' + message.id);
    
    return decision.trim().toUpperCase().includes('YES');
  } catch (error) {
    console.error('Error in shouldRespond decision:', error);
    // On error, only respond to direct mentions/replies (safe fallback)
    return false;
  }
}

/**
 * Handle chat messages with Gemini
 */
async function handleChat(message) {
  try {
    // Show typing indicator
    await message.channel.sendTyping();

    // Create context ID for conversation history
    const contextId = `${message.guild?.id || 'dm'}_${message.channel.id}`;

    // Remove bot mention from message content
    let userMessage = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`), '')
      .trim();

    // If message is empty after removing mention, use a default prompt
    if (!userMessage) {
      userMessage = 'Hello!';
    }

    // Get response from Gemini
    const response = await geminiService.sendMessage(contextId, userMessage);

    // Split response if it's too long (Discord has 2000 char limit)
    if (response.length > 2000) {
      const chunks = response.match(/[\s\S]{1,2000}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(response);
    }
  } catch (error) {
    console.error('Error handling chat message:', error);
    await message.reply('Sorry, I encountered an error processing your message. Please try again.');
  }
}

/**
 * Handle message creation events
 */
client.on('messageCreate', async (message) => {
  try {
    // First check if it's a command
    const isCommand = await processCommand(message);
    if (isCommand) return;

    // Then check if bot should respond to chat (now using AI decision)
    const shouldReply = await shouldRespond(message);
    if (shouldReply) {
      await handleChat(message);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

/**
 * Handle bot ready event
 */
client.on('ready', () => {
  console.log(`✅ ${config.botName} is online!`);
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Set bot status
  client.user.setPresence({
    activities: [{ name: `${config.botPrefix}help for commands` }],
    status: 'online'
  });
});

/**
 * Handle errors
 */
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

/**
 * Handle warnings
 */
client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

/**
 * Handle voice state updates to detect when users speak
 */
client.on('voiceStateUpdate', (oldState, newState) => {
  try {
    const guildId = newState.guild.id;
    
    // Check if bot is in a voice channel in this guild
    if (!voiceManager.isInChannel(guildId)) {
      return;
    }

    // If user joined the voice channel or unmuted, start listening
    if (newState.channelId && !newState.selfMute && !newState.serverMute) {
      // Skip if it's the bot itself
      if (newState.member.user.bot) {
        return;
      }
      
      // Start listening to this user
      voiceManager.startListeningToUser(guildId, newState.id);
    }
  } catch (error) {
    console.error('Error handling voice state update:', error);
  }
});

/**
 * Login to Discord
 */
client.login(config.discordToken).catch((error) => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});

/**
 * Handle process termination
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});
