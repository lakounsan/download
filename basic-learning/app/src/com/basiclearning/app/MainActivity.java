package com.basiclearning.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * BasicLearning — ថ្នាក់មូលដ្ឋាន
 * Fullscreen WebView shell hosting the offline learning app (assets/index.html).
 */
public class MainActivity extends Activity {

    private WebView webView;
    private volatile String currentPage = "home";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#4F46E5"));
        w.setNavigationBarColor(Color.parseColor("#EEF2FF"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#EEF2FF"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadsImagesAutomatically(true);
        // allow bundled speech MP3s to start right when a lesson opens (v1.2)
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // keep everything inside the app
                return false;
            }
        });

        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    /** Small bridge exposed to JavaScript as window.AndroidBridge */
    public class Bridge {

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void notifyPage(final String page) {
            currentPage = page;
        }
    }

    @Override
    public void onBackPressed() {
        if ("home".equals(currentPage)) {
            super.onBackPressed();
        } else {
            webView.evaluateJavascript(
                    "if (window.appBack) { appBack(); }", null);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }
}
