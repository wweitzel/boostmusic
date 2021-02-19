const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const fetch = require("node-fetch");
const stravaApi = require('strava-v3');
const spotifyApi = require('spotify-web-api-node');

const API_KEYS = require('./api_keys');;

const STATE_KEY = 'spotify-auth-state';
const SPOTIFY_CLIENT_ID = 'aa10d90cefbb4c03951f30435057a23f';
const SPOTIFY_CLIENT_SECRET = API_KEYS.spotifySecret;
const SPOTIFY_REDIRECT_URI = 'http://localhost:8888/callback/spotify';
const SPOTIFY_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
}
const STRAVA_CLIENT_ID = '61624';
const STRAVA_CLIENT_SECRET = API_KEYS.stravaSecret;
const STRAVA_HEADERS = {
  'Content-Type': 'application/json'
}


const app = express();
app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser());


app.get('/login/spotify', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(STATE_KEY, state);
  const scope = 'user-read-private user-read-email user-read-recently-played';
  const url = createUrlWithParams(new URL("https://accounts.spotify.com/authorize"), {
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scope,
    state: state
  });
  res.redirect(url);
});

app.get('/callback/spotify', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[STATE_KEY] : null;

  if (state === null || state !== storedState) {
    res.redirect('http://localhost:4200/error');
  } else {
    res.clearCookie(STATE_KEY);
    let url = createUrlWithParams(new URL('https://accounts.spotify.com/api/token'), {
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    const spotifyAuthInfo = await sendFetchRequest(url, 'POST', SPOTIFY_HEADERS);
    url = createUrlWithParams(new URL('http://localhost:4200/login'), {
      access_token: spotifyAuthInfo.access_token,
      refresh_token: spotifyAuthInfo.refresh_token
    });
    res.redirect(url.toString());
  }
});

app.get('/refresh-token/spotify', async (req, res) => {
  const refreshToken = req.query.refresh_token;
  const url = createUrlWithParams(new URL('https://accounts.spotify.com/api/token'), {
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })
  const spotifyAuthInfo = await sendFetchRequest(url, 'POST', SPOTIFY_HEADERS);
  res.send(spotifyAuthInfo);
});

app.get('/exchange-token/strava', async (req, res) => {
  const authCode = req.query.code
  const url = createUrlWithParams(new URL('https://www.strava.com/oauth/token'), {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    code: authCode,
    grant_type: 'authorization_code'
  });
  const stravaAuthInfo = await sendFetchRequest(url, 'POST', STRAVA_HEADERS);
  res.send(stravaAuthInfo);
});

app.get('/analyze-newest-activity', async (req, res, next) => {
  try {
    const spotify = new spotifyApi();
    spotify.setAccessToken(req.query.spotify_access_token);
    const strava = new stravaApi.client(req.query.strava_access_token);
    
    const recentlyPlayedTracks = (await spotify.getMyRecentlyPlayedTracks()).body;
    const recentActivities = await strava.athlete.listActivities({});
    const activityId = recentActivities[0].id;
    const activity = await strava.activities.get({id: activityId});
    const bestEfforts = activity.best_efforts;
    const segmentEfforts = activity.segment_efforts;
    const performantEfforts = [];
  
    bestEfforts.forEach(effort => checkEffortAndPush(effort, activity, performantEfforts));
    segmentEfforts.forEach(effort => checkEffortAndPush(effort, activity, performantEfforts));
  
    const effortsWithSongs = matchSongsToEfforts(performantEfforts.filter(effort => effort.moving_time < 360), recentlyPlayedTracks);
    effortsWithSongs.sort((a, b) => new Date(a.effort_start_time).getTime() < new Date(b.effort_start_time).getTime() ? -1 :
                               new Date(a.effort_start_time).getTime() > new Date(b.effort_start_time).getTime() ?  1 : 0);
    res.send(effortsWithSongs);
  } catch (error) {
    return next(error);
  }
});


function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

function createUrlWithParams(url, params) {
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  return url;
}

function checkEffortAndPush(effort, activity, efforts) {
  if (effort.pr_rank) {
    efforts.push(effort);
  } else if ((effort.distance / effort.moving_time) > activity.average_speed) {
    efforts.push(effort);
  }
}

function songPlayedDuringEffort(song, effort) {
  const effortStartTime = new Date(effort.start_date);
  const effortEndTime = new Date(new Date(effortStartTime).setSeconds(effortStartTime.getSeconds() + effort.moving_time));
  const songStartTime = new Date(song.played_at);
  const durationSeconds = song.track.duration_ms / 1000;
  const songEndTime = new Date(new Date(song.played_at).setSeconds(songStartTime.getSeconds() + durationSeconds));
  return songStartTime.getTime() + 60000 <= effortEndTime.getTime() && songEndTime.getTime() - 60000 >= effortStartTime.getTime();
}

function matchSongsToEfforts(efforts, songs) {
  const effortsWithSongs = [];
  efforts.forEach(effort => {
    const filteredSongs = songs.items.filter(song => songPlayedDuringEffort(song, effort));
    if (filteredSongs.length === 0 ) {
      const song = getSongBefore(new Date(effort.start_date), songs);
      if (song) {
        filteredSongs.push(song);
      }  
    }
    effortsWithSongs.push({
      effort,
      songs: filteredSongs
    })
  });
  return effortsWithSongs;
}

function getSongBefore(date, songs) {
  for (const song of songs.items) {
    if (new Date(song.played_at).getTime() < date.getTime()) {
      return song;
    }
  }
}

async function sendFetchRequest(url, method, headers) {
  const response = await fetch(url, {
    method: method,
    headers: headers
  });
  return await response.json();
}


console.log('Listening on 8888');
app.listen(8888);