const moodle = require("./moodle");
const moodleUtils = require("./moodleutils");
require("dotenv").config()

async function main() {
    moodle.configMoodle(process.env.MOODLE_USER, process.env.MOODLE_PASSWORD, process.env.MOODLE_URL);

    console.log(await moodleUtils.getCourses());
}

main();