const axios = require('axios');

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

module.exports = { getUserIdentity };
