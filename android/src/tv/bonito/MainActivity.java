package tv.bonito;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

// The launcher (app/) as a full-screen web page, with a small bridge so it can list
// and open the TV's apps and change the volume, as it does through Tizen on Samsung.
public class MainActivity extends Activity {
    static final String URL = "https://jbw9.github.io/bonito-tv/app/?android";
    WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // Honour the page's width=1920 viewport and zoom out to fit, as the TV's browser does.
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new Chrome());
        web.addJavascriptInterface(new Bridge(this), "AndroidTV");
        setContentView(web);
        // Without focus the first D-pad press goes nowhere.
        web.requestFocus();
        String url = getIntent().getStringExtra("url");
        web.loadUrl(url != null ? url : URL);
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    // Back and the media keys go to the page, which decides what they do (Back on its
    // home screen calls AndroidTV.exit()).
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        String k = null;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_BACK: k = "back"; break;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: k = "toggle"; break;
            case KeyEvent.KEYCODE_MEDIA_NEXT: k = "next"; break;
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS: k = "prev"; break;
        }
        if (k == null) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0)
            web.evaluateJavascript("window.tvKey && tvKey('" + k + "')", null);
        return true;
    }
}
