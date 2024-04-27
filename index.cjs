const axios = require('axios');
const express = require('express');
const qs = require('qs');
const crypto = require('crypto');
const app = express();
const port = 3000;
const fs = require('fs');
const routeHandlers = require('./routeHandlers.cjs');
// import * as lib from './lib.js';

// Serve the static HTML file from the example folder
app.use(express.static('example'));
app.use('/', routeHandlers);
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const prompt = require("prompt-sync")({ sigint: true });
require('dotenv').config()
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
let oauthRequestTokenSecret;
let accessToken;
let accessTokenSecret;
let username;

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
//Route handler for the '/identity' endpoint
app.get('/identity', async (req, res) => {
  try {
    const userIdentity = await getUserIdentity(consumerKey, consumerSecret, accessToken, accessTokenSecret);
    console.log(userIdentity);

    const html = fs.readFileSync('./example/identity.html', 'utf8');
    username = userIdentity.username;
    console.log('username', userIdentity);
    // Replace the dynamic values in the HTML
    const replacedHtml = html
      .replace('{{username}}', userIdentity.username)
      .replace('{{profileUrl}}', userIdentity.resource_url)
      .replace('{{consumerName}}', userIdentity.consumer_name);

    res.send(replacedHtml);
  } catch (error) {
    res.redirect('/404');
    // res.status(500).send('An error occurred while fetching the user identity.');   
  }
});

// Use the routeHandlers router for your routes
// app.use(routeHandlers);
// async function getUserCollection(consumerKey, consumerSecret, oauthToken, oauthTokenSecret) {
//   const url = `https://api.discogs.com/users/${username}/collection/folders`; 

//   const config = {
//     method: 'get',
//     url: url,
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Authorization': `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${Date.now()}", oauth_token="${oauthToken}", oauth_signature="${consumerSecret}&${oauthTokenSecret}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Date.now()}"`,
//       'User-Agent': 'YOUR_USER_AGENT/1.0'
//     }
//   };

//   try {
//     const response = await axios(config);
//     console.log('response', response.data);
//     return response.data;
//   } catch (error) {
//     throw new Error(error.response.data);
//   }
// }
// Route handler for the '/collection' endpoint
app.get('/collection_folders', async (req, res) => {
  try {
    // Call the function to fetch the user's collection
    const collection = await getUserCollection(consumerKey, consumerSecret, accessToken, accessTokenSecret);

    // Process the collection data as needed
    console.log('User Collection:', collection);

    const htmlFilePath = './example/collection_folders.html';
    const html = fs.readFileSync(htmlFilePath, 'utf8');

    // Replace the dynamic values in the HTML
    const replacedHtml = html
      .replace('{{folders}}', generateFolderListHtml(collection.folders));
    res.send(replacedHtml);
  } catch (error) {
    // res.redirect('/');
    res.status(500).send('An error occurred while fetching the user collection.');
  }
});

function generateFolderListHtml(folders) {
  return folders
    .map(folder => `
      <li>
        <strong>ID:</strong> ${folder.id}<br>
        <strong>Name:</strong> ${folder.name}<br>
        <strong>Count:</strong> ${folder.count}<br>
        <strong>Resource URL:</strong> <a href="${folder.resource_url}">${folder.resource_url}</a>
        <button onclick="fetchCollection('${folder.id}')">View Collection</button>
      </li>
    `)
    .join('');
}

async function getCollectionByFolderId(folderId, consumerKey, consumerSecret, oauthToken, oauthTokenSecret) {
  const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases`;
  console.log('url', url);
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
app.get('/collection_folders/:id', async (req, res) => {
  try {
      // Sample folder ID from the request parameter
      const folderId = req.params.id;

      // Function to format a date string
      function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
        return date.toLocaleDateString(undefined, options);
      }

      // Make an API call to fetch the collection based on the folder ID
      const collection = await getCollectionByFolderId(folderId, consumerKey, consumerSecret, accessToken, accessTokenSecret);

      const htmlFilePath = './example/collection_folders.html';
      const html = fs.readFileSync(htmlFilePath, 'utf8');

      // Create the table rows with dynamic data
      const collectionRows = collection.releases.map(release => `
          <tr>
              <td>${release.id}</td>
              <td>${release.instance_id}</td>
              <td>${formatDate(release.date_added)}</td>
              <td>${release.rating}</td>
              <td><img src="${release.basic_information.thumb}" alt="Release Image"></td>
              <td>${release.basic_information.title}</td>
              <td>${release.basic_information.year}</td>
              <td>${release.basic_information.formats[0].name}</td>
              <td>${release.basic_information.formats[0].qty}</td>
              <td>${release.basic_information.formats[0].descriptions.join(', ')}</td>
              <td>${release.basic_information.artists[0].name}</td>
              <td>${release.basic_information.labels[0].name}</td>
              <td>${release.basic_information.genres.join(', ')}</td>
              <td>${release.basic_information.styles.join(', ')}</td>
              <td>${release.folder_id}</td>
          </tr>
      `).join('');

      // Replace the dynamic values in the HTML
      const replacedHtml = html
          .replace('{{{folderId}}}', folderId)
          .replace('{{{collectionData}}}', collectionRows); // Use triple curly braces to render HTML

      res.send(replacedHtml);
  } catch (error) {
      res.status(500).send('An error occurred while fetching the collection.');
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



// app.get('/collection_folders/:id', async (req, res) => {
//   try {
//     // Sample folder ID from the request parameter
//     const folderId = req.params.id;

//     // Make an API call to fetch the collection based on the folder ID
//     const collection = await getCollectionByFolderId(folderId, consumerKey, consumerSecret, accessToken, accessTokenSecret);
//     console.log(collection);

//     const htmlFilePath = './example/collection.html';
//     const html = fs.readFileSync(htmlFilePath, 'utf8');

//     // Replace the dynamic values in the HTML
//     const replacedHtml = html
//       .replace('{{folderId}}', folderId)
//       .replace('{{collectionData}}', JSON.stringify(collection));

//     res.send(replacedHtml);
//   } catch (error) {
//     res.status(500).send('An error occurred while fetching the collection.');
//   }
// });