const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

const prompt = require("prompt-sync")({ sigint: true });
require('dotenv').config()


/**
 * Performs the OAuth1 request for obtaining the request token.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @returns {Promise<string>} - A promise that resolves with the OAuth token.
 */
async function getRequestToken(consumerKey, consumerSecret) {
  const url = 'https://api.discogs.com/oauth/request_token';
  const timestamp = Date.now();
  const data = qs.stringify({
    'oauth_callback': 'http://localhost:3000/callback',
    'oauth_consumer_key': consumerKey,
    'oauth_nonce': timestamp,
    'oauth_signature_method': 'PLAINTEXT',
    'oauth_timestamp': timestamp,
    'oauth_version': '1.0',
  });

  const config = {
    method: 'post',
    url: url,
    headers: {
        'Authorization': `OAuth oauth_consumer_key="${consumerKey}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${timestamp}", oauth_nonce=${timestamp}, oauth_version="1.0", oauth_signature="${consumerSecret}&"`,
    },
    data: data
  };

  try {
    const response = await axios(config);
    const oauthToken = response.data.split('&')[0].split('=')[1];
    const searchParams = new URLSearchParams(response.data);

    return {
      oauthRequestToken: searchParams.get('oauth_token'),
      oauthRequestTokenSecret: searchParams.get('oauth_token_secret'),
      verificationURL: `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`
    };
  } catch (error) {
    throw new Error(error.response.data);
  }
}

/**
 * Performs the OAuth1 request for obtaining the access token.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @param {string} oauthToken - The OAuth token.
 * @param {string} oauthVerifier - The OAuth verifier.
 * @returns {Promise<Object>} - A promise that resolves with the access token object.
 */
async function getAccessToken(consumerKey, consumerSecret, oauthToken, oauthVerifier, tokenSecret) {
  const config = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `OAuth oauth_consumer_key="${consumerKey}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Date.now()}", oauth_nonce="${Date.now()}", oauth_version="1.0", oauth_token="${oauthToken}, oauth_verifier="${oauthVerifier}", oauth_signature="${consumerSecret}&${tokenSecret}"`,
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

/**
 * Performs the OAuth1 request for obtaining the user identity.
 *
 * @param {string} consumerKey - The consumer key.
 * @param {string} consumerSecret - The consumer secret.
 * @param {string} oauthToken - The OAuth token.
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


// Usage example:
(async () => {
  try {
    // Create a dotenv file with these
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;

    if (consumerKey === undefined || consumerSecret === undefined) {
      throw new Error("Consumer Key/Secret not found in .env file!")
    }

    const requestRes = await getRequestToken(consumerKey, consumerSecret);
    console.log("Request token obtained!");
    console.log(requestRes);
    console.log();
    console.log("Click the verificationURL and complete the sign in process to obtain the oauth token and verifier.");
    const callbackURL = prompt("Copy the whole callback URL and paste it here: ");
    const urlParams = new URLSearchParams(callbackURL.substring(callbackURL.indexOf('?')));
    const oauthToken = urlParams.get('oauth_token');
    const oauthVerifier = urlParams.get('oauth_verifier');

    const consumerRes = await getAccessToken(consumerKey,
                                             consumerSecret,
                                             oauthToken,
                                             oauthVerifier,
                                             requestRes["oauthRequestTokenSecret"]);
    console.log();

    const identity = await getUserIdentity(consumerKey,
                                           consumerSecret,
                                           consumerRes.oauthAccessToken,
                                           consumerRes.oauthAccessTokenSecret);

    console.log("Success! Your identity is:");
    console.log(identity);
  } catch (error) {
    console.error(error);
  }
})();
