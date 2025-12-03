import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  EndBehaviorType,
  VoiceReceiver
} from '@discordjs/voice';
import { pipeline } from 'stream';
import prism from 'prism-media';
import { geminiLiveClient } from './geminiLive.js';

class VoiceManager {
  constructor() {
    this.connections = new Map();
    this.players = new Map();
    this.receivers = new Map();
    this.activeListeners = new Map();
    this.listeningEnabled = new Map();
  }

  /**
   * Join a voice channel and enable voice chat with Gemini
   */
  async joinChannel(channel) {
    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      // Wait for the connection to be ready
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      // Create an audio player for this connection
      const player = createAudioPlayer();
      connection.subscribe(player);

      // Store the connection and player
      this.connections.set(channel.guild.id, connection);
      this.players.set(channel.guild.id, player);

      // Connect to Gemini Live API for voice chat
      if (!geminiLiveClient.isReady()) {
        await geminiLiveClient.connect();
      }

      // Set up audio receiver for listening to users
      const receiver = connection.receiver;
      this.receivers.set(channel.guild.id, receiver);

      // Enable voice listening by default
      this.listeningEnabled.set(channel.guild.id, true);

      // Handle disconnection
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          connection.destroy();
          this.connections.delete(channel.guild.id);
          this.players.delete(channel.guild.id);
          this.receivers.delete(channel.guild.id);
          this.stopListening(channel.guild.id);
        }
      });

      // Set up Gemini audio response handler
      this.setupGeminiAudioHandler(channel.guild.id);

      return connection;
    } catch (error) {
      console.error('Error joining voice channel:', error);
      throw error;
    }
  }

  /**
   * Set up handler for Gemini audio responses
   */
  setupGeminiAudioHandler(guildId) {
    const handlerId = `guild_${guildId}`;
    
    geminiLiveClient.onAudioResponse(handlerId, (audioData) => {
      // Play the audio response from Gemini
      this.playAudioBuffer(guildId, audioData);
    });
  }

  /**
   * Play audio buffer through Discord voice
   */
  playAudioBuffer(guildId, audioBuffer) {
    const player = this.players.get(guildId);
    if (!player) {
      console.error('No audio player found for guild:', guildId);
      return;
    }

    try {
      // Create audio resource from buffer
      // Gemini returns PCM audio at 24kHz, 16-bit, mono
      const resource = createAudioResource(audioBuffer, {
        inputType: 'arbitrary'
      });

      player.play(resource);
    } catch (error) {
      console.error('Error playing audio buffer:', error);
    }
  }

  /**
   * Start listening to a user in voice channel
   */
  startListeningToUser(guildId, userId) {
    if (!this.listeningEnabled.get(guildId)) {
      return;
    }

    const receiver = this.receivers.get(guildId);
    if (!receiver) {
      console.error('No receiver found for guild:', guildId);
      return;
    }

    // Check if already listening to this user
    const listenerKey = `${guildId}_${userId}`;
    if (this.activeListeners.has(listenerKey)) {
      return;
    }

    try {
      // Subscribe to user's audio stream
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000 // 1 second of silence ends the stream
        }
      });

      // Convert Opus to PCM for Gemini (mono to reduce processing overhead)
      const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 1,
        frameSize: 960
      });

      // Resample to 16kHz mono for Gemini
      const resampler = new prism.FFmpeg({
        args: [
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '1',
          '-i', '-',
          '-f', 's16le',
          '-ar', '16000',
          '-ac', '1'
        ]
      });

      const audioChunks = [];
      let lastSendTime = 0;
      const MIN_SEND_INTERVAL = 100; // Minimum 100ms between sends to avoid overwhelming API

      pipeline(
        audioStream,
        decoder,
        resampler,
        (error) => {
          if (error) {
            console.error('Audio pipeline error:', error);
          }
        }
      );

      resampler.on('data', (chunk) => {
        audioChunks.push(chunk);
        
        // Rate limit audio sending to avoid overwhelming Gemini Live API
        const now = Date.now();
        if (now - lastSendTime >= MIN_SEND_INTERVAL) {
          // Combine buffered chunks and send
          if (audioChunks.length > 0) {
            const combinedBuffer = Buffer.concat(audioChunks);
            geminiLiveClient.sendAudio(combinedBuffer);
            audioChunks.length = 0; // Clear buffer
            lastSendTime = now;
          }
        }
      });

      resampler.on('end', () => {
        console.log('User finished speaking');
        this.activeListeners.delete(listenerKey);
      });

      this.activeListeners.set(listenerKey, { audioStream, decoder, resampler });

    } catch (error) {
      console.error('Error setting up user listener:', error);
    }
  }

  /**
   * Stop listening to all users
   */
  stopListening(guildId) {
    this.listeningEnabled.set(guildId, false);
    
    // Clean up all active listeners for this guild
    for (const [key, listener] of this.activeListeners.entries()) {
      if (key.startsWith(`${guildId}_`)) {
        try {
          listener.resampler?.destroy();
          listener.decoder?.destroy();
          listener.audioStream?.destroy();
        } catch (error) {
          console.error('Error cleaning up listener:', error);
        }
        this.activeListeners.delete(key);
      }
    }
  }

  /**
   * Enable voice listening
   */
  enableListening(guildId) {
    this.listeningEnabled.set(guildId, true);
  }

  /**
   * Leave a voice channel
   */
  leaveChannel(guildId) {
    const connection = this.connections.get(guildId);
    if (connection) {
      // Stop listening to users
      this.stopListening(guildId);
      
      // Remove Gemini audio handler
      geminiLiveClient.offAudioResponse(`guild_${guildId}`);
      
      // Destroy connection
      connection.destroy();
      this.connections.delete(guildId);
      this.players.delete(guildId);
      this.receivers.delete(guildId);
      this.listeningEnabled.delete(guildId);
      
      return true;
    }
    return false;
  }

  /**
   * Check if bot is in a voice channel
   */
  isInChannel(guildId) {
    return this.connections.has(guildId);
  }

  /**
   * Get connection for a guild
   */
  getConnection(guildId) {
    return this.connections.get(guildId);
  }

  /**
   * Get player for a guild
   */
  getPlayer(guildId) {
    return this.players.get(guildId);
  }
}

export const voiceManager = new VoiceManager();
