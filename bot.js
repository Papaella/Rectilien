const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
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

// URL mapping
const urlMappings = {
    'x.com': 'fixvx.com',
    'instagram.com': 'instagramez.com',
    'tiktok.com': 'tiktxk.com'
};

// Function to replace URLs in a message
function replaceURLs(messageContent) {
    for (const [original, replacement] of Object.entries(urlMappings)) {
        const regex = new RegExp(`https?://(www\\.)?${original}`, 'g');
        messageContent = messageContent.replace(regex, `https://${replacement}`);
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