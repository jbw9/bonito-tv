# Seeker Flap: a Flappy Bird launcher for Samsung TVs

A home screen app for Samsung smart TVs in a retro dot-matrix style:

- **App launcher.** Netflix, YouTube, Hulu, Disney+, Prime Video, Max, Peacock, Apple TV,
  Paramount+ and Spotify. Only the apps installed on your TV appear.
- **HDMI inputs.** A port appears in the list while something is plugged into it.
- **Clock, date and weather.** Weather comes from [Open-Meteo](https://open-meteo.com), with
  no account needed.
- **Four games, played with the remote:** Flappy Bird, Dino Run, Snake and Stack. They get
  harder as you score, and keep high scores on the TV. Shared leaderboards are optional.

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
| Up / Down  | Move through the list (apps, inputs, games)                      |
| OK         | Open the selected item                                           |
| Right      | The gear (settings)                                              |
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

**Settings (the gear):**

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

## Adding an app

Add a line to `CATALOG` in `app/js/apps.js`:

- `match` is a regular expression tested against the app name the TV reports, in lower case.
- `fallbackId` is the app's Tizen ID, used only if the TV won't list its apps.
- If the app should appear by default, add its key to `DEFAULT_ON`.

## Troubleshooting

- **The Developer Mode box doesn't open.**
  - Make sure you're on **App Settings** (the bottom of the Apps screen), not the main Apps
    screen.
  - Use the remote's **123** on-screen pad, try `00000`, or use a USB keyboard.
- **`sdb connect` fails.**
  - Host PC IP must match the computer's current IP.
  - The TV must have been fully restarted after setting it.
  - Both devices must be on the same network (see step 2).
- **"Failed to install Tizen application" with no other detail.** Usually the TV's DUID
  isn't in the distributor certificate (step 5).
- **An app is missing from the list.** Only apps installed on the TV are shown. Check
  Settings → Apps.
- **An HDMI input doesn't appear.** The TV only reports a port as connected while the device
  is on and sending a picture. Turn it on, or reseat the cable; the list updates live.
- **The Mac won't join Wi-Fi after setup.** Run `sudo networksetup -setdhcp Wi-Fi` (see step 2).

## License

MIT. See [LICENSE](LICENSE).
