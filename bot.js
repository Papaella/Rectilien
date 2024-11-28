const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

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
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'igsh'];
    trackingParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
            urlObj.searchParams.delete(param);
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

    // If the message was modified, ask for confirmation before deleting and reposting
    if (modifiedContent !== message.content) {
        try {
            const confirmationMessage = await message.channel.send(`${message.author}, do you want me to delete and repost your message with modified URLs? Reply with "yes" or "no".`);

            // Wait for the user's response
            const filter = response => response.author.id === message.author.id && ['yes', 'no'].includes(response.content.toLowerCase());
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

            const userResponse = collected.first();
            if (userResponse.content.toLowerCase() === 'yes') {
                await message.delete(); // Delete the original message
                await message.channel.send(`${message.author} said: ${modifiedContent}`); // Repost modified content
            }
            // Delete the confirmation message and the user's response
            await confirmationMessage.delete();
            await userResponse.delete();
        } catch (error) {
            console.error('Error modifying message:', error);
            await message.channel.send('No response received. Operation canceled.');
        }
    }
});

// Login to Discord
client.login(TOKEN);
