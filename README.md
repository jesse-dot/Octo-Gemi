# Octo-Gemi 🐙🤖

A Discord bot powered by Google Gemini API that can chat like a human in text channels and join voice channels. Engage in natural conversations with AI-powered responses!

## Features

- 💬 **Text Channel Chat**: Mention the bot or reply to its messages to have natural conversations
- 🤖 **Intelligent Response**: AI-powered decision making - the bot intelligently chooses when to join conversations naturally
- 🎤 **Voice Chat with Gemini Live API**: Real-time voice conversations using Google's Gemini multimodal live API
- 🎵 **Voice Channel Support**: Bot can join voice channels, listen to users, and respond with voice
- 🧠 **Google Gemini AI**: Uses Google's Gemini Pro for text and Gemini 2.0 Flash for voice
- 📝 **Conversation History**: Maintains context within each channel for coherent conversations
- 🎮 **Simple Commands**: Easy-to-use command interface

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A [Discord Bot Token](https://discord.com/developers/applications)
- A [Google Gemini API Key](https://makersuite.google.com/app/apikey)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jesse-dot/Octo-Gemi.git
   cd Octo-Gemi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   GEMINI_API_KEY=your_gemini_api_key_here
   BOT_PREFIX=!
   BOT_NAME=Octo-Gemi
   ```

4. **Set up Discord Bot**
   
   a. Go to [Discord Developer Portal](https://discord.com/developers/applications)
   
   b. Create a new application or select an existing one
   
   c. Go to "Bot" section and create a bot if you haven't already
   
   d. Enable these Privileged Gateway Intents:
      - ✅ MESSAGE CONTENT INTENT
      - ✅ SERVER MEMBERS INTENT (optional)
   
   e. Copy the bot token and add it to your `.env` file
   
   f. Go to OAuth2 → URL Generator and select:
      - Scopes: `bot`
      - Bot Permissions: 
        - Read Messages/View Channels
        - Send Messages
        - Connect
        - Speak
        - Use Voice Activity
   
   g. Use the generated URL to invite the bot to your server

5. **Get Google Gemini API Key**
   
   a. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   
   b. Create a new API key
   
   c. Add it to your `.env` file

## Usage

### Starting the Bot

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Commands

- `!join` - Bot joins your current voice channel and enables voice chat
- `!leave` - Bot leaves the voice channel
- `!clear` - Clear conversation history for current channel
- `!help` - Display help message with all commands

### Voice Chat 🎤

When the bot joins a voice channel using `!join`, it automatically:
1. **Listens to users speaking** in the voice channel
2. **Processes audio in real-time** using Google Gemini Live API
3. **Responds with voice** - natural, human-like speech powered by Gemini 2.0 Flash

Just start speaking in the voice channel, and the bot will listen and respond! It's like having a conversation with a real person.

**How it works:**
- The bot uses Discord's voice receiver to capture audio from users
- Audio is streamed to Google's Gemini multimodal live API via WebSocket
- Gemini processes the audio and generates voice responses in real-time
- The bot plays the AI-generated voice responses back in the channel

### Text Chat 💬

The bot will respond when you:
1. **Mention the bot**: `@Octo-Gemi Hello there!` - Always responds
2. **Reply to the bot's message**: Use Discord's reply feature on any bot message - Always responds
3. **Any message in the channel**: The bot uses AI to intelligently decide if it should join the conversation naturally!

**Intelligent Response System:**
The bot analyzes the conversation context to decide if it should respond to any message. It considers:
- Whether the message seems directed at it or the group
- If it's a question it could helpfully answer
- Whether it can contribute meaningfully to the topic
- If joining in would feel natural (e.g., greetings, open discussions)

This makes the bot feel more like a natural participant in your server conversations rather than just a command responder!

The bot maintains conversation context per channel, so it will remember what you talked about!

## Project Structure

```
Octo-Gemi/
├── src/
│   ├── index.js       # Main bot entry point
│   ├── config.js      # Configuration management
│   ├── gemini.js      # Google Gemini API integration (text chat)
│   ├── geminiLive.js  # Google Gemini Live API integration (voice chat)
│   ├── voice.js       # Voice channel management and audio streaming
│   └── commands.js    # Command handlers
├── .env.example       # Environment variables template
├── .gitignore        # Git ignore rules
├── package.json      # Project dependencies
└── README.md         # This file
```

## How It Works

1. **Text Chat**: When you mention the bot or reply to its messages, it sends your message to Google Gemini Pro API and replies with an AI-generated response. The bot can also intelligently decide to respond to any message in the channel.

2. **Voice Chat**: When the bot joins a voice channel:
   - It captures audio from users using Discord's voice receiver
   - Audio is converted from Opus to PCM format and resampled to 16kHz mono
   - Audio streams to Google Gemini Live API via WebSocket connection
   - Gemini processes the audio and generates natural voice responses
   - The bot plays back the AI-generated audio in the voice channel
   
3. **Context Awareness**: Each text channel maintains its own conversation history, so the bot remembers the context of your conversation.

4. **Intelligent Participation**: The bot uses AI to decide when to naturally join text conversations, making it feel like a real server member.

## Troubleshooting

### Bot doesn't respond to messages
- Make sure MESSAGE CONTENT INTENT is enabled in Discord Developer Portal
- Check that the bot has permission to read and send messages in the channel
- Verify your `.env` file has the correct credentials

### Bot can't join voice channels
- Ensure the bot has "Connect" and "Speak" permissions
- Check that you're in a voice channel when using `!join`
- Install FFmpeg: `sudo apt-get install ffmpeg` (Linux) or `brew install ffmpeg` (macOS)

### Voice chat doesn't work
- Make sure FFmpeg is installed for audio processing
- Verify the bot has permission to use Voice Activity
- Check console logs for WebSocket connection errors to Gemini Live API
- Ensure your Gemini API key has access to the multimodal live API

### API Errors
- Verify your Gemini API key is valid and has quota available
- Check your internet connection
- Review console logs for specific error messages
- For Gemini Live API access, you may need to sign up for the preview program

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes!

## Acknowledgments

- Built with [discord.js](https://discord.js.org/)
- Powered by [Google Gemini API](https://ai.google.dev/)
- Voice support via [@discordjs/voice](https://discord.js.org/docs/packages/voice/stable)