# CloudApps

CloudApps provides access to Microsoft InTune and SCCM data.

# Configuration
You will need to create ./privatedata subdirectory and ./privatedata/cert

## ./privatedata/cert
 Add cert.pem and key.pem for SSL

## ./privatedata/config.json

The format of config.json

<pre>
{
    "credentials": {
        "tenantID": "* your tenant ID *",
        "clientID": "* the client ID of the api app registration - NOT the spa *",
        "audience": "* the client ID of the api app registration - NOT the spa *",
        "spaclientid": "* the client ID of the SPA app registration *"
    },
    "resource": {
        "scope": ["apiaccess"] <-- NOTE: set this appopriately to whatever you named the api endpoint
    },
    "requiredGroups": [ "group1", "group2", "..." ],
    "metadata": {
        "authority": "login.microsoftonline.com",
        "discovery": ".well-known/openid-configuration",
        "version": "v2.0"
    },
    "settings": {
        "validateIssuer": true, <-- This value is hard-coded in our app.js. We can change that and use this setting instead.
        "passReqToCallback": false,
        "loggingLevel": "info",
        "piiLoggingEnabled": false,
        "responseType": "code", <-- This is not being used currently with JWT bearer tokens
        "responseMode": "form_post", <-- This is not being used currently with JWT bearer tokens
        "redirectUrl": "https://localhost:4000", <-- This is not being used currently with JWT bearer tokens
        "homeUrl": "https://localhost:4000" <-- This is not being used currently with JWT bearer tokens
    },
    "mssql": {
        "server": "* the server address/hostname of the SCCM database *",
        "database": "* SCCM database name *",
        "userName": "* sql username *",
        "password": "* sql password *"
    }
}
</pre>

## ./privatedata/azure_authconfig.json

Although we can also use delegated permission to access the intune api, I went with application permissions to support users without direct permission to this data, and so I can keep a running cache refresher (refresher is currently disabled).

The format of azure_authconfig.json

<pre>
{
    "clientoptions": {
        "tenant": "* your tenant ID *",
        "clientid": "* the client ID of the api app registration - NOT the spa *",
        "clientsecret": "* Secret for api - this is required for intune access with app creds rather than delegated *"
    }
}
</pre>