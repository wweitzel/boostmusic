const express = require('express');
const cors = require('cors');
const request = require('request');
const fetch = require("node-fetch");
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const stravaApi = require('strava-v3');
const SpotifyWebApi = require('spotify-web-api-node');

stravaApi.config({
  "access_token": "Your apps access token (Required for Quickstart)",
  "client_id": "61624",
  "client_secret": "",
  "redirect_uri": "developers.strava.com",
});

stravaAccessToken = ''
strava = new stravaApi.client(stravaAccessToken);

var client_id = 'aa10d90cefbb4c03951f30435057a23f'; // Your client id
var client_secret = ''; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'stateKey';

var app = express();

app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser());

app.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', async (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    const url = `https://accounts.spotify.com/api/token?` +
      `code=${code}&` +
      `redirect_uri=${redirect_uri}&` +
      `grant_type=authorization_code`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      }
    });

    let spotifyAuthInfo = {}
    try {
      spotifyAuthInfo = await response.json();
    } catch (e) {
      console.log(e)
    }
    res.redirect('http://localhost:4200/login?' +
      querystring.stringify({
        access_token: spotifyAuthInfo.access_token,
        refresh_token: spotifyAuthInfo.refresh_token
      }));
  }
});

app.get('/refresh_token', async (req, res) => {
  const refreshToken = req.query.refresh_token;
  const url = `https://accounts.spotify.com/api/token?` +
    `refresh_token=${refreshToken}&` +
    `grant_type=refresh_token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
    }
  });

  let spotifyAuthInfo = {}
  try {
    spotifyAuthInfo = await response.json();
  } catch (e) {
    console.log(e)
  }

  res.send(spotifyAuthInfo);
});

app.get('/exchange_strava_token', async (req, res) => {
  const clientId = '61624';
  const clientSecret = '';
  const authCode = req.query.code

  const url = `https://www.strava.com/oauth/token?` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `code=${authCode}&` +
    `grant_type=authorization_code`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const stravaAuthInfo = await response.json();
  res.send(stravaAuthInfo);
});

app.get('/analyze', async (req, res) => {
  const payload = await strava.athlete.listActivities({})
  summaryActivity = payload[1]
  detailedActivity = await strava.activities.get({ 'id': summaryActivity.id })
  segmentEfforts = detailedActivity.segment_efforts
  segmentEfforts.forEach(effort => {
    if (effort.pr_rank) {
      console.log('There was a segmeent effort pr!')
    }
  })
  bestEfforts = detailedActivity.best_efforts
  bestEfforts.forEach(effort => {
    if (effort.pr_rank) {
      console.log('There was a best effor pr!')
    }
  })
  console.log(detailedActivity)
});


console.log('Listening on 8888');
app.listen(8888);