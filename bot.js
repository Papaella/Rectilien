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

// Function to modify URLs based on reactions
function modifyURL(originalURL, replacement) {
    return originalURL.replace(
        /(twitter|x|tiktok|instagram|instagramez|ddinstagram|vxtwitter|fixvx|xcancel|vm\.vxtiktok)\.com/,
        replacement
    );
}

// Function to get reactions and replacements based on URL type
function getReactions(url) {
    if (url.includes('instagram.com') || url.includes('instagramez.com') || url.includes('ddinstagram.com')) {
        return { playPause: 'instagramez.com', arrowsCounterclockwise: 'ddinstagram.com', link: 'instagram.com' };
    }
    if (url.includes('twitter.com')) {
        return { playPause: 'vxtwitter.com', thread: 'xcancel.com', link: 'x.com' };
    }
    if (url.includes('x.com')) {
        return { playPause: 'fixvx.com', thread: 'xcancel.com', link: 'x.com' };
    }
    if (url.includes('tiktok.com')) {
        return { playPause: 'vm.vxtiktok.com', link: 'tiktok.com' };
    }
    return null;
}

// Event: Bot ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event: Message creation
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Regex to detect all supported links
    const urlRegex = /https?:\/\/(www\.)?(twitter|x|tiktok|instagram|instagramez|ddinstagram|vxtwitter|fixvx|xcancel|vm\.vxtiktok)\.com\/[^\s]+/g;
    const matches = message.content.match(urlRegex);

    if (matches) {
        const confirmationMessage = await message.channel.send(
            `${message.author}, do you want me to modify your links? React 👍 or 👎.`
        );

        await confirmationMessage.react('👍');
        await confirmationMessage.react('👎');

        const filter = (reaction, user) =>
            ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
        const collector = confirmationMessage.createReactionCollector({ filter, max: 1, time: 30000 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '👍') {
                await message.delete(); // Delete the original message
                let repostMessages = [];

                for (const match of matches) {
                    const originalLink = stripTrackingParams(match); // Preserve the original link
                    const linkType = getReactions(originalLink);

                    if (!linkType) continue;

                    const repostMessage = await message.channel.send(`${message.author} said: ${originalLink}`);
                    repostMessages.push({ repostMessage, originalLink, linkType });

                    if (linkType.playPause) await repostMessage.react('⏯');
                    if (linkType.arrowsCounterclockwise) await repostMessage.react('🔄');
                    if (linkType.thread) await repostMessage.react('🧵');
                    if (linkType.link) await repostMessage.react('🔗');
                    await repostMessage.react('❌'); // Delete
                }

                // Reaction handling for reposted messages
                for (const { repostMessage, originalLink, linkType } of repostMessages) {
                    let lastState = originalLink;

                    const repostFilter = (reaction, user) =>
                        ['⏯', '🔄', '🧵', '🔗', '❌'].includes(reaction.emoji.name) &&
                        (user.id === message.author.id || user.permissions.has('ADMINISTRATOR'));

                    const repostCollector = repostMessage.createReactionCollector({ filter: repostFilter, time: 60000 });

                    repostCollector.on('collect', async (reaction) => {
                        let newLink;
                        if (reaction.emoji.name === '⏯') {
                            newLink = modifyURL(originalLink, linkType.playPause);
                        } else if (reaction.emoji.name === '🔄') {
                            newLink = modifyURL(originalLink, linkType.arrowsCounterclockwise);
                        } else if (reaction.emoji.name === '🧵') {
                            newLink = modifyURL(originalLink, linkType.thread);
                        } else if (reaction.emoji.name === '🔗') {
                            newLink = modifyURL(originalLink, linkType.link);
                        }

                        if (reaction.emoji.name === '❌') {
                            await repostMessage.delete();
                            repostCollector.stop();
                        } else if (newLink && newLink !== lastState) {
                            lastState = newLink;
                            await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                        }
                    });

                    repostCollector.on('end', () => {
                        repostMessage.reactions.removeAll().catch(console.error);
                    });
                }
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
