// routeHandlers.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const { getUserIdentity } = require('./discogsServices.cjs');

// Add your required imports for other modules, if any

// Define the route handler for the '/identity' endpoint
router.get('/identity', async (req, res) => {
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
    console.log('do we get here?');
  } catch (error) {
    res.redirect('/');
    // res.status(500).send('An error occurred while fetching the user identity.');
  }
});

module.exports = router;