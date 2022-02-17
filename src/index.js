const moodle = require("./moodle");
const moodleUtils = require("./moodleutils");
require("dotenv").config()

const courseTracker = {};

async function main() {
    moodle.configMoodle(process.env.MOODLE_USER, process.env.MOODLE_PASSWORD, process.env.MOODLE_URL);
    const c = await moodleUtils.getCourses();
    console.log(c);
}

main();