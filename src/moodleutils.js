const moodle = require("./moodle");
const HTMLParser = require('node-html-parser');

async function getCourses() {
    const req = await moodle.callMoodleFunction("core_course_get_enrolled_courses_by_timeline_classification", {
        "offset": 0,
        "classification": "all",
        "customfieldname": "",
        "customfieldvalue": ""
    });
    return req.data.courses;
}

async function getFiles(courseid) {
    courseid = courseid.toString();
    const files = [];
    const req = await moodle.getPage("/course/view.php?id=" + courseid);
    const html = HTMLParser.parse(req);
    const as = html.querySelectorAll(".activity.resource .aalink");
    for (const a of as) {
        const url = a.getAttribute("href");
        files.push({
            name: a.childNodes[1].childNodes[0].innerText,
            id: parseInt(url.substring(url.indexOf("id=") + 3))
        })
    }
    if (courseid.indexOf("section=") == -1) {
        const pages = html.querySelectorAll("innertab").length;
        for (let i = 1; i < pages; i++) {
            files.push.apply(files, (await getFiles(courseid + "&section=" + i)));
        }
    }
    return files;
}

exports.getCourses = getCourses;
exports.getFiles = getFiles;