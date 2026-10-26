#!/usr/bin/env python3
"""One-time Spotify login for the launcher's background music (app/js/music.js).

1. Create an app at https://developer.spotify.com/dashboard. Tick "Web API" and
   "Web Playback SDK", and add the redirect URI http://127.0.0.1:8888/callback.
2. Run ./spotify-login.py <client-id> and log in in the browser tab it opens.
3. Redeploy (./deploy.sh <tv-ip>). The login is saved to app/config.local.js.
"""
import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import urllib.parse
import urllib.request
import webbrowser

REDIRECT = 'http://127.0.0.1:8888/callback'
SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state'
CONFIG_LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'config.local.js')

if len(sys.argv) != 2:
    sys.exit('usage: ./spotify-login.py <client-id>')
client_id = sys.argv[1]
verifier = secrets.token_urlsafe(64)
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
state = secrets.token_urlsafe(16)
result = {}


class Callback(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path != '/callback':
            self.send_response(404)
            self.end_headers()
            return
        q = urllib.parse.parse_qs(url.query)
        if q.get('state', [''])[0] != state:
            result['error'] = 'state mismatch'
        else:
            result['code'] = q.get('code', [None])[0]
            result['error'] = q.get('error', [None])[0]
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Done. You can close this tab.' if result.get('code') else b'Login failed. See the terminal.')

    def log_message(self, *args):
        pass


server = http.server.HTTPServer(('127.0.0.1', 8888), Callback)
webbrowser.open('https://accounts.spotify.com/authorize?' + urllib.parse.urlencode({
    'client_id': client_id,
    'response_type': 'code',
    'redirect_uri': REDIRECT,
    'scope': SCOPES,
    'state': state,
    'code_challenge_method': 'S256',
    'code_challenge': challenge,
}))
print('Log in in the browser tab that just opened...')
while not result:
    server.handle_request()
if not result.get('code'):
    sys.exit('Login failed: ' + str(result.get('error')))

body = urllib.parse.urlencode({
    'grant_type': 'authorization_code',
    'code': result['code'],
    'redirect_uri': REDIRECT,
    'client_id': client_id,
    'code_verifier': verifier,
}).encode()
tokens = json.load(urllib.request.urlopen('https://accounts.spotify.com/api/token', body))

# Appended, so a later login overrides an earlier one.
with open(CONFIG_LOCAL, 'a') as f:
    f.write("Object.assign(window.CONFIG, { spotifyClientId: %s, spotifyRefreshToken: %s });\n"
            % (json.dumps(client_id), json.dumps(tokens['refresh_token'])))
print('Saved to app/config.local.js. Redeploy with ./deploy.sh <tv-ip>.')
