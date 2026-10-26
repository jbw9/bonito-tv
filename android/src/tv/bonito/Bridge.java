package tv.bonito;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.media.AudioManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

// What the page can ask of the TV, as window.AndroidTV.
class Bridge {
    final Activity a;

    Bridge(Activity a) {
        this.a = a;
    }

    @JavascriptInterface
    public String apps() {
        PackageManager pm = a.getPackageManager();
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        seen.add(a.getPackageName());
        for (String cat : new String[] { Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER }) {
            List<ResolveInfo> list = pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(cat), 0);
            for (ResolveInfo r : list) {
                String pkg = r.activityInfo.packageName;
                if (!seen.add(pkg)) continue;
                try {
                    out.put(new JSONObject().put("label", String.valueOf(r.loadLabel(pm))).put("pkg", pkg));
                } catch (Exception ignored) {}
            }
        }
        return out.toString();
    }

    @JavascriptInterface
    public boolean launch(String pkg) {
        PackageManager pm = a.getPackageManager();
        Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
        if (i == null) i = pm.getLaunchIntentForPackage(pkg);
        if (i == null) return false;
        a.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    @JavascriptInterface
    public String volume(String change) {
        AudioManager audio = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
        int stream = AudioManager.STREAM_MUSIC;
        if ("up".equals(change)) audio.adjustStreamVolume(stream, AudioManager.ADJUST_RAISE, 0);
        else if ("down".equals(change)) audio.adjustStreamVolume(stream, AudioManager.ADJUST_LOWER, 0);
        else if ("mute".equals(change)) audio.adjustStreamVolume(stream, AudioManager.ADJUST_TOGGLE_MUTE, 0);
        int max = Math.max(1, audio.getStreamMaxVolume(stream));
        boolean muted = android.os.Build.VERSION.SDK_INT >= 23 ? audio.isStreamMute(stream) : audio.getStreamVolume(stream) == 0;
        try {
            return new JSONObject().put("level", Math.round(audio.getStreamVolume(stream) * 100f / max)).put("muted", muted).toString();
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public void exit() {
        a.runOnUiThread(a::finish);
    }
}
