const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const TOKEN = process.env.BOT_TOKEN;

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

// Event: Bot ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event: Message creation
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Regex to detect all Instagram-related links
    const instagramRegex = /https?:\/\/(www\.)?(instagram|instagramez|ddinstagram)\.com\/[^\s]+/;
    const match = message.content.match(instagramRegex);

    if (match) {
        const originalLink = stripTrackingParams(match[0]); // Preserve the original link
        const confirmationMessage = await message.channel.send(
            `${message.author}, do you want me to modify your Instagram link? React 👍 or 👎.`
        );

        await confirmationMessage.react('👍');
        await confirmationMessage.react('👎');

        const filter = (reaction, user) =>
            ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
        const collector = confirmationMessage.createReactionCollector({ filter, max: 1, time: 30000 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '👍') {
                await message.delete(); // Delete the original message
                const repostMessage = await message.channel.send(`${message.author} said: ${originalLink}`);
                await repostMessage.react('🇩'); // ddinstagram
                await repostMessage.react('🇪'); // instagramez
                await repostMessage.react('📷'); // instagram
                await repostMessage.react('❌'); // delete

                const repostFilter = (reaction, user) =>
                    ['🇩', '🇪', '📷', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
                const repostCollector = repostMessage.createReactionCollector({ filter: repostFilter, time: 60000 });

                repostCollector.on('collect', async (reaction) => {
                    if (reaction.emoji.name === '🇩') {
                        const newLink = originalLink.replace(/(instagram|instagramez|ddinstagram)\.com/, 'ddinstagram.com');
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '🇪') {
                        const newLink = originalLink.replace(/(instagram|instagramez|ddinstagram)\.com/, 'instagramez.com');
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '📷') {
                        const newLink = originalLink.replace(/(instagram|instagramez|ddinstagram)\.com/, 'instagram.com');
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '❌') {
                        await repostMessage.delete();
                        repostCollector.stop();
                    }
                });

                repostCollector.on('end', () => {
                    repostMessage.reactions.removeAll().catch(console.error);
                });
            } else if (reaction.emoji.name === '👎') {
                await confirmationMessage.delete();
                collector.stop();
            }
        });

        collector.on('end', () => {
            if (!confirmationMessage.deleted) {
                confirmationMessage.delete().catch(console.error);
            }
        });
    }
});

client.login(TOKEN);
