import { ChannelType } from 'discord.js';
import { geminiService } from './gemini.js';
import { voiceManager } from './voice.js';
import { config } from './config.js';

/**
 * Handle the join command to join voice channel
 */
export async function handleJoinCommand(message) {
  try {
    // Check if user is in a voice channel
    if (!message.member.voice.channel) {
      await message.reply('You need to be in a voice channel for me to join!');
      return;
    }

    // Check if bot is already in a voice channel
    if (voiceManager.isInChannel(message.guild.id)) {
      await message.reply('I\'m already in a voice channel!');
      return;
    }

    const channel = message.member.voice.channel;
    await voiceManager.joinChannel(channel);
    await message.reply(`Joined ${channel.name}! 🎵🎤\n\nI can now listen and respond in voice chat using Google Gemini Live API!\nJust start speaking and I'll respond with voice.`);
  } catch (error) {
    console.error('Error in join command:', error);
    await message.reply('Failed to join the voice channel. Please try again.');
  }
}

/**
 * Handle the leave command to leave voice channel
 */
export async function handleLeaveCommand(message) {
  try {
    if (!voiceManager.isInChannel(message.guild.id)) {
      await message.reply('I\'m not in a voice channel!');
      return;
    }

    voiceManager.leaveChannel(message.guild.id);
    await message.reply('Left the voice channel! 👋');
  } catch (error) {
    console.error('Error in leave command:', error);
    await message.reply('Failed to leave the voice channel.');
  }
}

/**
 * Handle the clear command to clear conversation history
 */
export async function handleClearCommand(message) {
  try {
    const contextId = `${message.guild?.id || 'dm'}_${message.channel.id}`;
    geminiService.clearHistory(contextId);
    await message.reply('Conversation history cleared! Starting fresh. 🔄');
  } catch (error) {
    console.error('Error in clear command:', error);
    await message.reply('Failed to clear conversation history.');
  }
}

/**
 * Handle the help command
 */
export async function handleHelpCommand(message) {
  const helpText = `
**${config.botName} Commands**

\`${config.botPrefix}join\` - Join your voice channel and enable voice chat
\`${config.botPrefix}leave\` - Leave the current voice channel
\`${config.botPrefix}clear\` - Clear conversation history
\`${config.botPrefix}help\` - Show this help message

**Voice Chat** 🎤
When I'm in a voice channel, just speak! I'll listen and respond with voice using Google Gemini Live API.

**Text Chat** 💬
Mention me (@${config.botName}) or reply to my messages in text channels, and I'll respond using Google Gemini AI!
I can also intelligently choose to join conversations when appropriate.
  `.trim();

  await message.reply(helpText);
}

/**
 * Process commands
 */
export async function processCommand(message) {
  const content = message.content.trim();
  
  // Check if message starts with prefix
  if (!content.startsWith(config.botPrefix)) {
    return false;
  }

  const args = content.slice(config.botPrefix.length).trim().split(/\s+/);
  const command = args[0].toLowerCase();

  switch (command) {
    case 'join':
      await handleJoinCommand(message);
      return true;
    case 'leave':
      await handleLeaveCommand(message);
      return true;
    case 'clear':
      await handleClearCommand(message);
      return true;
    case 'help':
      await handleHelpCommand(message);
      return true;
    default:
      return false;
  }
}
