const moodle = require("./moodle");
const moodleUtils = require("./moodleutils");
const drive = require("./drive")
const discord = require("./discord");
const fs = require("fs");
require("dotenv").config()

const trackedFiles = [];
let courses;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processResource(course, resource) {
    console.log("Found new resource on " + course + " with id " + resource);
    const f = await moodle.downloadResource(resource, "./work");
    const d = await drive.uploadAndShare(f);
    fs.unlinkSync(f);
    console.log("Uploaded to " + d);
    discord.sendMessage("Foud new resource on " + course + ". Download it here:\n" + d);
}

async function main() {
    console.log("Now watching for new resources..,");
    while (true) {
        await sleep(10000);
        for (const course of courses) {
            const files = await moodleUtils.getFiles(course.id);
            for (const file of files) {
                if (trackedFiles.indexOf(file.id) == -1) {
                    trackedFiles.push(file.id);
                    await processResource(course.fullname, file.id);
                }
            }
        }
    }
}
(async function (){
    console.log("Moodle bot starting");
    moodle.configMoodle(process.env.MOODLE_USER, process.env.MOODLE_PASSWORD, process.env.MOODLE_URL);
    drive.configDrive(process.env.DRIVE_CREDENTIALS_PATH, process.env.DRIVE_FOLDER_ID);
    discord.configDiscord(process.env.DISCORD_TOKEN, process.env.DISCORD_CHANNEL_ID);
    await drive.test();
    console.log("Drive test passed");
    await discord.connect();
    console.log("Discord connected");
    console.log("Starting moodle tracker...");
    courses = await moodleUtils.getCourses();
    if (trackedFiles.length > 0) {
        console.log("Tracked resource cache is present.");
    } else {
        console.log("Found " + courses.length + " courses. Getting data...");
        for (const course of courses) {
            console.log("Getting resources for " + course.fullname + "...");
            const files = await moodleUtils.getFiles(course.id);
            for (const file of files) {
                trackedFiles.push(file.id);
            }
        }
    }
    console.log("Found " + trackedFiles.length + " resources");
    console.log("Moodle tracker started.");
    while (true) {
        try {
            await main();
            break;
        } catch (error) {
            console.log(error);
        }
    } 
})();