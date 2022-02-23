const discord = require("discord.js-12");

let client = null;

let discordToken = "";
let channelID = "";

function configDiscord(discordTokenP, channelIDP) {
    discordToken = discordTokenP;
    channelID = channelIDP;
}
exports.configDiscord = configDiscord;

function connect() {
    return new Promise((resolve, reject) => {
        client = new discord.Client({
            intents: [
                discord.Intents.FLAGS.GUILDS
            ]
        });
        client.on("ready", () => {
            resolve();
        });
        client.on("error", reject);
        client.login(discordToken);
    });
}
exports.connect = connect;

async function sendMessage(message) {
    const channel = client.channels.cache.get(channelID);
    channel.send(message);
}
exports.sendMessage = sendMessage;