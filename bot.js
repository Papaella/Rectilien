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

// Function to get reactions based on URL type
function getReactions(url) {
    if (url.includes('instagram.com') || url.includes('instagramez.com') || url.includes('ddinstagram.com')) {
        return { D: 'ddinstagram.com', E: 'instagramez.com', camera: 'instagram.com' };
    }
    if (url.includes('twitter.com')) {
        return { playPause: 'vxtwitter.com', thread: 'xcancel.com', bird: 'x.com' };
    }
    if (url.includes('x.com')) {
        return { playPause: 'fixvx.com', thread: 'xcancel.com', bird: 'x.com' };
    }
    if (url.includes('tiktok.com')) {
        return { playPause: 'vm.vxtiktok.com', camera: 'tiktok.com' };
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
    const urlRegex = /https?:\/\/(www\.)?(twitter|x|tiktok|instagram|instagramez|ddinstagram|vxtwitter|fixvx|xcancel|vm\.vxtiktok)\.com\/[^\s]+/;
    const match = message.content.match(urlRegex);

    if (match) {
        const originalLink = stripTrackingParams(match[0]); // Preserve the original link
        const linkType = getReactions(originalLink);

        if (!linkType) return;

        const confirmationMessage = await message.channel.send(
            `${message.author}, do you want me to modify your link? React 👍 or 👎.`
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
                if (linkType.D) await repostMessage.react('🇩'); // ddinstagram
                if (linkType.E) await repostMessage.react('🇪'); // instagramez
                if (linkType.camera) await repostMessage.react('📷'); // instagram or tiktok camera
                if (linkType.playPause) await repostMessage.react('🎵'); // vxtwitter or vm.vxtiktok
                if (linkType.thread) await repostMessage.react('🧵'); // xcancel
                if (linkType.bird) await repostMessage.react('🐦'); // twitter/x.com
                await repostMessage.react('❌'); // delete

                const repostFilter = (reaction, user) =>
                    ['🇩', '🇪', '📷', '🎵', '🧵', '🐦', '❌'].includes(reaction.emoji.name) &&
                    user.id === message.author.id;
                const repostCollector = repostMessage.createReactionCollector({ filter: repostFilter, time: 60000 });

                repostCollector.on('collect', async (reaction) => {
                    if (reaction.emoji.name === '🇩') {
                        const newLink = modifyURL(originalLink, linkType.D);
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '🇪') {
                        const newLink = modifyURL(originalLink, linkType.E);
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '📷') {
                        const newLink = modifyURL(originalLink, linkType.camera);
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '🎵') {
                        const newLink = modifyURL(originalLink, linkType.playPause);
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '🧵') {
                        const newLink = modifyURL(originalLink, linkType.thread);
                        await repostMessage.edit(`${message.author} updated link: ${newLink}`);
                    } else if (reaction.emoji.name === '🐦') {
                        const newLink = modifyURL(originalLink, linkType.bird);
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
