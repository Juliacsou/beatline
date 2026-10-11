package com.beatline.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
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
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String LOG_TAG = "BeatlineAndroid";
    private static final String PREFERENCES = "beatline_diagnostics";
    private static final String LAST_CRASH = "last_crash";
    private static final int YELLOW = Color.rgb(255, 226, 76);
    private static final int PINK = Color.rgb(249, 52, 165);
    private static final int BLACK = Color.rgb(17, 17, 17);

    private FrameLayout root;
    private WebView webView;
    private LinearLayout errorPanel;
    private TextView errorTitle;
    private TextView errorDetails;
    private TextView technicalDetails;
    private boolean mainPageFailed;
    private String report = "";
    private Bundle restoredState;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installCrashDiagnostics();
        restoredState = savedInstanceState;
        createNativeUi();
        // Apply immersive flags only after the Activity owns a content view.
        showImmersive();

        String crash = getSharedPreferences(PREFERENCES, MODE_PRIVATE).getString(LAST_CRASH, "");
        if (!crash.isEmpty()) {
            getSharedPreferences(PREFERENCES, MODE_PRIVATE).edit().remove(LAST_CRASH).apply();
            showError("FALHA NA INICIALIZACAO", "O Android encerrou o app na tentativa anterior. Copie o diagnostico e envie para corrigirmos.", crash);
            return;
        }
        startGame();
    }

    private void installCrashDiagnostics() {
        Thread.UncaughtExceptionHandler former = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            String trace = stackTrace(throwable);
            try {
                getSharedPreferences(PREFERENCES, MODE_PRIVATE).edit().putString(LAST_CRASH, trace).commit();
                Log.e(LOG_TAG, "Uncaught exception", throwable);
            } catch (Throwable ignored) {
                // Never interfere with Android's normal crash handling.
            }
            if (former != null) former.uncaughtException(thread, throwable);
        });
    }

    private void createNativeUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(YELLOW);
        setContentView(root);

        ScrollView errorScroll = new ScrollView(this);
        errorScroll.setFillViewport(true);
        errorScroll.setBackgroundColor(YELLOW);
        errorScroll.setVisibility(View.GONE);
        root.addView(errorScroll, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(26), dp(20), dp(26), dp(26));
        errorScroll.addView(errorPanel, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(100), dp(100));
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
        errorTitle.setTextSize(18);
        errorTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        errorTitle.setTextColor(BLACK);
        errorTitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dp(22);
        errorPanel.addView(errorTitle, titleParams);

        errorDetails = new TextView(this);
        errorDetails.setTextSize(15);
        errorDetails.setTextColor(BLACK);
        errorDetails.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams detailsParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        detailsParams.topMargin = dp(12);
        errorPanel.addView(errorDetails, detailsParams);

        technicalDetails = new TextView(this);
        technicalDetails.setTextSize(11);
        technicalDetails.setTextColor(BLACK);
        technicalDetails.setMaxLines(7);
        technicalDetails.setVisibility(View.GONE);
        LinearLayout.LayoutParams technicalParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        technicalParams.topMargin = dp(12);
        errorPanel.addView(technicalDetails, technicalParams);

        Button retry = makeButton("TENTAR NOVAMENTE", PINK);
        retry.setOnClickListener(v -> startGame());
        errorPanel.addView(retry, actionParams());

        Button copy = makeButton("COPIAR DIAGNOSTICO", Color.WHITE);
        copy.setOnClickListener(v -> {
            if (!report.isEmpty()) {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(ClipData.newPlainText("Erro BEATLINE", report));
                    Toast.makeText(this, "Diagnostico copiado!", Toast.LENGTH_SHORT).show();
                }
            }
        });
        errorPanel.addView(copy, actionParams());

        Button browser = makeButton("ABRIR NO NAVEGADOR", YELLOW);
        browser.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.GAME_URL)));
            } catch (ActivityNotFoundException ex) {
                Toast.makeText(this, "Navegador indisponivel.", Toast.LENGTH_SHORT).show();
            }
        });
        errorPanel.addView(browser, actionParams());

        // Store the overlay itself so WebView can be inserted underneath it.
        errorScroll.setTag("error_overlay");
    }

    private Button makeButton(String label, int color) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(BLACK);
        button.setTextSize(14);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        GradientDrawable background = new GradientDrawable();
        background.setColor(color);
        background.setCornerRadius(dp(15));
        background.setStroke(dp(2), BLACK);
        button.setBackground(background);
        return button;
    }

    private LinearLayout.LayoutParams actionParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        params.topMargin = dp(12);
        params.leftMargin = dp(10);
        params.rightMargin = dp(10);
        return params;
    }

    private View errorOverlay() {
        return root.findViewWithTag("error_overlay");
    }

    private void startGame() {
        if (BuildConfig.GAME_URL.contains("not-configured.invalid")) {
            showError("ENDERECO NAO CONFIGURADO", "Confira a URL do GitHub Pages no GitHub Actions.", "BuildConfig.GAME_URL nao configurada");
            return;
        }
        try {
            mainPageFailed = false;
            if (webView == null) {
                WebView created = new WebView(this);
                webView = created;
                created.setBackgroundColor(YELLOW);
                root.addView(created, 0, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                configureWebView(created);
            }
            errorOverlay().setVisibility(View.GONE);
            if (restoredState != null) {
                Bundle previous = restoredState;
                restoredState = null;
                if (webView.restoreState(previous) == null) webView.loadUrl(BuildConfig.GAME_URL);
            } else {
                webView.loadUrl(BuildConfig.GAME_URL);
            }
        } catch (Throwable ex) {
            Log.e(LOG_TAG, "WebView initialization failed", ex);
            disposeWebView();
            showError("NAO FOI POSSIVEL ABRIR", "O componente Android WebView nao conseguiu iniciar. Confira se Android System WebView e Chrome estao atualizados.", stackTrace(ex));
        }
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        view.setWebChromeClient(new WebChromeClient());
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri destination = request.getUrl();
                if (isAdminPage(destination)) {
                    Toast.makeText(MainActivity.this, "A ADM esta disponivel apenas no navegador.", Toast.LENGTH_SHORT).show();
                    return true;
                }
                if (isGamePage(destination)) return false;
                if ("https".equalsIgnoreCase(destination.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, destination));
                    } catch (ActivityNotFoundException ex) {
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
                if (!mainPageFailed && isGamePage(Uri.parse(url))) errorOverlay().setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainPageFailed = true;
                    showError("SEM CONEXAO", "Verifique a internet e tente novamente.", "WebView: " + error.getDescription());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    mainPageFailed = true;
                    showError("PAGINA INDISPONIVEL", "Confira a publicacao no GitHub Pages.", "HTTP " + response.getStatusCode() + " - " + request.getUrl());
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                String reason = "O processo da WebView foi encerrado (" + (detail.didCrash() ? "falha" : "memoria") + ").";
                disposeWebView();
                showError("WEBVIEW REINICIADA", "Toque em tentar novamente para recarregar o jogo.", reason);
                return true;
            }
        });
    }

    private boolean isGamePage(Uri destination) {
        Uri base = Uri.parse(BuildConfig.GAME_URL);
        if (!"https".equalsIgnoreCase(destination.getScheme())) return false;
        if (!sameHost(destination.getHost(), base.getHost())) return false;
        int portA = base.getPort() < 0 ? 443 : base.getPort();
        int portB = destination.getPort() < 0 ? 443 : destination.getPort();
        if (portA != portB) return false;
        String prefix = base.getPath() == null ? "/" : base.getPath();
        if (!prefix.endsWith("/")) prefix += "/";
        String path = destination.getPath() == null ? "/" : destination.getPath();
        return path.startsWith(prefix) && !isAdminPage(destination);
    }

    private boolean isAdminPage(Uri destination) {
        String path = destination.getPath();
        if (path == null) return false;
        String normalized = path.toLowerCase(Locale.ROOT);
        return normalized.endsWith("/admin.html") || normalized.endsWith("/admin") || normalized.contains("/admin/");
    }

    private boolean sameHost(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    private void showError(String title, String description, String details) {
        errorTitle.setText(title);
        errorDetails.setText(description);
        report = "BEATLINE Android v1.1.0\n" + title + "\n" + details;
        technicalDetails.setText(details.length() > 430 ? details.substring(0, 430) + "..." : details);
        technicalDetails.setVisibility(details.isEmpty() ? View.GONE : View.VISIBLE);
        errorOverlay().setVisibility(View.VISIBLE);
    }

    private static String stackTrace(Throwable ex) {
        StringWriter output = new StringWriter();
        ex.printStackTrace(new PrintWriter(output));
        return output.toString();
    }

    private int dp(float n) {
        return Math.round(n * getResources().getDisplayMetrics().density);
    }

    private void showImmersive() {
        try {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    WindowManager.LayoutParams.FLAG_FULLSCREEN);
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        } catch (RuntimeException ex) {
            Log.w(LOG_TAG, "Fullscreen not available on this device", ex);
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
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
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
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    private void disposeWebView() {
        if (webView == null) return;
        WebView previous = webView;
        webView = null;
        root.removeView(previous);
        try {
            previous.stopLoading();
            previous.destroy();
        } catch (RuntimeException ex) {
            Log.w(LOG_TAG, "Unable to dispose WebView", ex);
        }
    }

    @Override
    protected void onDestroy() {
        disposeWebView();
        super.onDestroy();
    }
}
