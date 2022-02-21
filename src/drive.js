const { google } = require("googleapis");
const mime = require("mime-types");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let credentialsPath = "";
let driveDir = "";

function configDrive(credentialsPathP, driveDirP) {
    credentialsPath = credentialsPathP;
    driveDir = driveDirP;
}
exports.configDrive = configDrive;

function authorizeOAuth() {
    return new Promise((resolve, reject) => {
        fs.readFile(credentialsPath, (err, credentials) => {
            if (err) {
                console.log("No credentials where found. To get Google Drive credentials go to https://developers.google.com/drive/api/v3/quickstart/nodejs and follow the instructions there. Then place the JSON file at " + credentialsPath);
                reject(err);
            } else {
                credentials = JSON.parse(credentials);
                const {client_secret, client_id, redirect_uris} = credentials.installed;
                const oAuthClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
                fs.readFile("drivetoken.json", (err, token) => {
                    if (err) {
                        getAccessToken(oAuthClient).then(resolve).catch(reject);
                    } else {
                        oAuthClient.setCredentials(JSON.parse(token));
                        oAuthClient.refreshAccessToken((err, token) => {
                            if (err) {
                                reject(err);
                            } else {
                                fs.writeFile("drivetoken.json", JSON.stringify(token), (err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(oAuthClient);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}

function getAccessToken(oAuthClient) {
    return new Promise((resolve, reject) => {
    const url = oAuthClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log("First time Google Drive token setup:");
        console.log("Go to the following URL and authorize this app: " + url);
        console.log("Don't forget to enable the Google Drive API here: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=" + oAuthClient._clientId.split("-")[0]);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuthClient.getToken(code, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    oAuthClient.setCredentials(token);
                    fs.writeFile("drivetoken.json", JSON.stringify(token), (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log("Configuration complete.");
                            resolve(oAuthClient);
                        }
                    });
                }
            });
        });
    });
}

function uploadAndShare(file) {
    return new Promise((resolve, reject) => {
        authorizeOAuth().then(auth => {
            const name = path.basename(file);
            const stream = fs.createReadStream(file);
            const drive = google.drive({version: "v3", auth});
            const fileMetadata = {
                "name": name
            };
            if (driveDir != "") {
                fileMetadata.parents = [driveDir];
            }
            const media = {
                mimeType: mime.lookup(name) || "application/octet-stream",
                body: stream
            };
            drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: "id"
            }, (err, file) => {
                stream.close();
                if (err) {
                    reject(err);
                } else {
                    drive.permissions.create({fileId: file.data.id, resource: {role: "reader", type: "anyone"}}, (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve("https://drive.google.com/file/d/" + file.data.id + "/view?usp=sharing");
                        }
                    });
                }
            });
        }).catch(reject);
    });
}
exports.uploadAndShare = uploadAndShare;

async function test() {
    const auth = await authorizeOAuth();
}
exports.test = test;