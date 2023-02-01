const moodle = require("./moodle");
const HTMLParser = require('node-html-parser');

async function getCourses() {
    const req = await moodle.callMoodleFunction("core_course_get_enrolled_courses_by_timeline_classification", {
        "offset": 0,
        "classification": "all",
        "customfieldname": "",
        "customfieldvalue": ""
    });
    for (let course of req.data.courses) {
        if (course.id == process.env.FOCUS_COURSE) {
            console.log("Focusing only on " + course.fullname);
            return [course];
        }
    }
    return req.data.courses;
}

function getEntriesFromTYpe(req, type) {
    const entries = [];
    const html = HTMLParser.parse(req);
    const as = html.querySelectorAll(".activity."+ type + " .aalink");
    for (const a of as) {
        const url = a.getAttribute("href");
        entries.push({
            name: a.childNodes[1].childNodes[0].innerText,
            id: parseInt(url.substring(url.indexOf("id=") + 3))
        })
    }
}

async function getFiles(courseid) {
    courseid = courseid.toString();
    const entries = {};
    const req = await moodle.getPage("/course/view.php?id=" + courseid);
    entries.files = getEntriesFromTYpe(req, "resource");
    entries.urls = getEntriesFromTYpe(req, "url");
    if (courseid.indexOf("section=") == -1) {
        const pages = html.querySelectorAll("innertab").length;
        for (let i = 1; i < pages; i++) {
            const sectionEntries = await getEntries(courseid + "&section=" + i);
            entries.files = entries.files.concat(sectionEntries.files);
            entries.urls = entries.urls.concat(sectionEntries.urls);
        }
    }
    return files;
}

exports.getCourses = getCourses;
exports.getEntries = getEntries;
