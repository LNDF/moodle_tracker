const moodle = require("./moodle");
const moodleUtils = require("./moodleutils");
require("dotenv").config()

const trackedFiles = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Starting moodle tracker...");
    moodle.configMoodle(process.env.MOODLE_USER, process.env.MOODLE_PASSWORD, process.env.MOODLE_URL);
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
    while (true) {
        for (const course of c) {
            const files = await moodleUtils.getFiles(course.id);
            for (const file of files) {
                if (trackedFiles.indexOf(file.id) == -1) {
                    trackedFiles.push(file.id);
                    //well, we have a new file. re-upload it now here...
                }
            }
        }
        await sleep(10000);
    }
}
(async function (){
    try {
        await main();
    } catch (error) {
        console.log(error);
    }
})();