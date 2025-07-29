import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// Utility to parse cookies
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = value;
    return cookies;
  }, {});
};

let org;
let salesforceLoginDomain;
export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const uri = request.uri;
  const cookies = parseCookies(headers.cookie ? headers.cookie[0].value : '');
  const querystring = request.querystring;
  const params = new URLSearchParams(querystring);
  
  // Get org param: 'production' or 'sandbox' from query string (for /auth/login) or state (for /auth/callback)
  if (uri === '/auth/login') {
    let orgParam = params.get('org') || org; // From query string in initial request
    org = decodeURIComponent(orgParam);
    if (org === 'production') {
      salesforceLoginDomain = 'login.salesforce.com';
    } else if (org === 'sandbox') {
      salesforceLoginDomain = 'test.salesforce.com';
    } else if (org.endsWith('.my.salesforce.com')) {
      salesforceLoginDomain = org; // Remove 'https://'
    }
  }
  
  // Use Salesforce login endpoint based on org

  // Fetch Salesforce client credentials once
  let client_id, client_secret;
  try {
    const secret = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: 'SalesforceConnectedApp' })
    );
    const secretData = JSON.parse(secret.SecretString);
    client_id = secretData.client_id;
    client_secret = secretData.client_secret;
  } catch (error) {
    console.error('Error fetching Salesforce credentials:', error);
    return {
      status: '500',
      statusDescription: 'Internal Server Error',
      body: JSON.stringify({ error: 'Failed to fetch Salesforce credentials' }),
    };
  }

  // IMPORTANT: redirect_uri must match exactly what is set in Connected App and Lambda URL
  const redirect_uri = 'https://d2bri1qui9cr5s.cloudfront.net/auth/callback';

  // 1. Handle OAuth callback
  if (uri === '/auth/callback') {
    const code = params.get('code');

    const error = params.get('error');
    const error_description = params.get('error_description');

    if (error) {
      // User denied access or some other error occurred
      return {
        status: '200',
        statusDescription: 'OK',
        headers: {
          'content-type': [{
            key: 'Content-Type',
            value: 'text/html',
          }],
        },
        body: `
          <html>
            <head><title>OAuth Error</title></head>
            <body>
              <script>
                // Notify parent window of OAuth failure
                window.opener?.postMessage(
                  {
                    type: 'login_error',
                    error: ${JSON.stringify(error)},
                    description: ${JSON.stringify(error_description)}
                  },
                  'https://d2bri1qui9cr5s.cloudfront.net'
                );
                window.close();
              </script>
            </body>
          </html>
        `,
      };
    }

    if (!code) {
      return {
        status: '400',
        statusDescription: 'Bad Request',
        body: 'Missing authorization code',
      };
    }

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id,
      client_secret,
      redirect_uri,
    });

    let access_token, refresh_token, instance_url;
    try {
      const tokenRes = await fetch(`https://${salesforceLoginDomain}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        return {
          status: '500',
          statusDescription: 'Internal Server Error',
          body: JSON.stringify({ error: errorData.error_description || 'Token exchange failed' }),
        };
      }

      const tokenData = await tokenRes.json();
      access_token = tokenData.access_token;
      refresh_token = tokenData.refresh_token;
      instance_url = tokenData.instance_url;
    } catch (error) {
      console.error('Error exchanging authorization code for token:', error);
      return {
        status: '500',
        statusDescription: 'Internal Server Error',
        body: JSON.stringify({ error: 'Token exchange failed' }),
      };
    }

    // Fetch userId dynamically using the access token
    let userId;
    let user_name;
    let user_email;
    let user_preferred_username;
    let user_zoneinfo;
    let user_locale;
    let user_language;
    try {
      const userInfoRes = await fetch(`https://${salesforceLoginDomain}/services/oauth2/userinfo`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userInfoRes.ok) {
        const errorData = await userInfoRes.json();
        throw new Error(errorData.error_description || 'Failed to fetch user info');
      }
      const userInfo = await userInfoRes.json();
      userId = userInfo.user_id;
      user_name = userInfo.name;
      user_email = userInfo.email;
      user_preferred_username = userInfo.preferred_username;
      user_zoneinfo = userInfo.zoneinfo;
      user_locale = userInfo.locale;
      user_language = userInfo.language;
      if (!userId) {
        throw new Error('User ID not found in userinfo response');
      }
      
      console.log('Fetched userId:', userId);
    } catch (error) {
      console.error('Error fetching user info:', error);
      return {
        status: '500',
        statusDescription: 'Internal Server Error',
        body: JSON.stringify({ error: 'Failed to fetch user ID' }),
      };
    }

    // Redirect to the storeMetadata Lambda Function URL
    const storeMetadataUrl = new URL('https://vm6pandneg.execute-api.us-east-1.amazonaws.com/exchange/');
    storeMetadataUrl.searchParams.append('access_token', access_token);
    storeMetadataUrl.searchParams.append('refresh_token', refresh_token);
    storeMetadataUrl.searchParams.append('instance_url', instance_url);
    storeMetadataUrl.searchParams.append('userId', userId);
    storeMetadataUrl.searchParams.append('org', org);
    storeMetadataUrl.searchParams.append('user_name', user_name);
    storeMetadataUrl.searchParams.append('user_email', user_email);
    storeMetadataUrl.searchParams.append('user_preferred_username', user_preferred_username);
    storeMetadataUrl.searchParams.append('user_zoneinfo', user_zoneinfo);
    storeMetadataUrl.searchParams.append('user_locale', user_locale);
    storeMetadataUrl.searchParams.append('user_language', user_language);

    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        'content-type': [{
          key: 'Content-Type',
          value: 'text/html',
        }],
        location: [{
          key: 'Location',
          value: storeMetadataUrl.toString(),
        }],
        'set-cookie': [{
          key: 'Set-Cookie',
          value: `access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        }],
      },
      body: `
      <html>
        <head><title>Authenticated</title></head>
        <body>
          <script>
            // Notify parent window of success and send the token
            window.opener?.postMessage(
              { type: 'login_success' , userId: ${userId}, instanceUrl: ${instance_url}},
              'https://d2bri1qui9cr5s.cloudfront.net'
            );
            window.close();
          </script>
        </body>
      </html>
      `,
    };
  }

  // 2. If access_token cookie exists, allow the request
  // if (cookies.access_token) {
  //   return request;
  // }

  // 3. Redirect to Salesforce login OAuth URL
  const authUrl = `https://${salesforceLoginDomain}/services/oauth2/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=api%20refresh_token%20openid&state=${encodeURIComponent(org)}`;

  return {
    status: '302',
    statusDescription: 'Found',
    headers: {
      location: [{
        key: 'Location',
        value: authUrl,
      }],
    },
  };
};