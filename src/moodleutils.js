const moodle = require("./moodle");

async function getCourses() {
    const req = await moodle.callMoodleFunction("core_course_get_enrolled_courses_by_timeline_classification", {
        "offset": 0,
        "classification": "all",
        "customfieldname": "",
        "customfieldvalue": ""
    });
    return req.data.courses;
}
exports.getCourses = getCourses;