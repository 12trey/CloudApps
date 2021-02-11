# CloudApps

CloudApps provides access to Microsoft InTune and SCCM data.

# Configuration
You will need to create ./privatedata subdirectory and ./privatedata/cert

## ./privatedata/cert
 Add cert.pem and key.pem for SSL

## ./privatedata/config.json

format of config.json

<pre>
{
    "credentials": {
        "tenantID": "<your tenant ID>",
        "clientID": "<the client ID of the api app registration - NOT the spa>",
        "audience": "<the client ID of the api app registration - NOT the spa>",
        "spaclientid": "<the client ID of the SPA app registration>"
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
        "validateIssuer": true,
        "passReqToCallback": false,
        "loggingLevel": "info",
        "piiLoggingEnabled": false,
        "responseType": "code",
        "responseMode": "form_post",
        "redirectUrl": "https://localhost:4000",
        "homeUrl": "https://localhost:4000"
    }
}
</pre>

format of azure_authconfig.json

<pre>
{
    "clientoptions": {
        "tenant": "<your tenant ID>",
        "clientid": "<the client ID of the api app registration - NOT the spa>",
        "clientsecret": "<Secret for api - this is required for intune access with app creds rather than delegated>"
    }
}
</pre>