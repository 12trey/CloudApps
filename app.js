const fs = require("fs");
const express = require("express");
const sslport = 4000;
const https = require("https");
const http = require("http");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
const OIDCStrategy = require("passport-azure-ad").OIDCStrategy;
const config = require("./privatedata/config.json");
const azureconfig = require("./privatedata/azure_authconfig.json");
// For Microsoft SQL Server
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;  
const TYPES = require('tedious').TYPES;

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
    //console.log(token);
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
    //console.log(this);
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

//const httpsServer = https.createServer(httpsOptions);
const httpServer = http.createServer();

//httpsServer.on("request", app);
httpServer.on("request", app);

/** /api/intuneapps
 * API method for intune apps
 */
app.get
(
    "/api/intuneapps", 
    passport.authenticate("oauth-bearer", { session: false }),
    ensureRoles(config.requiredGroups),
    async (req, res) => {
        //console.log(req);
        lastrequested = Date.now();
        if(lastupdate==null) {
            lastupdate = lastrequested;
        }
        let millisecondsSinceLastReq = (new Date(lastrequested)).getTime() - (new Date(lastupdate)).getTime();
        let minutessince = millisecondsSinceLastReq/1000/60;
        
        if(dataCache!=null && minutessince < 30) {
            console.log("Sending cached data");
            console.log(`Data age is ${millisecondsSinceLastReq/1000} seconds.`);
            //let sccmdata = await GetSccmApps();
            res.status(200).json({ status: "OK", data: dataCache, lastupdate: lastupdate });
        }
        else {
            console.log("Sending fresh data");
            getAccessToken()
            .then(async (token) => {
                if(token) {       
                    console.log("Got token for msgraph intune api");
                    console.log("**************************************");
                    console.log("Getting intune app data...");            
                    let data = await fetchIntuneData(token);
                    data.value.forEach(r=>{
                        r.source = "Intune";
                    });
                    let sccmdata = await GetSccmApps();
                    // sccmdata.forEach(r=>{
                    //     r.source = "SCCM";
                    // });                    
                    dataCache = JSON.parse(JSON.stringify(data));
                    dataCache.value = dataCache.value.concat(sccmdata);
                    //Object.assign(dataCache.value, sccmdata);
                    //console.log(data);
                    lastupdate = Date.now();
                    //startDataRefresher();
                    res.status(200).json({ status: "OK", data: dataCache, lastupdate: lastupdate });
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

// console.log("Starting up https server...");
// httpsServer.listen(sslport, ()=>{
//     console.log(`listening on port ${sslport}`);
// });

console.log("Starting up http server...");
httpServer.listen(sslport, ()=>{
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

async function GetSccmApps() {
    return new Promise((res, rej) => {    
        var sqlconfig = {  
            server: config.mssql.server,  //update me
            authentication: {
                type: 'default',
                options: {
                    userName: config.mssql.userName, //update me
                    password: config.mssql.password  //update me
                }
            },
            options: {
                // If you are on Microsoft Azure, you need encryption:
                encrypt: false,
                database: config.mssql.database,  //update me,
                rowCollectionOnDone: true
            }
        };  
        var connection = new Connection(sqlconfig);  
        connection.on('connect', function(err) {  
            // If no error, then good to proceed.
            //console.log("Connected");  
        });
        
        connection.connect(async (err)=>{
            if(!err){
                let apps = await executeAppSelect(); 
                apps.forEach(r=>{
                    r.source = "SCCM Application";
                }); 
                let packages = await executePackageSelect();     
                packages.forEach(r=>{
                    r.source = "SCCM Package";
                });   
                let allsccmdata = apps.concat(packages);
                res(allsccmdata);        
            }
        });

        // SELECT DATA
        async function executeAppSelect() {  
            return new Promise((res, rej) => {            
                request = new Request(
                    `SELECT * FROM (
                        SELECT 
                            ROW_NUMBER() OVER(PARTITION BY app.[DisplayName] ORDER BY config.[DateLastModified] DESC) as rownum
                            ,app.[DisplayName] as displayName
                            ,itempath = CASE
                                WHEN folders.ObjectPath IS NULL THEN '/'
                                ELSE folders.ObjectPath
                                END
                            ,config.[DateCreated] as createdDateTime
                            ,config.[DateLastModified] as lastModifiedDateTime
                            ,config.[LastModifiedBy]
                            ,app.[AdminComments]
                            ,app.[Manufacturer] as publisher
                            ,app.[SoftwareVersion]	  
                        FROM [CM_IND].[dbo].[v_Applications] as app
                        LEFT OUTER JOIN [CM_IND].[dbo].[v_ConfigurationItems] as config on app.[ModelName] = config.[ModelName]
                        LEFT OUTER JOIN [CM_IND].[dbo].[vFolderMembers] folders ON app.[ModelName] = folders.[InstanceKey] 
                        ) partitionedTable
                        WHERE rownum = 1
                        order by itempath, displayName, rownum`,
                    function(err) {  
                        if (err) {  
                            console.log(err);
                        }  
                    }
                );  

                var result = "";  
                var alldata = [];
                request.on('row', function(columns) {  
                    let dataObject = {
                        rownum: '',             //0
                        displayName: '',        //1
                        itempath: '',           //2
                        createdDateTime: '',        //3
                        lastModifiedDateTime: '',   //4
                        LastModifiedBy: '',     //5
                        AdminComments: '',      //6
                        publisher: '',       //7
                        SoftwareVersion: ''     //8
                    };
                    let colIndex = 0;
                    columns.forEach(function(column) {
                        dataObject[column.metadata.colName] = column.value;
                        colIndex++;
                    });
                    alldata.push(dataObject);  
                });  
        
                request.on('done', function(rowCount, more) {  
                    //console.log(alldata);
                    //console.log(rowCount + ' rows returned');  
                });  

                request.on('requestCompleted', function () {
                    res(alldata);
                    //console.dir(alldata);
                    //console.log(rowCount + ' rows returned');  
                });

                request.on('error', function (err) {
                    rej(err);                
                });

                connection.execSql(request);  
            });
        }  

        async function executePackageSelect() {  
            return new Promise((res, rej) => {  
                request = new Request(
                    `SELECT [PkgID]
                    ,[Name] as displayName
                    ,[Version] as SoftwareVersion
                    ,[Language]
                    ,[Manufacturer] as publisher
                    ,[PreDownloadRule]
                    ,[DriverManufacturer]
                    ,[DriverModel]
                    ,[DriverOSVersion]
                    ,[BaseBoardProductID]
                    ,[DriverPkgVersion]
                    ,[Description] as description
                    ,[Source]
                    ,[SourceSite]
                    ,[StoredPkgPath]
                    ,[RefreshSchedule]
                    ,[LastRefresh] as lastModifiedDateTime
                    ,[ShareName]
                    ,[PreferredAddress]
                    ,[StoredPkgVersion]
                    ,[StorePkgFlag]
                    ,[ShareType]
                    ,[Permission]
                    ,[UseForcedDisconnect]
                    ,[ForcedRetryDelay]
                    ,[DisconnectDelay]
                    ,[IgnoreSchedule]
                    ,[Priority]
                    ,[PkgFlags]
                    ,[MIFFilename]
                    ,[MIFPublisher]
                    ,[MIFName]
                    ,[MIFVersion]
                    ,[SourceVersion]
                    ,[SourceDate] as createdDateTime
                    ,[SourceSize] as size
                    ,[SourceCompSize]
                    ,[UpdateMask]
                    ,[Action]
                    ,[Icon]
                    ,[Hash]
                    ,[ExtData]
                    ,[ImageFlags]
                    ,[UpdateMaskEx]
                    ,[ISVData]
                    ,[HashVersion]
                    ,[NewHash]
                    ,[ImagePath]
                    ,[Architecture]
                    ,[PackageType]
                    ,[AlternateContentProviders]
                    ,[DefaultImage]
                    ,[SourceLocaleID]
                    ,[SEDOComponentID]
                    ,[TransformReadiness]
                    ,[TransformAnalysisDate]
                    ,[SedoObjectVersion]
                    ,[EncryptionKey]
                    ,[EncryptionAlgorithm]
                    ,[CryptoExtInfo]
                    ,[rowversion]
                    ,[MinRequiredVersion]
                    ,[ISVString]
                    ,[NumOfPrograms]
                    ,[IsVersionCompatible]
                    ,[IsPredefinedPackage]
                    ,[ObjectPath] as itempath
                FROM [CM_IND].[dbo].[vSMS_Package_List]
                ORDER BY Name`,
                    function(err) {  
                        if (err) {  
                            console.log(err);
                        }  
                    }
                );  

                var result = "";  
                var alldata = [];
                request.on('row', function(columns) {  
                    let dataObject = {
                        rownum: '',             //0
                        displayName: '',        //1
                        itempath: '',           //2
                        createdDateTime: '',        //3
                        lastModifiedDateTime: '',   //4
                        LastModifiedBy: '',     //5
                        AdminComments: '',      //6
                        publisher: '',       //7
                        SoftwareVersion: ''     //8
                    };
                    let colIndex = 0;
                    columns.forEach(function(column) {
                        dataObject[column.metadata.colName] = column.value;
                        colIndex++;
                    });
                    alldata.push(dataObject);  
                });  
        
                request.on('done', function(rowCount, more) {  
                    //console.log(alldata);
                    //console.log(rowCount + ' rows returned');  
                });  

                request.on('requestCompleted', function () {
                    res(alldata);                
                    connection.close();
                    //console.dir(alldata);
                    //console.log(rowCount + ' rows returned');  
                });

                request.on('error', function (err) {
                    rej(err);                
                });

                connection.execSql(request);    
            });
        } 

        // INSERT DATA
        function executeInsert() {  
            request = new Request("INSERT SalesLT.Product (Name, ProductNumber, StandardCost, ListPrice, SellStartDate) OUTPUT INSERTED.ProductID VALUES (@Name, @Number, @Cost, @Price, CURRENT_TIMESTAMP);", function(err) {  
            if (err) {  
                console.log(err);}  
            });  
            request.addParameter('Name', TYPES.NVarChar,'SQL Server Express 2014');  
            request.addParameter('Number', TYPES.NVarChar , 'SQLEXPRESS2014');  
            request.addParameter('Cost', TYPES.Int, 11);  
            request.addParameter('Price', TYPES.Int,11);  
            request.on('row', function(columns) {  
                columns.forEach(function(column) {  
                if (column.value === null) {  
                    console.log('NULL');  
                } else {  
                    console.log("Product id of inserted item is " + column.value);  
                }  
                });  
            });       
            connection.execSql(request);  
        } 
    });
}