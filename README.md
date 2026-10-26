# Seeker Flap: a Flappy Bird launcher for Samsung TVs

A home screen app for Samsung smart TVs in a retro dot-matrix style:

- **App launcher.** Netflix, YouTube, Hulu, Disney+, Prime Video, Max, Peacock, Apple TV,
  Paramount+ and Spotify. Only the apps installed on your TV appear.
- **HDMI inputs.** A port appears in the list while something is plugged into it.
- **Clock, date and weather.** Weather comes from [Open-Meteo](https://open-meteo.com), with
  no account needed.
- **Games, played with the remote,** in a GAMES folder: Flappy Bird, Dino Run, Snake and
  Stack get harder as you score and keep high scores on the TV (shared leaderboards are
  optional). Blackjack, Roulette and Dice share a play-money bankroll of 1,000 chips that
  tops back up when you go broke.
- **Popeyes menu board,** which is also the screensaver after 10 minutes without a key press.
- **Spotify in the background (optional).** Music plays from the TV's speakers on the home
  screen and in the games, with a progress ring and controls in the bottom-left corner.
- **Jam (optional).** Guests scan a QR code, then search, queue, reorder and control the
  music from their phones. No app or Spotify account needed.

Inspired by [this reel](https://www.instagram.com/p/DeyEH2tx4BO/) by tyler_.

> Samsung doesn't let a third-party app replace the TV's own home screen or start at boot.
> Pin Seeker Flap to the home bar so it's one press away.

## What you need

- **A Samsung smart TV from 2022 or later** (Tizen 6.5+). Tested on the 2024 DU7200 series
  (Tizen 8). Older Tizen TVs probably work too.
- **A computer:** macOS, Windows or Linux. The commands below are for macOS; Tizen Studio
  is the same on the others.
- **A free [Samsung account](https://account.samsung.com),** used to sign the app.
- **A network where the computer can reach the TV.** Many home and apartment routers block
  devices from talking to each other. A phone hotspot works around that (step 2).

The computer is only needed to install or update the app. The app keeps working after
you disconnect it.

## Try it in a browser first

```
python3 -m http.server 8000 -d app
```

Open http://localhost:8000:

| Key            | Does             |
| -------------- | ---------------- |
| Arrow keys     | Move             |
| Enter or Space | OK               |
| Esc or Backspace | Back           |

Apps don't open in the browser; that only works on the TV.

## 1. Install Tizen Studio (one time)

1. Download the **command-line** installer for your OS from
   https://download.tizen.org/sdk/Installer/tizen-studio_6.1/. On macOS it's
   `web-cli_Tizen_Studio_6.1_macos-64.bin`.
2. Install it to `~/tizen-studio`:
   ```
   chmod +x web-cli_Tizen_Studio_6.1_macos-64.bin
   ./web-cli_Tizen_Studio_6.1_macos-64.bin --accept-license ~/tizen-studio
   ```
3. Install Samsung's TV tools and certificate extension. Use the Java bundled with Tizen
   Studio; the package manager often can't find a system JDK:
   ```
   cd ~/tizen-studio/package-manager
   ~/tizen-studio/jdk/Contents/Home/bin/java -jar PackageManagerV2-cli.jar install --accept-license \
     Certificate-Manager cert-add-on TV-SAMSUNG-Extension-Tools TV-SAMSUNG-Extension-Resources
   ```
   On Windows or Linux the bundled Java is at `~/tizen-studio/jdk/bin/java`. You can skip
   the TV emulator; it's large and not needed.
4. Check that the tools run:
   ```
   ~/tizen-studio/tools/sdb version
   ~/tizen-studio/tools/ide/bin/tizen version
   ```

## 2. Put the computer and the TV on the same network

First find your computer's IP address. On macOS, run `ipconfig getifaddr en0` or
`ipconfig getifaddr en1`.

Then find the TV's IP address: Settings → General & Privacy → Network → Network Status →
IP Settings.

Check that the computer can reach the TV:

```
nc -z -G 3 <tv-ip> 8001 && echo reachable
```

If it isn't reachable, your router is probably isolating devices. Use a phone hotspot:

1. **Phone:** turn on Personal Hotspot. On iPhone, also turn on **Maximize Compatibility**.
2. **TV:** Settings → General & Privacy → Network → Open Network Settings → Wireless →
   pick the hotspot.
3. **Computer:** join the hotspot.
4. **macOS + iPhone hotspot:** the Mac sometimes gets only an IPv6 address, which shows up
   as `192.0.0.2`, and the TV can't reach that. Give the Mac a fixed address on the
   hotspot's network:
   ```
   sudo networksetup -setmanual Wi-Fi 172.20.10.5 255.255.255.240 172.20.10.1
   ```
   **Undo it afterwards**, or the Mac won't be able to join other Wi-Fi networks. See
   [Back to home Wi-Fi](#back-to-home-wi-fi-do-this-every-time-you-used-the-hotspot).

## 3. Turn on Developer Mode on the TV

1. Press **Home** on the remote and open **Apps** from the home bar.
2. Scroll **all the way down** to the bottom of the Apps screen and open **App Settings**.
   On some firmware it's a gear icon in the top-right corner instead.
3. On the App Settings screen, press the **123** button on the remote. On the slim
   SolarCell remote it's the button with four colored dots, near the volume rocker. An
   on-screen number pad appears.
4. Enter **1 2 3 4 5**. If nothing happens, try **0 0 0 0 0**, or plug a USB keyboard into
   the TV and type the digits.
5. In the **Developer Mode** box, switch it **On**. Set **Host PC IP** to your computer's IP
   address from step 2, then select **OK**.
6. **Fully restart the TV:** hold the power button on the remote until the TV turns off and
   back on. Developer Mode only takes effect after this.
7. Open the Apps screen again. **Develop Mode** now shows at the top.

If your computer's IP address changes later, repeat these steps with the new address,
then restart the TV again.

## 4. Connect to the TV

```
~/tizen-studio/tools/sdb connect <tv-ip>
~/tizen-studio/tools/sdb devices
```

`devices` should list the TV's model, e.g. `192.168.1.40:26101  device  UN43DU7200DXZA`.

If `connect` fails, run `~/tizen-studio/tools/sdb kill-server` and try again. It sometimes
takes two or three attempts.

Then get the TV's **DUID**, which you need for the certificate:

```
~/tizen-studio/tools/sdb -s <tv-ip>:26101 shell 0 getduid
```

## 5. Create a Samsung certificate (one time)

Samsung TVs only install apps signed with a Samsung certificate that lists that TV's DUID.

1. Open the Certificate Manager:
   - macOS: `open ~/tizen-studio/tools/certificate-manager/certificate-manager.app`
   - Windows and Linux: it's in `~/tizen-studio/tools/certificate-manager/`.
2. Click **+**, choose **Samsung**, then device type **TV**, then **Next**.
3. Name the profile `tv`. That's the name `deploy.sh` uses by default.
4. **Author certificate:**
   - Choose **Create a new author certificate**.
   - Enter any author name, and a password you'll remember.
   - Sign in with your Samsung account when the browser opens.
5. **Distributor certificate:**
   - Choose **Create a new distributor certificate** and keep privilege **Public**.
   - Make sure your TV's DUID is in the list. It's added automatically while `sdb` is
     connected; otherwise click **Add** and paste it.
   - Add the DUID of every TV you want to install on.
6. Click **Next** and **Finish**. The certificates are saved in `~/SamsungCertificate/tv/`.
   Back them up.

**Adding a TV later:**

1. Create a new profile.
2. Choose **Use an existing author certificate** and pick your old `author.p12`. Reusing
   it lets installed apps update in place.
3. Create a new distributor certificate that lists **all** your TVs' DUIDs.
4. Deploy with `CERT_PROFILE=<new profile name>`.

## 6. Install

```
./deploy.sh <tv-ip>
```

This signs the app, installs it and opens it on the TV. Run it once for each TV.

When you're done:

1. Move the TV back to your normal Wi-Fi if you used a hotspot. Developer Mode can stay on.
2. Pin the app to the home bar: in the Apps screen, highlight **Seeker Flap**, press and
   hold OK (or press Down), and choose **Add to Home**.

**To update later:** reconnect the TV (steps 2 and 4), then run `./deploy.sh <tv-ip>` again.

## Back to home Wi-Fi (do this every time you used the hotspot)

The fixed address from step 2 applies to **every** Wi-Fi network, so until you undo it the
Mac won't connect to your home Wi-Fi, even though your other devices do.

1. In a regular Terminal window (`sudo` asks for your Mac password), run:
   ```
   sudo networksetup -setdhcp Wi-Fi
   ```
   Or use System Settings: **Wi-Fi** → **Details…** next to the network → **TCP/IP** →
   **Configure IPv4: Using DHCP** → **OK**.
2. Reconnect: click the Wi-Fi icon in the menu bar and pick your home network. If it's
   already selected, turn Wi-Fi off and on.
3. Check it worked: `networksetup -getinfo Wi-Fi` should say **DHCP Configuration** and show
   your home address, not `172.20.10.5`.
4. **TV:** Settings → General & Privacy → Network → Open Network Settings → Wireless → pick
   your home network. The apps keep working. Developer Mode can stay on.

## Using it

| Remote     | Does                                                            |
| ---------- | --------------------------------------------------------------- |
| Up / Down  | Move through the list (apps, inputs, GAMES, SETTINGS)            |
| OK         | Open the selected item, or open/close the GAMES folder           |
| Down past the last row | The Spotify corner (see below)                       |
| Back       | Go back. On the home screen, Back exits the launcher.           |

**In the games:**

| Game        | Controls                                       |
| ----------- | ---------------------------------------------- |
| Flappy Bird | OK or Up flaps                                 |
| Dino Run    | OK or Up jumps (hold for higher), Down ducks   |
| Snake       | Arrows steer                                   |
| Stack       | OK drops the block                             |

When you lose, the game-over screen offers **Play again** (selected by default), **Exit**,
and, on a new record, **Add name** for the leaderboard.

**Settings (last in the list):**

- Choose which apps and inputs appear.
- Game speed.
- Light bar on or off.
- 12- or 24-hour clock.
- Reset best scores.

## Personal settings

Defaults live in `app/config.js`. Put your own in `app/config.local.js`, which git ignores,
so they survive updates:

```js
Object.assign(window.CONFIG, {
  name: 'ALEX',          // "HELLO ALEX" on the home screen
  city: 'Brooklyn',      // weather location; blank = detect from the TV's IP
  units: 'celsius',
});
```

Redeploy after changing them.

## Shared leaderboards (optional)

Without this, scores stay on each TV. To share boards between TVs:

1. Create a free [Supabase](https://supabase.com) project.
2. Paste `supabase.sql` into SQL Editor and click **Run**.
3. Put the project URL and **publishable** key in `app/config.local.js`:
   ```js
   Object.assign(window.CONFIG, {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseKey: 'sb_publishable_...',
   });
   ```

## Spotify in the background (optional)

Needs Spotify Premium. Music plays inside the launcher itself, from the TV's speakers, and
starts on its own when the launcher opens. It pauses while you're in Netflix etc. and picks up
again when you come back.

1. Create an app at the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
   Tick **Web API** and **Web Playback SDK**, and add the redirect URI
   `http://127.0.0.1:8888/callback`. Spotify no longer accepts `localhost` there.
2. Run `./spotify-login.py <client-id>` and log in in the browser tab it opens. It saves the
   login to `app/config.local.js`.
3. Optionally, set `spotifyPlaylist` to a playlist or album link to start on shuffle at boot.
   Blank carries on with whatever you last played.
4. Redeploy.

On the home screen, press Down past the last row to reach the Spotify corner. Left and Right
pick back, play/pause, next, or the speaker (TV or an Echo Dot). OK presses it. The remote's
media keys work everywhere.

## Jam: guests add songs (optional)

Spotify Jams have no API, so the launcher does its own. Selecting the Spotify corner fills
the screen with a QR code. It opens `jam/index.html` on a guest's phone, a Spotify-style page
where they can:
- search and add songs, or paste a song, album or playlist link from their Spotify app;
- add from the top songs (Apple Music's most-played chart, found on Spotify), or play one of
  Spotify's own playlists (party, throwbacks, chill and more) on the TV. Spotify doesn't let
  apps list the songs in its own playlists, so those play whole;
- drag their songs into a new order, or swipe left to remove one;
- see what's playing with a progress bar;
- use shuffle, back, play/pause, next and repeat.

The phone and the TV talk through rows in a Supabase table that the TV checks every second.

Spotify's queue can only be added to, never reordered or trimmed. So guests' songs wait in the
TV's own list, and each one is handed to Spotify about 20 seconds before the current song
ends. After that it's marked "Playing next" and can't be moved.

1. Set up Supabase as in [Shared leaderboards](#shared-leaderboards-optional). `supabase.sql`
   includes the `jam` table.
2. Host `jam/index.html` with your Supabase URL and publishable key filled in, e.g. on GitHub
   Pages (Settings → Pages → deploy from `main`, root).
3. Set `jamUrl` to its address, e.g. `'https://<user>.github.io/tv-setup/jam/'`.
4. Optional, for search results as you type: set `spotifyClientSecret` (dashboard → your app →
   Settings). Without it, every search goes through the TV, about 2 seconds each.

The secret stays on the TV. Guests get only a short-lived app token that can search
Spotify's catalogue and nothing else.

## Adding an app

Add a line to `CATALOG` in `app/js/apps.js`:

- `match` is a regular expression tested against the app name the TV reports, in lower case.
- `fallbackId` is the app's Tizen ID, used only if the TV won't list its apps.
- If the app should appear by default, add its key to `DEFAULT_ON`.

## Common problems

Every problem below came up during a real setup. Each one lists what you see, then the fix.

### Package manager says "Java Development Kit (JDK) was not found"
`package-manager-cli.bin` can't find Java, even if you have one installed. Run the jar with
the Java that ships with Tizen Studio:
```
cd ~/tizen-studio/package-manager
~/tizen-studio/jdk/Contents/Home/bin/java -jar PackageManagerV2-cli.jar show-pkgs
```

### Typing 1 2 3 4 5 does nothing (no Developer Mode box)
- The code only works on the **App Settings** screen: Apps tab → scroll **all the way
  down** → **App Settings**. It doesn't work on the main Apps screen.
- Enter the digits with the remote's **123** button (four colored dots), which opens the
  on-screen number pad.
- Still nothing? Try **0 0 0 0 0**, or plug a USB keyboard into the TV.

### The computer can't reach the TV on home Wi-Fi
`ping <tv-ip>` times out, even though both devices are on the same Wi-Fi. The router blocks
devices from talking to each other (client isolation). Your settings aren't the cause, and
the macOS "Local Network" permission isn't either.

Check:
```
nc -z -G 3 <tv-ip> 8001 && echo reachable
```
Fix: use a phone hotspot for setup (step 2).

### On the iPhone hotspot, the Mac's IP is 192.0.0.2 and the TV is unreachable
The hotspot gave the Mac only IPv6. `192.0.0.2` is a stand-in address, not a real IPv4
address on the hotspot's network.

Check:
```
ifconfig en1 | grep 'inet '     # 192.0.0.2 = the problem
networksetup -getinfo Wi-Fi
```
Fix: give the Mac a fixed address in a separate terminal:
```
sudo networksetup -setmanual Wi-Fi 172.20.10.5 255.255.255.240 172.20.10.1
```
Developer Mode's Host PC IP must then be `172.20.10.5`, and the TV must be restarted after
you change it.

### `sudo: a terminal is required to read the password`
`sudo` was run from Claude Code's `!` prompt, which can't ask for a password. Run the same
command in a separate Terminal or Ghostty window.

### `sdb connect` says "failed to connect", but port 26101 is open
First check what the TV thinks. `developerMode` should be `"1"` and `developerIP` should be
your computer's IP:
```
curl -s http://<tv-ip>:8001/api/v2/ | grep -oE '"developer(Mode|IP)": "[^"]*"'
```
If both look right, restart sdb and retry. It often works on the second or third try:
```
~/tizen-studio/tools/sdb kill-server
~/tizen-studio/tools/sdb connect <tv-ip>:26101
~/tizen-studio/tools/sdb devices
```
If `developerIP` is wrong, fix it in Developer Mode (step 3) and fully restart the TV.

### `tizen package` writes the .wgt somewhere else (`cd: dist/launcher: No such file`)
The tizen CLI resolves a relative `-o` against its own folder, so the file ends up in
`~/tizen-studio/tools/ide/bin/dist/`. Always pass an absolute path, e.g.
`-o "$PWD/dist/launcher"`. `deploy.sh` already does this.

### "Failed to install Tizen application" with no other detail
There are two causes:
1. **A space in the .wgt filename.** The package is named after the app (`Seeker Flap.wgt`),
   and the TV's installer silently fails on spaces. Rename it before installing:
   ```
   mv "Seeker Flap.wgt" launcher.wgt
   ~/tizen-studio/tools/ide/bin/tizen install -n launcher.wgt -s <tv-ip>:26101
   ```
   `deploy.sh` already does this.
2. **The TV isn't in the certificate.** See the next problem.

### A second TV won't install (the certificate only covers the first)
Distributor certificates list specific TVs by DUID. Get the new TV's DUID:
```
~/tizen-studio/tools/sdb -s <tv-ip>:26101 shell 0 getduid
```
In the Certificate Manager, **Edit** on the distributor certificate only lets you pick a
different file. **Cancel** it and make a new profile instead:
1. Click **+** → **Samsung** → **TV**, and give the profile a new name.
2. Choose **Use an existing author certificate** and pick your old `author.p12` with its
   password. Reusing it keeps installed apps updatable.
3. Create a new distributor certificate that lists **every** TV's DUID.
4. Deploy with `CERT_PROFILE=<new name>`.

Check which profiles exist, and which is active:
```
grep -o 'profile name="[^"]*"\|active="[^"]*"' ~/tizen-studio-data/profile/profiles.xml
```

### `tizen install` / `tizen run` says "Can not get the target option"
The TV isn't connected to sdb. It may have left the hotspot, turned off, or changed IP.
Check `~/tizen-studio/tools/sdb devices`, then reconnect.

### `sdb shell 0 debug <app id>` hangs
It hangs while the app is already running. Stop the app first, then start it in debug mode:
```
sdb -s <tv-ip>:26101 shell 0 was_kill <app id>
sdb -s <tv-ip>:26101 shell 0 debug <app id>      # prints "port: NNNNN"
sdb -s <tv-ip>:26101 forward tcp:NNNNN tcp:NNNNN
curl http://127.0.0.1:NNNNN/json                 # the DevTools websocket for the page
```

### Spotify plays about 10 seconds of each song, then stops
That's how far a song gets before its licence check. The TV's browser has no
`AbortSignal.timeout`, so Spotify's player hands `fetch` a stand-in signal that `fetch`
rejects, and the licence request never goes out. `app/js/music.js` patches `fetch` inside
the player's frame to drop that signal. Keep that patch if you change the player.

### Music goes to the TV's Spotify app or another device instead of the TV
The TV's own Spotify app can't be the speaker: it goes to sleep as soon as it's off screen.
The launcher plays through its own built-in player ("TV" in Spotify's device list). It only
switches to the Echo Dot when you choose it with the speaker button. That choice is
remembered, so press it again to come back.

### A friend on the same Wi-Fi can't open the jam page
A page served from your computer only works where the network lets devices see each other,
and many routers block that. Host `jam/index.html` on GitHub Pages instead; it then works on
any network, even mobile data.

### Guests can add songs but not reorder, remove or control playback
The `jam` table is from an older `supabase.sql`, whose check doesn't allow `edit` rows
(`violates check constraint "jam_kind_check"`). Run `supabase.sql` again; it's safe to re-run.

### The jam QR code won't scan
Don't round the small squares. At a few pixels each, rounding leaves gaps that phone cameras
trip on. Only the three corner squares are rounded.

### Why not log guests in with your Spotify account for search?
Logging in again with fewer permissions doesn't limit anything: Spotify keeps every
permission the app was ever granted. A token handed to phones would control your whole
account. That's why phones get an app-only token instead (`spotifyClientSecret`).

### An HDMI input doesn't show in the launcher
The launcher lists only ports the TV reports as **connected**. Most TVs report a port as
disconnected while the device on it is off or asleep, even with the cable in.
- Turn the device on.
- Reseat the cable.
- Check you're looking at the TV it's plugged into.

The list updates live; you don't need to restart the launcher.

### After setup, the Mac won't join home Wi-Fi (other devices are fine)
The fixed hotspot address is still set, and macOS applies it to every Wi-Fi network.
Check:
```
networksetup -getinfo Wi-Fi     # "Manual Configuration" + 172.20.10.5 = the problem
```
Fix: see
[Back to home Wi-Fi](#back-to-home-wi-fi-do-this-every-time-you-used-the-hotspot). In short,
run this in a separate terminal, then reconnect:
```
sudo networksetup -setdhcp Wi-Fi
```

## License

MIT. See [LICENSE](LICENSE).
