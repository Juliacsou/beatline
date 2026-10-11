package com.beatline.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int YELLOW = Color.rgb(255, 226, 76);
    private static final int PINK = Color.rgb(249, 52, 165);
    private static final int BLACK = Color.rgb(17, 17, 17);

    private WebView webView;
    private LinearLayout errorPanel;
    private TextView errorTitle;
    private TextView errorDetails;
    private boolean mainPageFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showImmersive();
        createUi();
        configureWebView();

        // Always start on the public game. The admin page is intentionally
        // not bundled or exposed in this Android application.
        if (BuildConfig.GAME_URL.contains("not-configured.invalid")) {
            showError("URL NAO CONFIGURADA", "Configure o endereco do GitHub Pages no build do APK.");
        } else if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.GAME_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void createUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(YELLOW);

        webView = new WebView(this);
        webView.setBackgroundColor(YELLOW);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(20), dp(28), dp(20));
        errorPanel.setBackgroundColor(YELLOW);
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(112), dp(112));
        logoParams.bottomMargin = dp(12);
        errorPanel.addView(logo, logoParams);

        TextView brand = new TextView(this);
        brand.setText("BEAT//LINE");
        brand.setTextSize(29);
        brand.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brand.setTextColor(BLACK);
        brand.setGravity(Gravity.CENTER);
        errorPanel.addView(brand);

        errorTitle = new TextView(this);
        errorTitle.setTextSize(19);
        errorTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        errorTitle.setTextColor(BLACK);
        errorTitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dp(32);
        errorPanel.addView(errorTitle, titleParams);

        errorDetails = new TextView(this);
        errorDetails.setTextSize(15);
        errorDetails.setTextColor(BLACK);
        errorDetails.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descriptionParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        descriptionParams.topMargin = dp(10);
        errorPanel.addView(errorDetails, descriptionParams);

        Button retry = new Button(this);
        retry.setText("TENTAR NOVAMENTE");
        retry.setTextColor(BLACK);
        retry.setTextSize(14);
        retry.setAllCaps(false);
        retry.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        GradientDrawable buttonBackground = new GradientDrawable();
        buttonBackground.setColor(PINK);
        buttonBackground.setCornerRadius(dp(15));
        buttonBackground.setStroke(dp(3), BLACK);
        retry.setBackground(buttonBackground);
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(58));
        retryParams.topMargin = dp(24);
        retryParams.leftMargin = dp(20);
        retryParams.rightMargin = dp(20);
        errorPanel.addView(retry, retryParams);
        retry.setOnClickListener(view -> {
            if (BuildConfig.GAME_URL.contains("not-configured.invalid")) {
                showError("URL NAO CONFIGURADA", "Compile o APK pelo GitHub Actions no repositorio do jogo.");
            } else {
                mainPageFailed = false;
                errorPanel.setVisibility(View.GONE);
                webView.loadUrl(BuildConfig.GAME_URL);
            }
        });

        setContentView(root);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true); // Play only when player taps.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri destination = request.getUrl();
                if (isAdminPage(destination)) {
                    Toast.makeText(MainActivity.this, "Painel administrativo disponivel somente no navegador.", Toast.LENGTH_SHORT).show();
                    return true;
                }
                if (isGamePage(destination)) return false;
                if ("https".equalsIgnoreCase(destination.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, destination));
                    } catch (ActivityNotFoundException exception) {
                        Toast.makeText(MainActivity.this, "Nao foi possivel abrir o link.", Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                mainPageFailed = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!mainPageFailed && isGamePage(Uri.parse(url))) {
                    errorPanel.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainPageFailed = true;
                    showError("SEM CONEXAO", "Verifique sua internet e tente novamente.");
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    mainPageFailed = true;
                    showError("PAGINA INDISPONIVEL", "Confira se o jogo esta publicado no GitHub Pages.");
                }
            }
        });
    }

    private boolean isGamePage(Uri destination) {
        Uri base = Uri.parse(BuildConfig.GAME_URL);
        if (!"https".equalsIgnoreCase(destination.getScheme())) return false;
        if (!equalsIgnoreCase(destination.getHost(), base.getHost())) return false;
        int basePort = base.getPort() == -1 ? 443 : base.getPort();
        int destPort = destination.getPort() == -1 ? 443 : destination.getPort();
        if (basePort != destPort) return false;
        String prefix = base.getPath() == null ? "/" : base.getPath();
        if (!prefix.endsWith("/")) prefix += "/";
        String path = destination.getPath() == null ? "/" : destination.getPath();
        return path.startsWith(prefix) && !isAdminPage(destination);
    }

    private boolean isAdminPage(Uri destination) {
        String path = destination.getPath();
        if (path == null) return false;
        String normalized = path.toLowerCase(Locale.ROOT);
        return normalized.endsWith("/admin.html") || normalized.endsWith("/admin")
                || normalized.contains("/admin/");
    }

    private boolean equalsIgnoreCase(String one, String two) {
        return one != null && two != null && one.equalsIgnoreCase(two);
    }

    private void showError(String title, String description) {
        errorTitle.setText(title);
        errorDetails.setText(description);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) showImmersive();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        showImmersive();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                    .setTitle("Sair do BEAT//LINE?")
                    .setNegativeButton("Cancelar", (dialog, which) -> dialog.dismiss())
                    .setPositiveButton("Sair", (dialog, which) -> finish())
                    .show();
        }
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
