const moodle = require("./moodle");
const moodleUtils = require("./moodleutils");
const drive = require("./drive")
const discord = require("./discord");
require("dotenv").config()

const trackedFiles = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Starting moodle tracker...");
    const c = await moodleUtils.getCourses();
    if (trackedFiles.length > 0) {
        console.log("Tracked resource cache is present.");
    } else {
        console.log("Found " + c.length + " courses. Getting data...");
        for (const course of c) {
            console.log("Getting resources for " + course.fullname + "...");
            const files = await moodleUtils.getFiles(course.id);
            for (const file of files) {
                trackedFiles.push(file.id);
            }
        }
    }
    console.log("Found " + trackedFiles.length + " resources");
    console.log("Moodle tracker started. Now watching for new resources...");
    console.log(await drive.uploadAndShare(await moodle.downloadResource(958248, ".")));
    while (true) {
        await sleep(10000);
        for (const course of c) {
            const files = await moodleUtils.getFiles(course.id);
            for (const file of files) {
                if (trackedFiles.indexOf(file.id) == -1) {
                    trackedFiles.push(file.id);
                    //well, we have a new file. re-upload it now here...
                }
            }
        }
    }
}
(async function (){
    moodle.configMoodle(process.env.MOODLE_USER, process.env.MOODLE_PASSWORD, process.env.MOODLE_URL);
    drive.configDrive(process.env.DRIVE_CREDENTIALS_PATH, process.env.DRIVE_FOLDER_ID);
    discord.configDiscord(process.env.DISCORD_TOKEN, process.env.DISCORD_USER_ID);
    await drive.test();
    await discord.connect();
    await discord.sendMessage("Hello world!!!!");
    try {
        await main();
    } catch (error) {
        console.log(error);
    }
})();