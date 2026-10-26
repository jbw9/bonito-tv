package tv.bonito;

import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

// Spotify's player needs DRM (EME) and audio. In its own file, not nested, because
// build-tools 34's d8 crashes on nested classes compiled by recent JDKs.
class Chrome extends WebChromeClient {
    @Override
    public void onPermissionRequest(PermissionRequest request) {
        request.grant(request.getResources());
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage m) {
        Log.d("Bonito", m.message());
        return true;
    }
}
