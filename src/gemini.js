import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.conversationHistories = new Map();
  }

  /**
   * Get or create a chat session for a specific user/channel
   */
  getChat(contextId) {
    if (!this.conversationHistories.has(contextId)) {
      const chat = this.model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.9,
          topP: 0.8,
          topK: 40
        }
      });
      this.conversationHistories.set(contextId, chat);
    }
    return this.conversationHistories.get(contextId);
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(contextId, message) {
    try {
      const chat = this.getChat(contextId);
      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error communicating with Gemini:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history for a specific context
   */
  clearHistory(contextId) {
    this.conversationHistories.delete(contextId);
  }

  /**
   * Clear all conversation histories
   */
  clearAllHistories() {
    this.conversationHistories.clear();
  }
}

export const geminiService = new GeminiService();
