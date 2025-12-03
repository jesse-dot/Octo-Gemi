import WebSocket from 'ws';
import { config } from './config.js';

/**
 * Gemini Live API client for real-time voice conversations
 * Uses WebSocket connection to Google's Gemini multimodal live API
 */
class GeminiLiveClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.audioQueue = [];
    this.responseHandlers = new Map();
    this.conversationActive = false;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect() {
    if (this.isConnected) {
      console.log('Already connected to Gemini Live API');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Gemini Live API WebSocket endpoint
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${config.geminiApiKey}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('✅ Connected to Gemini Live API');
          this.isConnected = true;
          
          // Send initial setup message
          this.sendSetup();
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('Gemini Live API WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('Disconnected from Gemini Live API');
          this.isConnected = false;
        });
      } catch (error) {
        console.error('Error connecting to Gemini Live API:', error);
        reject(error);
      }
    });
  }

  /**
   * Send initial setup configuration
   */
  sendSetup() {
    const setupMessage = {
      setup: {
        model: 'models/gemini-2.0-flash-exp',
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Aoede' // Natural female voice
              }
            }
          }
        }
      }
    };

    this.send(setupMessage);
  }

  /**
   * Send message to Gemini Live API
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.error('Not connected to Gemini Live API');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message to Gemini Live API:', error);
    }
  }

  /**
   * Handle incoming messages from Gemini Live API
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.setupComplete) {
        console.log('Gemini Live API setup complete');
      }

      // Handle server content (audio responses)
      if (message.serverContent) {
        const parts = message.serverContent.modelTurn?.parts || [];
        
        for (const part of parts) {
          if (part.inlineData?.data) {
            // Audio data received - base64 encoded PCM audio
            const audioData = Buffer.from(part.inlineData.data, 'base64');
            this.audioQueue.push(audioData);
            
            // Emit audio data to any registered handlers
            this.responseHandlers.forEach(handler => handler(audioData));
          }
          
          if (part.text) {
            console.log('Gemini text response:', part.text);
          }
        }
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        console.log('Turn complete - bot finished speaking');
        this.conversationActive = false;
      }

    } catch (error) {
      console.error('Error handling Gemini Live message:', error);
    }
  }

  /**
   * Send audio data to Gemini Live API
   * @param {Buffer} audioBuffer - PCM audio data (16-bit, 16kHz, mono)
   */
  sendAudio(audioBuffer) {
    if (!this.isConnected) {
      console.error('Cannot send audio - not connected');
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm',
            data: audioBuffer.toString('base64')
          }
        ]
      }
    };

    this.send(message);
  }

  /**
   * Send text message to Gemini Live API
   */
  sendText(text) {
    if (!this.isConnected) {
      console.error('Cannot send text - not connected');
      return;
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };

    this.send(message);
    this.conversationActive = true;
  }

  /**
   * Register a handler for audio responses
   */
  onAudioResponse(id, handler) {
    this.responseHandlers.set(id, handler);
  }

  /**
   * Unregister an audio response handler
   */
  offAudioResponse(id) {
    this.responseHandlers.delete(id);
  }

  /**
   * Get queued audio data
   */
  getQueuedAudio() {
    const audio = this.audioQueue;
    this.audioQueue = [];
    return audio;
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.audioQueue = [];
      this.responseHandlers.clear();
    }
  }

  /**
   * Check if currently connected
   */
  isReady() {
    return this.isConnected;
  }
}

export const geminiLiveClient = new GeminiLiveClient();
