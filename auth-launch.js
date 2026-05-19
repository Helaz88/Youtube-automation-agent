const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const credentialsPath = path.join(__dirname, 'config', 'credentials.json');
const tokensPath = path.join(__dirname, 'config', 'tokens.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath));

const oauth2Client = new google.auth.OAuth2(
  credentials.youtube.client_id,
  credentials.youtube.client_secret,
  'http://localhost:8080/auth/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    res.send(`<h1>Error: ${error}</h1>`);
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(tokensPath, JSON.stringify({ youtube: tokens }, null, 2));
    res.send('<h1 style="font-family:Arial;text-align:center;padding:50px;color:green">Authentication successful! You can close this window.</h1>');
    console.log('\n✅ Tokens saved to config/tokens.json');
    console.log('✅ You can now run: npm start');
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    res.send(`<h1>Token exchange failed: ${err.message}</h1>`);
    console.error('Token exchange failed:', err.message);
  }
});

const server = app.listen(8080, () => {
  console.log('OAuth server running on http://localhost:8080');
  console.log('Opening browser...');
  exec(`start "" "${authUrl}"`);
});
