const fs = require("fs");
const express = require("express");
const sslport = 4000;
const https = require("https");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { access } = require("fs/promises");
const { resolve } = require("path");
const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
const OIDCStrategy = require("passport-azure-ad").OIDCStrategy;
const config = require("./privatedata/config.json");
const azureconfig = require("./privatedata/azure_authconfig.json");
const { start } = require("repl");

//const cookieParser = require("cookie-parser");

const beareroptions = {
    identityMetadata: `https://${config.metadata.authority}/${config.credentials.tenantID}/${config.metadata.version}/${config.metadata.discovery}`,
    clientID: config.credentials.clientID,
    audience: config.credentials.audience,
    //clientSecret: config.credentials.clientsecret,
    validateIssuer: true,
    passReqToCallback: config.settings.passReqToCallback,
    loggingLevel: config.settings.loggingLevel,
    loggingNoPII: config.settings.piiLoggingEnabled,
    //scope: config.resource.scope,
};

const bearerStrategy = new BearerStrategy(beareroptions, (token, done) => {
    // Send user info using the second argument
    console.log(token);
    done(null, {}, token);
});

// This is a factory function and generates a new role checking function
// per every possible role name. Add this AFTER passport in the express
// callback chain
function ensureRoles(requiredRoles) {
    // Just a debug function so I can look at the properties of this object.
    // I add named functions to this object that represent every possible
    // role we want to check for.
    function countfunc() {
      return ensureRoles;
    }
  
    // Generate the role checking functions - this happens only once per role name
    // and is case-sensitive
    for (let i in requiredRoles) {
      if (ensureRoles[requiredRoles[i]]) {
        // No need to generate another middleware function for this role.
        //console.log("requiredRoles function exist for: " + requiredRoles[i]);
      } else {
        // Generate middleware functions to check each role.
        // Add a named function to the array for this role
        // if it does not already exist.
        ensureRoles[requiredRoles[i]] = function (req, res, next) {
          // test lets me examine ensureRoles to ensure the functions are created only once
          var test = countfunc();
          let hasaRole = false;
          let roles = req.authInfo.groups;
          //console.log(roles);
          if (roles) {
            for (let i in requiredRoles) {
              let rolename = requiredRoles[i];
              let idx = roles.indexOf(rolename);
              if (idx > -1) {
                hasaRole = true;
              }
            }
            if (hasaRole) {
              next();
            } else {
              res.sendStatus(401);
            }
          }
        };
      }
    }
  
    //
    // Create an array of middleware functions
    // for this particular call. Express get can accept array of callbacks.
    // So we're taking advantage of that.
    // Note: requiredRoles closure is created when express generates the middlewares
    //
    var returnfuncs = [];
    for (let i in requiredRoles) {
      // Add the role-check callback for this role
      returnfuncs.push(ensureRoles[requiredRoles[i]]);
    }
    return returnfuncs;
  }

// const oidcoptions = {
//   identityMetadata: `https://${config.metadata.authority}/${config.credentials.tenantID}/${config.metadata.version}/${config.metadata.discovery}`,
//   issuer: `https://${config.metadata.authority}/${config.credentials.tenantID}/${config.metadata.version}`,
//   clientID: config.credentials.clientID,
//   audience: config.credentials.oidcaudience,
//   clientSecret: config.credentials.clientsecret,
//   validateIssuer: config.settings.validateIssuer,
//   passReqToCallback: config.settings.passReqToCallback,
//   loggingLevel: config.settings.loggingLevel,
//   scope: config.resource.oidcscope,
//   responseType: config.settings.responseType,
//   responseMode: config.settings.responseMode,
//   redirectUrl: config.settings.redirectUrl,
//   nonceLifetime: 600,  // state/nonce cookie expiration in seconds
//   nonceMaxAmount: 5,   // max amount of state/nonce cookie you want to keep (cookie is deleted after validation so this can be very small)
//   useCookieInsteadOfSession : true,
//   cookieEncryptionKeys: [ { key: '12345678901234567890123456789012', 'iv': '123456789012' }]
// };

// This is how to define the OIDC strategy
// const oidcStrategy = new OIDCStrategy(
//   oidcoptions,
//   function (req, iss, sub, profile, accessToken, refreshToken, done) {
//     if (!profile.oid) {
//       return done(new Error("No oid found"), null);
//     }
//     console.log(profile);
//     //req.user = profile._json.preferred_username;
//     //req.session.user = req.user;
//     //req.session.save();
//     return done(null, profile);
//     // asynchronous verification, for effect...
//     // process.nextTick(function () {
//     //   findByOid(profile.oid, function (err, user) {
//     //     if (err) {
//     //       return done(err);
//     //     }
//     //     if (!user) {
//     //       // "Auto-registration"
//     //       users.push(profile);
//     //       return done(null, profile);
//     //     }
//     //     return done(null, user);
//     //   });
//     // });
//   }
// );

passport.serializeUser(function(user, done) {
  done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
  //findByOid(oid, function (err, user) {
    console.log(this);
    done(null, "test");
  //});
});

app.use(passport.initialize());
passport.use(bearerStrategy);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

const httpsOptions = {
    key: fs.readFileSync("privatedata/cert/key.pem"),
    cert: fs.readFileSync("privatedata/cert/cert.pem"),
};

const httpsServer = https.createServer(httpsOptions);

httpsServer.on("request", app);

/** /api/intuneapps
 * API method for intune apps
 */
app.get
(
    "/api/intuneapps", 
    passport.authenticate("oauth-bearer", { session: false }),
    ensureRoles(config.requiredGroups),
    async (req, res) => {
        console.log(req);
        lastrequested = Date.now();
        if(lastupdate==null) {
            lastupdate = lastrequested;
        }
        let millisecondsSinceLastReq = (new Date(lastrequested)).getTime() - (new Date(lastupdate)).getTime();
        let minutessince = millisecondsSinceLastReq/1000/60;
        
        if(dataCache!=null && minutessince < 30) {
            console.log("Sending cached data");
            console.log(`Data age is ${millisecondsSinceLastReq/1000} seconds.`);
            res.status(200).json({ status: "OK", data: dataCache, lastupdate: lastupdate });
        }
        else {
            console.log("Sending fresh data");
            getAccessToken()
            .then(async (token) => {
                if(token) {       
                    console.log("Got token");
                    console.log("**************************************");
                    console.log("Getting intune app data...");            
                    let data = await fetchIntuneData(token);
                    dataCache = data;
                    console.log(data);
                    lastupdate = Date.now();
                    //startDataRefresher();
                    res.status(200).json({ status: "OK", data: data, lastupdate: lastupdate });
                }
            })
            .catch(err => {
                console.log(err);
                res.status(200).json({ status: "Error" });
            });
        }
    }
);

var lastrequested = null;
var dataCache = null;
var lastupdate = null;
var refreshTimer = null;
var refreshInterval = 60000;
var refreshCount = 0;
function startDataRefresher() {
    if(refreshTimer!=null) clearInterval(refreshTimer);
    console.log("Starting data refresh interval.");
    refreshTimer = setInterval(()=>{
        console.log(`lastupdate: ${lastupdate}, lastrequested: ${lastrequested}`);
        let millisecondsSinceLastReq = (new Date(lastupdate)).getTime() - (new Date(lastrequested)).getTime();
        let minutessince = millisecondsSinceLastReq/1000/60;
        console.log(`Data has not been requested for ${millisecondsSinceLastReq/1000} seconds`);
        if(minutessince>5) {
            console.log("Kiling refresh timer due to lack of activity");
            clearInterval(refreshTimer);
            lastrequested = null;
            dataCache = null;
            lastupdate = null;
            refreshTimer = null;
            refreshCount = 0;
        }
        console.log("Refreshing data...");
        getAccessToken()
        .then((token) => {
            if(token) {       
                console.log("Got token");
                console.log("**************************************");
                console.log("Getting intune app data...");            
                fetchIntuneData(token)
                    .then(data=>{
                        refreshCount++;
                        dataCache = data;
                        lastupdate = Date.now();                        
                    })
                    .catch(error=>{
                        console.log("Error refreshing intune application data.");
                        clearInterval(refreshTimer);
                        refreshTimer = null;
                    });
                
            }
        })
        .catch(err => {
            console.log(err);
            res.status(200).json({ status: "Error" });
        });
    }, refreshInterval);    
}

/** Angular static files */
app.use(express.static("./ClientApp/dist/ClientApp"));

/** Root path to serve Angular index */
app.get
('/*', (req, res) => {
    res.sendFile("./ClientApp/dist/ClientApp/index.html");
});

console.log("Starting up https server...");
httpsServer.listen(sslport, ()=>{
    console.log(`listening on port ${sslport}`);
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