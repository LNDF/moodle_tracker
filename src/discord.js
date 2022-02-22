const discord = require("discord.js");

let client = null;

let discordToken = "";
let userID = "";

function configDiscord(discordTokenP, userIDP) {
    discordToken = discordTokenP;
    userID = userIDP;
}
exports.configDiscord = configDiscord;

function connect() {
    return new Promise((resolve, reject) => {
        client = new discord.Client({
            intents: [
                discord.Intents.FLAGS.DIRECT_MESSAGES
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
    const user = await client.users.fetch(userID);
    await user.send(message)
}
exports.sendMessage = sendMessage;