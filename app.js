const fs = require("fs");
const express = require("express");
const sslport = 4000;
const https = require("https");
const app = express();
const bodyParser = require("body-parser");
const { access } = require("fs/promises");
const { resolve } = require("path");

const azureconfig = require("./privatedata/azure_authconfig.json");
//const cookieParser = require("cookie-parser");

const httpsOptions = {
    key: fs.readFileSync("privatedata/cert/key.pem"),
    cert: fs.readFileSync("privatedata/cert/cert.pem"),
};

const httpsServer = https.createServer(httpsOptions);

httpsServer.on("request", app);

console.log("Starting up https server...");
httpsServer.listen(sslport, ()=>{
    console.log(`listening on port ${sslport}`);
});

app.get("/api/intuneapps", async (req, res) => {
    getAccessToken()
    .then(async (token) => {
        if(token) {       
            console.log("Got token");
            console.log("**************************************");
            console.log("Getting intune app data...");            
            let data = await fetchIntuneData(token);
            console.log(data);
            res.status(200).json({ status: "OK", data: data });
        }
     })
    .catch(err => {
        console.log(err);
        res.status(200).json({ status: "Error" });
    });
});


async function getAccessToken() {
    let tokenpromise = new Promise((resolve, reject) => {        
        const oauthreqdata = `client_id=${azureconfig.clientoptions.clientid}&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=${azureconfig.clientoptions.clientsecret}&grant_type=client_credentials`;
        const oauthcodereq = {
            host: "login.microsoftonline.com",
            path: `/${azureconfig.clientoptions.tenant}/oauth2/v2.0/token`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(oauthreqdata),
            },
        };
        
        let oauth_callback = function (response) {
            var str = "";

            //another chunk of data has been received, so append it to `str`
            response.on("data", function (chunk) {
                str += chunk;
            });

            //the whole response has been received, so we just print it out here
            response.on("end", function () {
                let jsondata = JSON.parse(str);
                if (jsondata.hasOwnProperty("token_type")) {
                    if (jsondata.token_type == "Bearer") {
                        let accessToken = jsondata.access_token;
                        resolve(accessToken);
                    }
                } else {
                    console.error("Could not get access token");
                    reject({status: "Could not get access token"});
                }
            });
        };

        var oauthtokereq = https.request(oauthcodereq, oauth_callback);
        oauthtokereq.write(oauthreqdata);
        oauthtokereq.end();
    });
        
    return tokenpromise;
}

async function fetchIntuneData(accessToken) {
    return new Promise((resolve, reject) => {
        let intune_callback = function (response) {
            var str = "";

            //another chunk of data has been received, so append it to `str`
            response.on("data", function (chunk) {
                str += chunk;
            });

            //the whole response has been received, so we just print it out here
            response.on("end", function () {
                let jsondata = JSON.parse(str);
                resolve(jsondata);
            });
        };

        let intunereqdata = "";

        let intunereqoptions = {
            host: "graph.microsoft.com",
            path: "/v1.0/deviceAppManagement/mobileApps",
            method: "GET",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(intunereqdata),
                Authorization: `Bearer ${accessToken}`,
            },
        };

        var intunereq = https.request(intunereqoptions, intune_callback);
        intunereq.write(intunereqdata);
        intunereq.end();
    });
}