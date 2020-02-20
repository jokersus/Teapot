const fs = require('fs');
const request = require('request-promise');
const config = JSON.parse(fs.readFileSync('./configuration/config.json', 'utf8'));
const blacklisted = JSON.parse(fs.readFileSync('./configuration/blacklisted.json', 'utf8'));
const keywords = parseKeywords(require('./configuration/keywords.json'));
const hasBlacklisted = setBlacklist(blacklisted);
config.owner = config.owner || process.env.OWNER;
config.webhook = config.webhook || process.env.WEBHOOK;

Client.on('message', message => {

    if (message.author.id === Client.user.id || message.author.id == config.owner) {
        return;
    }

    if (message.guild == null || message.author.bot) {
        return;
    }

    if (message.mentions.users.has(config.owner)) {
        return; 
    }

    const lowercaseContent = message.content.toLowerCase();

    for (let i = 0, max = keywords.length; i < max; i++) {
        if (lowercaseContent.includes(keywords[i].keyword)) {
            if (keywords[i].servers.length == 0) {
                if (!isBlacklisted(message)) {
                    logKeyword(message, keywords[i].keyword);
                }
                break;
            } else {
                if (keywords[i].servers.indexOf(message.guild.id) >= 0) {
                    if (!isBlacklisted(message)) {
                        logKeyword(message, keywords[i].keyword);
                    }
                    break;
                }
            }
        }
    }

const Discord = require('discord.js');
const Client = new Discord.Client({
	messageCacheMaxSize: 1,
	sync: true,
	disabledEvents: require('./configuration/bot/xEvents.js')
});

function setBlacklist(blacklisted) {
    return {
        "users": blacklisted.users.length > 0,
        "servers": blacklisted.servers.length > 0,
        "channels": blacklisted.channels.length >0
    }
};

function isBlacklisted(message) {
    if (hasBlacklisted.users && blacklisted.users.indexOf(message.author.id) >= 0) {
        return true;
    }
    if (hasBlacklisted.servers && blacklisted.servers.indexOf(message.guild.id) >= 0) {
        return true;
    }
    if (hasBlacklisted.channels && blacklisted.channels.indexOf(message.channel.id) >= 0) {
        return true;
    }
    return false;
};

function logKeyword(message, keyword) {
    getHistory(message).then(messages => {
        executeRequest(message, messages, keyword);
    });
};

function getHistory(message) {
   return message.channel.fetchMessages({
        limit: 4,
        before: message.id,
    });
};

function executeRequest(message, messages, keyword) {
    messages = concatAttachments(messages.array());
    const embedFields = messages.map(message => ({
        name: message.author.username,
        value: message.content,
        inline: false
    })).reverse();
    embedFields.push({
        name: message.author.username,
        value: message.content.substring(0, 2000),
        inline: false
    });
    console.log(embedFields);
    const options = {
        method: 'POST',
        uri: config.webhook,
        body: {
            content: `<@${config.owner}>`,
            embeds: [{
                    title: `${message.author.tag} mentioned ${keyword}`,
                    thumbnail: {
                       url: message.author.avatarURL,
                    },
                    "color": message.member.displayColor,
                    "description": `Server \`${message.guild.name}\`\nChannel: <#${message.channel.id}>`,
                    fields: embedFields,
                    timestamp: message.createdAt
                }],
            },
            json: true
    }
    request(options).catch(error => {
    console.log('Error\n' + error.toString());
    });
};

function concatAttachments(messages) {
    messages.forEach(message => {
        if (message.content === "") {
            if (message.attachments.array().length > 0) {
                message.content = message.attachments.array()[0].url;
            } else {
                message.content = '-';
            }
        } else {
            let attachmentArray = message.attachments.array();
            if (attachmentArray.length > 0) {
                let attachmentURL = attachmentArray[0].url;
                if (message.content.length + '\n' + attachmentURL.length < 2048) {
                    message.content = message.content + attachmentURL;
                }
            }
        }
    });
    return messages;
};

function parseKeywords(keywords) {
	const _arr = [];

	keywords['global'].forEach(k => {
		_arr.push({
			keyword: k,
			servers: []
		});
	});

	for (const k in keywords.server) {
		_arr.push({
			keyword: k,
			servers: keywords.server[keyword]
		});
	}

	return _arr;
}

Client.login(config.token).catch(console.error);

Client.on('ready', () => {
	console.log(`Logged in as ${Client.user.tag}`);
	Client.user.setPresence({ status: config.presence });
});
