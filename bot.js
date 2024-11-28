const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create a new Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.BOT_TOKEN;

// URL mapping with load balancing options
const urlMappings = {
    'twitter.com': ['fxtwitter.com', 'fixvx.com'],
    'x.com': ['fixvx.com'],
    'instagram.com': ['instagramez.com', 'ddinstagram.com'],
    'tiktok.com': ['tiktxk.com']
};

// Function to strip tracking parameters from URLs
function stripTrackingParams(url) {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
        if (key.startsWith('igsh')) {
            urlObj.searchParams.delete(key);
        }
    });
    return urlObj.toString();
}

// Function to replace URLs in a message
function replaceURLs(messageContent) {
    for (const [original, replacements] of Object.entries(urlMappings)) {
        const regex = new RegExp(`https?://(www\\.)?${original}[^\\s]*`, 'g');
        messageContent = messageContent.replace(regex, (url) => {
            const strippedUrl = stripTrackingParams(url);
            const replacement = replacements[Math.floor(Math.random() * replacements.length)];
            return strippedUrl.replace(original, replacement);
        });
    }
    return messageContent;
}

// Event: Bot ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event: Message creation
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Replace URLs
    const modifiedContent = replaceURLs(message.content);

    // If the message was modified, delete the original and repost
    if (modifiedContent !== message.content) {
        try {
            await message.delete(); // Delete the original message
            await message.channel.send(`${message.author} said: ${modifiedContent}`); // Repost modified content
        } catch (error) {
            console.error('Error modifying message:', error);
        }
    }
});

// Login to Discord
client.login(TOKEN);
