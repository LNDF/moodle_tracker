const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const stelth = require("puppeteer-extra-plugin-stealth")();
const fs = require("fs");
const {resolve} = require("path");

let lastToken = "";

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
	const puppeteerSettings = {headless: false,
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

async function getPage(url) {
	//First, try to use existing token
	const req = await axios.get(url, {
		headers: {
			"Cookie": "MoodleSession=" + lastToken
		}
	});
	const rUrl = req.request.res.responseUrl;
	if (rUrl.indexOf(moodleDomain + "/login") != -1) {
		console.log("Not logged in. Loggin in with google.");
		await googleLogin(moodleDomain + "/login", moodleDomain + "/my");
		const req2 = await axios.get(url, {
			headers: {
				"Cookie": "MoodleSession=" + lastToken
			}
		});
		return req2.data;
	} else {
		const cookies = req.headers['set-cookie'];
		if (typeof cookies != "undefined" && cookies.length > 0) {
			const cookie = cookies[0];
			const token = cookie.substring(cookie.indexOf("=") + 1, cookie.indexOf(";"));
			console.log("Token changed " + lastToken + " -> " + token);
			lastToken = token;
		}
		return req.data;
	}
	return lastToken;
}

async function googleLogin(startUrl, endUrl) {
    const page = await makePage(startUrl);
	const browser = await page.browser();
	await page.goto(endUrl,
				{waitUntil: "load"});
	if (pageHasUrl(page, endUrl)) {
		let token = getCookieFromCookies(await page.cookies(startUrl), "MoodleSession");
		lastToken = token;
		await browser.close();
		return;
	}
	await page.waitForSelector(".btn.btn-secondary");
	await page.click(".btn.btn-secondary");
	if (pageHasUrl(page, endUrl)) {
		let token = getCookieFromCookies(await page.cookies(startUrl), "MoodleSession");
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
	console.log("Google login success. Token changed from " + lastToken + " -> " + token);
	lastToken = token;
	browser.close();
}
exports.getPage = getPage;