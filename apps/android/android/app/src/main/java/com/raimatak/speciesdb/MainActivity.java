package com.raimatak.speciesdb;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import java.net.URI;
import java.net.URISyntaxException;

public class MainActivity extends BridgeActivity {

    // The start screens: the language page, the sign-in pages and the species lists. The web
    // pages open some of them with location.href, which keeps the page before in the WebView
    // history, so going back from here would reopen the sign-in page or switch the language back.
    private static final String[] ROOT_PAGES = {
        "/", "/index.html", "/login.html", "/login_tetum.html", "/home.html", "/tetum.html"
    };

    static boolean isRootPage(String url) {
        if (url == null) {
            return false;
        }
        String path;
        try {
            path = new URI(url).getPath();
        } catch (URISyntaxException e) {
            return false;
        }
        if (path == null) {
            return false;
        }
        for (String rootPage : ROOT_PAGES) {
            if (rootPage.equals(path)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // The @capacitor/app plugin registers its back callback while super.onCreate loads the
        // plugins, so this one, added later, runs first. When the WebView has an earlier page, the
        // press goes on to the plugin, which goes back in the WebView history (or tells a JS
        // 'backButton' listener). On a start screen, or on the first page, leave the app here the
        // way Android does for any other app.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = bridge != null ? bridge.getWebView() : null;
                if (webView != null && webView.canGoBack() && !isRootPage(webView.getUrl())) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || !moveTaskToBack(false)) {
                    // Android 12+ sends the app to the background, as it does for other apps;
                    // older versions close it.
                    finish();
                }
            }
        });
    }
}
