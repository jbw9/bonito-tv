# Installing Bonito, for Claude Code

The website's install prompt asks Claude Code to follow this file. It's written for Claude.
People can follow it too; README.md has the same Samsung steps with screenshots-level detail.

## How to work

- The person may not be technical. Run every command yourself. Only ask them to do what
  needs hands on the TV or a login, **one step at a time**, with the exact menu names below.
  Wait for them to confirm before moving on.
- Never ask them to edit files. Their name, city, design and Spotify are set from their
  phone at the end (Settings › Phone setup on the TV).
- If the prompt didn't say which TV they have, ask: Samsung, Google TV / Android TV, Fire TV,
  or something else (LG, Sony, Roku, Apple TV...).
- Nothing needs configuring for the remote, games or leaderboards: `app/config.js` already
  points at a shared Supabase project, and each TV makes its own private room code.

## Before anything: same network

The computer and TV must be on the same Wi-Fi.

- Computer's IP: macOS `ipconfig getifaddr en0` (or `en1`), Linux `hostname -I`, Windows `ipconfig`.
- TV's IP: ask the person, or find it (per platform below).
- **macOS:** if connections to the TV fail instantly with "No route to host" while `ping`
  works, the terminal app lacks Local Network permission. Ask them to allow it under System
  Settings › Privacy & Security › Local Network, then restart the terminal.
- If the TV still isn't reachable, the router is isolating devices: see README.md step 2
  (phone hotspot).

## Samsung (Tizen)

Full app: home screen, HDMI inputs, opens other apps. Follow README.md sections 1–6; notes:

1. **Find the TV:** Samsung TVs answer on port 8001. Scan the /24 of the computer's IP, e.g.
   `for i in $(seq 1 254); do curl -s --max-time 0.3 http://192.168.1.$i:8001/api/v2/ | grep -q '"name"' && echo 192.168.1.$i; done`.
   The JSON at `/api/v2/` includes the TV's name and model, so confirm it with the person.
2. **Tizen Studio** (README §1): download and install the CLI yourself. It needs no GUI.
3. **Developer Mode** (README §3): the person does this on the TV. Give them the
   computer's IP for Host PC IP. Remind them to fully restart the TV (hold the power button).
4. **Connect** (README §4) with `sdb connect`, and read the DUID.
5. **Certificate** (README §5): needs the Certificate Manager window and a Samsung account
   login, so the person clicks through it. Open the app for them and read out each screen's
   choices: Samsung → TV → profile name `tv` → new author certificate → sign in → new
   distributor certificate, privilege Public, with the TV's DUID listed.
6. **Install:** `./deploy.sh <tv-ip>`. Then tell them how to pin it (README §6).

Quick try without any of this: the TV's Internet app at `jbw9.github.io/bonito-tv/tv`.

## Google TV / Android TV (Google TV Streamer, Chromecast with Google TV, Shield, Sony, TCL...)

Everything but HDMI switching. Install `bonito.apk` (in the repo root) over the network with adb.

1. **adb:** use `adb` if installed; otherwise install Android platform-tools (macOS:
   `brew install android-platform-tools`, or download from
   https://developer.android.com/tools/releases/platform-tools).
2. **On the TV** (person): Settings › System › About, press *Android TV OS build* 7 times
   ("You are now a developer"). Then Settings › System › Developer options:
   - Android 11 and later (Google TV): turn on **Wireless debugging**, open it, choose
     **Pair device with pairing code**. Read the IP:port and code off the TV, run
     `adb pair <ip>:<pair-port> <code>`, then `adb connect <ip>:<port shown on the Wireless debugging screen>`.
   - Older Android TV: turn on **USB debugging** / **Network debugging**, then `adb connect <ip>:5555`.
   - If the TV shows "Allow debugging?", they choose **Always allow** and OK.
3. `adb install -r bonito.apk`, then open it: `adb shell am start -n tv.bonito/.MainActivity`.
4. Tell them it's in their apps row; they can long-press it to move it to the front.

No computer? The website has steps using the Downloader app on the TV.

## Amazon Fire TV

Same app and same adb route.

1. **On the TV** (person): Settings › My Fire TV › About, press the device name 7 times. Then
   Settings › My Fire TV › Developer options › **ADB debugging** on. IP: Settings › My Fire TV ›
   About › Network.
2. `adb connect <ip>:5555`. The TV asks "Allow USB debugging?": they choose OK (tick Always allow).
3. `adb install -r bonito.apk`, then `adb shell am start -n tv.bonito/.MainActivity`.
4. It appears under Your Apps & Channels.

## Any other TV with a browser (LG, Philips, Sony, Hisense...) or a laptop on HDMI

Games, phone remote, music and leaderboards; it can't open other apps or switch inputs.
Tell them to open the TV's web browser, go to `jbw9.github.io/bonito-tv/tv`, and bookmark it.
On a laptop: open that address in Chrome and go full screen.

## Apple TV, Roku

No way in: no browser and no sideloading. Suggest a Google TV Streamer or Chromecast with
Google TV on a spare HDMI port (then follow Google TV above), or a laptop on HDMI.

## Finish: make it theirs

With Bonito open on the TV:

1. They go to **Settings › Phone setup** on the TV and scan the QR code with their phone.
2. The phone page sets their name, city, temperature units and design, and walks them through
   Spotify (Premium only: they create a free Spotify developer app; the page shows the
   redirect URI to paste). They press **Send to TV**; the TV restarts with it.
3. The home screen's **Connect phone** code turns any phone into a remote and game controller.

## Undo

- Samsung: Apps → highlight Bonito → Delete. Developer Mode can be switched off in the same
  1 2 3 4 5 box.
- Android / Google / Fire TV: `adb uninstall tv.bonito`, or uninstall from Settings › Apps.
