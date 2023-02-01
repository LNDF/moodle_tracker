const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const stelth = require("puppeteer-extra-plugin-stealth")();
const fs = require("fs");
const {resolve} = require("path");

let lastToken = "";
let lastSesskey = "";

let moodleDomain = "";
let moodleUser = "";
let moodlePassword = "";

function configMoodle(moodleUserP, moodlePasswordP, moodleDomainP) {
	moodleDomain = moodleDomainP;
	moodleUser = moodleUserP;
	moodlePassword = moodlePasswordP;
}
exports.configMoodle = configMoodle;

puppeteer.use(stelth);

function pageHasUrl(page, url) {
	return page.url().indexOf(url) == 0;
}

function getCookieFromCookies(cookies, name) {
	for (let cookie of cookies) {
		if (cookie.name == name) return cookie.value;
	}
	return null;
}

async function savePageState(page, error = null) {
	const savepath = "./errors/error_" + Date.now() + "/"
	await fs.promises.mkdir(savepath, {recursive: true});
	if (page != null) {
		await page.screenshot({path: savepath + "screen.png"});
		const htmlContent = await page.evaluate(() => document.documentElement.outerHTML);
		await fs.promises.writeFile(savepath + "document.html", htmlContent);
	}
	if (error != null) {
		await fs.promises.writeFile(savepath + "error.txt", error.stack);
	}
}

async function makePage(url) {
	const cwd = "./browserData";
	const puppeteerSettings = {headless: process.env.USE_HEADLESS == "true" ? true : false,
							   userDataDir: cwd};
	const browser = await puppeteer.launch(puppeteerSettings);
	const userAgent = await browser.userAgent();
	
	const context = browser.defaultBrowserContext();
	context.overridePermissions(url, []);
	const [page] = await browser.pages();
	await page.setUserAgent(userAgent.replace("Headless", ""));
	await page.setDefaultNavigationTimeout(0);
	await page.setViewport({
		width: 1920,
		height: 1080
	});
	return page;
}
exports.makePage = makePage;

async function callMoodleFunction(name, args) {
	let url = moodleDomain + "/lib/ajax/service.php?sesskey=" + lastSesskey + "&info=" + name;
	const pData = [
        {
            "index": 0,
            "methodname": name,
            "args": args
        }
    ];
	const req = await axios.post(url, pData, {
		headers: {
			"Cookie": "MoodleSession=" + lastToken
		}
	});
	if (req.data[0].error) {
		if (req.data[0].exception.errorcode == "servicerequireslogin") {
			console.log("Not logged in. Loggin in with Google...");
			await googleLogin(moodleDomain + "/login", moodleDomain + "/my");
			return await callMoodleFunction(name, args);
		}
	}
	return req.data[0];
}
exports.callMoodleFunction = callMoodleFunction;

async function getPage(url) {
	//First, try to use existing token
	const req = await axios.get(moodleDomain + url, {
		headers: {
			"Cookie": "MoodleSession=" + lastToken
		}
	});
	const rUrl = req.request.res.responseUrl;
	if (rUrl.indexOf(moodleDomain + "/login") != -1) {
		console.log("Not logged in. Loggin in with google.");
		await googleLogin(moodleDomain + "/login", moodleDomain + "/my");
		return await getPage(url);
	} else {
		return req.data;
	}
}
exports.getPage = getPage;

async function downloadResource(id, destFolder) {
	const req = await axios.get(moodleDomain + "/mod/resource/view.php?id=" + id + "&redirect=1", {
		responseType: 'stream',
		headers: {
			"Cookie": "MoodleSession=" + lastToken
		}
	});
	const rUrl = req.request.res.responseUrl;
	if (rUrl.indexOf(moodleDomain + "/login") != -1) {
		writer.close();
		console.log("Not logged in. Loggin in with google.");
		await googleLogin(moodleDomain + "/login", moodleDomain + "/my");
		return await downloadResource(id, path);
	}
	const parts = rUrl.split("/");
	const path = destFolder + "/" + id + "_" + decodeURIComponent(parts[parts.length - 1].split("?")[0].replace(/([^a-z0-9.]+)/gi, '_'));
	await fs.promises.mkdir(destFolder, {recursive: true});
	const writer = fs.createWriteStream(path);
	return new Promise((resolve, reject) => {
		req.data.pipe(writer);
		let error = null;
		writer.on('error', err => {
			error = err;
			writer.close();
			reject(err);
		});
		writer.on('close', () => {
			if (!error) {
				resolve(path);
			}
		});
	});
}
exports.downloadResource = downloadResource;

async function getRealUrl(id) {
	const req = await axios.get(moodleDomain + "/mod/url/view.php?id=" + id + "&redirect=1", {
		responseType: 'stream',
		headers: {
			"Cookie": "MoodleSession=" + lastToken
		}
	});
	const rUrl = req.request.res.responseUrl;
	if (rUrl.indexOf(moodleDomain + "/login") != -1) {
		writer.close();
		console.log("Not logged in. Loggin in with google.");
		await googleLogin(moodleDomain + "/login", moodleDomain + "/my");
		return await getRealUrl(id);
	}
	return rUrl;
}
exports.getRealUrl = getRealUrl;

async function googleLogin(startUrl, endUrl) {
	let page = null;
	try {
		page = await makePage(startUrl);
		const browser = await page.browser();
		await page.goto(endUrl,
					{waitUntil: "load"});
		if (pageHasUrl(page, endUrl)) {
			let token = getCookieFromCookies(await page.cookies(startUrl), "MoodleSession");
			let sesskey = await page.evaluate(() => M.cfg.sesskey);
			console.log("Got sesskey " + sesskey);
			console.log("Got MoodleSession " + token);
			lastSesskey = sesskey;
			console.log("Moodle was logged in.");
			lastToken = token;
			await browser.close();
			return;
		}
		await page.waitForSelector(".btn.btn-secondary");
		await page.click(".btn.btn-secondary");
		if (pageHasUrl(page, endUrl)) {
			let token = getCookieFromCookies(await page.cookies(startUrl), "MoodleSession");
			let sesskey = await page.evaluate(() => M.cfg.sesskey);
			console.log("Got sesskey " + sesskey);
			console.log("Got MoodleSession " + token);
			lastSesskey = sesskey;
			console.log("Google was logged in.");
			lastToken = token;
			await browser.close();
			return;
		}
		await page.waitForSelector('input[type="email"]');
		await page.type('input[type="email"]', moodleUser);
		await page.keyboard.press("Enter");
		//await page.click("#identifierNext");
		await page.waitForSelector('input[type="password"]', {visible: true});
		await page.type('input[type="password"]', moodlePassword);
		//await page.waitForSelector("#passwordNext", {visible: true});
		//await page.click("#passwordNext");
		await page.keyboard.press("Enter");
		while (true) {
			await page.waitForNavigation({waitUntil: "networkidle0"})
			if (pageHasUrl(page, endUrl)) break;
		}
		let token = getCookieFromCookies(await page.cookies(startUrl), "MoodleSession");
		let sesskey = await page.evaluate(() => M.cfg.sesskey);
		console.log("Got sesskey " + sesskey);
		console.log("Got MoodleSession " + token);
		lastSesskey = sesskey;
		console.log("Google login success.");
		lastToken = token;
		browser.close();
	} catch (error) {
		savePageState(page, error);
		throw error;
	}
}
