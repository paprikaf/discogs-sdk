const axios = require('axios');
const express = require('express');
const qs = require('qs');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Serve the static HTML file from the example folder
app.use(express.static('example'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const prompt = require("prompt-sync")({ sigint: true });
require('dotenv').config()
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
let oauthRequestTokenSecret;
let accessToken
let accessTokenSecret

/**
 * Performs the OAuth1 request for obtaining the request token.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @returns {Promise<string>} - A promise that resolves with the request token.
 */
async function getRequestToken(consumerKey, consumerSecret) {
  const url = 'https://api.discogs.com/oauth/request_token';
  const timestamp = Date.now();
  const data = qs.stringify({
    'oauth_callback': 'http://localhost:3000/callback', // TODO: Change this to your callback URL
    'oauth_consumer_key': consumerKey,
    'oauth_nonce': timestamp,
    'oauth_signature_method': 'PLAINTEXT',
    'oauth_timestamp': timestamp,
    'oauth_version': '1.0',
  });

  const config = {
    method: 'post',
    url: url,
    headers: { //TODO: Functionize this
        'Authorization': `OAuth oauth_consumer_key="${consumerKey}",oauth_signature_method="PLAINTEXT", oauth_timestamp="${timestamp}", oauth_nonce=${timestamp}, oauth_version="1.0", oauth_signature="${consumerSecret}&"`,
    },
    data: data
  };

  try {
    const response = await axios(config);
    // console.log('config', config);
    const searchParams = new URLSearchParams(response.data);
    // console.log('searchParmas', searchParams);
    oauthRequestTokenSecret = searchParams.get('oauth_token_secret');

    return {
      oauthRequestToken: searchParams.get('oauth_token'),
      oauthRequestTokenSecret: searchParams.get('oauth_token_secret'),
      verificationURL: `https://www.discogs.com/oauth/authorize?oauth_token=${searchParams.get('oauth_token')}`
    };
  } catch (error) {
    throw new Error(error.response.data);
  }
}

// Proxy function to make the API request
async function proxyRequestToken(req, res) {
  try {
        if (consumerKey === undefined || consumerSecret === undefined) {
          throw new Error("Consumer Key/Secret not found in .env file!")
        }
    const { oauthRequestToken, oauthRequestTokenSecret, verificationURL } = await getRequestToken(consumerKey, consumerSecret);
    // Send the response back to the client
    res.json({
      oauthRequestToken,
      oauthRequestTokenSecret,
      verificationURL
    });
  } catch (error) {
    // Handle errors and send an error response
    res.status(500).json({ error: 'An error occurred while fetching the request token.' });
  }
}

// Route handler for the proxy request
app.get('/oauth/request-token', proxyRequestToken);
/**
 * Performs the OAuth1 request for obtaining the access token.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @param {string} oauthToken - The OAuth access token.
 * @param {string} oauthVerifier - The OAuth verifier.
 * @param {string} tokenSecret - The OAuth request token secret.
 * @returns {Promise<Object>} - A promise that resolves with the access token object.
 */
async function getAccessToken(consumerKey, consumerSecret, oauthToken, oauthVerifier, tokenSecret) {
  const config = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `OAuth oauth_consumer_key="${consumerKey}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Date.now()}", oauth_nonce="${Date.now()}", oauth_version="1.0", oauth_token="${oauthToken}", oauth_verifier="${oauthVerifier}", oauth_signature="${consumerSecret}&${tokenSecret}"`,
      'User-Agent': 'YOUR_USER_AGENT/1.0'
    },
    url: 'https://api.discogs.com/oauth/access_token',
  };

  try {
    const response = await axios.request(config);
    const oauthToken = response.data.split('&')[0].split('=')[1];
    const searchParams = new URLSearchParams(response.data);

    return {
      oauthAccessToken: searchParams.get('oauth_token'),
      oauthAccessTokenSecret: searchParams.get('oauth_token_secret'),
    };
  } catch (error) {
    throw new Error(error.response.data);
  }
}

app.get('/callback', async (req, res) => {
  // Extract the OAuth token and verifier from the query parameters
  const { oauth_token, oauth_verifier } = req.query;

  try {
    // Call the function to exchange the request token and verifier for an access token
    const { oauthAccessToken, oauthAccessTokenSecret } = await getAccessToken(
      consumerKey,
      consumerSecret,
      oauth_token,
      oauth_verifier,
      oauthRequestTokenSecret
    );

    // Log the access token and access token secret
    // TODO: Use the access token and access token secret as needed
    accessToken = oauthAccessToken;
    accessTokenSecret = oauthAccessTokenSecret;
    // Redirect the user to the /identity endpoint
    res.redirect('/identity');
  } catch (error) {
    // Handle errors and send an error response
    res.status(500).json({ error: 'An error occurred while exchanging the request token for an access token.' });
  }
});

/**
 * Performs the OAuth1 request for obtaining the user identity.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @param {string} oauthToken - The OAuth access token.
 * @param {string} oauthTokenSecret - The OAuth access token secret.
 * @returns {Promise<Object>} - A promise that resolves with the user identity object.
 */
async function getUserIdentity(consumerKey, consumerSecret, oauthToken, oauthTokenSecret) {
  const url = 'https://api.discogs.com/oauth/identity';

  const config = {
    url: url,
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${Date.now()}", oauth_token="${oauthToken}", oauth_signature="${consumerSecret}&${oauthTokenSecret}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Date.now()}"`,
      'User-Agent': 'YOUR_USER_AGENT/1.0'
    }
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data);
  }
}
// Route handler for the '/identity' endpoint
app.get('/identity', async (req, res) => {
  try {
    const userIdentity = await getUserIdentity(consumerKey, consumerSecret, accessToken, accessTokenSecret);
    // Generate HTML directly in the route handler
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Identity</title>
      </head>
      <body>
        <h1>User Identity</h1>
        <p><strong>Username:</strong> ${userIdentity.username}</p>
        <p><strong>Profile URL:</strong> <a href="${userIdentity.resource_url}">${userIdentity.resource_url}</a></p>
        <!-- Add more user identity data as needed -->
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).send('An error occurred while fetching the user identity.');
  }
});



// Usage example:
// (async () => {
//   try {
//     // Create a dotenv file with these
//     const consumerKey = process.env.CONSUMER_KEY;
//     const consumerSecret = process.env.CONSUMER_SECRET;

//     if (consumerKey === undefined || consumerSecret === undefined) {
//       throw new Error("Consumer Key/Secret not found in .env file!")
//     }

//     const requestRes = await getRequestToken(consumerKey, consumerSecret);
//     console.log("Request token obtained!");
//     console.log(requestRes);
//     console.log();
//     console.log("Click the verificationURL and complete the sign in process to obtain the oauth token and verifier.");
//     const callbackURL = prompt("Copy the whole callback URL and paste it here: ");
//     const urlParams = new URLSearchParams(callbackURL.substring(callbackURL.indexOf('?')));
//     const oauthToken = urlParams.get('oauth_token');
//     const oauthVerifier = urlParams.get('oauth_verifier');
//     //TODO: Ensure that the oauthToken is the same as the one in requestRes
//     const consumerRes = await getAccessToken(consumerKey,
//                                              consumerSecret,
//                                              oauthToken,
//                                              oauthVerifier,
//                                              requestRes["oauthRequestTokenSecret"]);
//     console.log();

//     const identity = await getUserIdentity(consumerKey,
//                                            consumerSecret,
//                                            consumerRes.oauthAccessToken,
//                                            consumerRes.oauthAccessTokenSecret);

//     console.log("Success! Your identity is:");
//     console.log(identity);
//   } catch (error) {
//     console.error(error);
//   }
// })();
