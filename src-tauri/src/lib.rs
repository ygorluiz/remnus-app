use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_updater::UpdaterExt;

const ZOOM_INIT: &str = "(function(){try{var z=parseFloat(localStorage.getItem('remnus_desktop_zoom'));if(z&&z>=0.5&&z<=2.0){var el=document.documentElement;el.style.zoom=String(z);if(z<1){var p=(100/z).toFixed(2)+'%';el.style.width=p;el.style.height=p;el.style.overflow='hidden';}}}catch(e){}})();";

/// Bring the existing main window to the foreground (used when a second
/// instance is launched or the tray icon is clicked).
fn focus_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Handle a `remnus://auth?token=<jwt>` deep-link URL by navigating the main
/// webview to the client-activate endpoint. Shared between the macOS
/// `on_open_url` handler and the Windows/Linux single-instance argv path.
fn handle_deep_link_url<R: tauri::Runtime>(app: &tauri::AppHandle<R>, url: &url::Url) {
    if url.scheme() != "remnus" {
        return;
    }
    let token = url
        .query_pairs()
        .find(|(k, _)| k == "token")
        .map(|(_, v)| v.into_owned());
    if let Some(token) = token {
        #[cfg(not(debug_assertions))]
        let base = "https://remnus.com/api/auth/client-activate";
        #[cfg(debug_assertions)]
        let base = "http://localhost:3000/api/auth/client-activate";
        // Build a parsed URL and navigate via the typed API instead of
        // interpolating the token into a JS string (eval) — avoids code
        // injection from a crafted remnus:// deep-link (argv on Windows/Linux).
        // The token is set via the URL API so it is properly percent-encoded and
        // cannot inject extra query params / fragments.
        if let Ok(mut target) = url::Url::parse(base) {
            target.query_pairs_mut().append_pair("token", &token);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.navigate(target);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // MUST be the first plugin. When a second instance is launched, this
        // callback runs in the already-running (primary) instance and the new
        // process exits immediately — preventing duplicate windows/processes.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Windows/Linux deliver deep-link URLs as a process argument to the
            // second instance; forward any remnus:// URL to the primary window.
            for arg in &argv {
                if let Ok(url) = url::Url::parse(arg) {
                    if url.scheme() == "remnus" {
                        handle_deep_link_url(app, &url);
                    }
                }
            }
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            let url = "http://localhost:3000/tauri-app";
            #[cfg(not(debug_assertions))]
            let url = "https://remnus.com/tauri-app";

            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(url.parse().unwrap()),
            )
            .title("Remnus")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .center()
            .decorations(false)
            .shadow(true)
            // Disable Tauri's OS-level drag-and-drop interception so the WebView
            // receives native HTML5 dragover/drop events. Without this, kanban/
            // calendar card dragging and the Notion-import file drop silently fail
            // in the desktop app (they work in the browser).
            .disable_drag_drop_handler()
            .additional_browser_args("--disable-spell-checking --disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection")
            .initialization_script(ZOOM_INIT)
            .build()?;

            // Hide to tray on window close instead of quitting.
            let win = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win.hide();
                }
            });

            // Handle OAuth deep-link callbacks: remnus://auth?token=<jwt>
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_deep_link_url(&handle, &url);
                }
            });

            // Check for updates in the background after a short delay.
            // Emits "update-available" with { version, body } when an update is found.
            #[cfg(not(debug_assertions))]
            {
                let update_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    if let Ok(updater) = update_handle.updater() {
                        if let Ok(Some(update)) = updater.check().await {
                            let version = update.version.clone();
                            let body = update.body.clone().unwrap_or_default();
                            let _ = update_handle.emit(
                                "update-available",
                                serde_json::json!({ "version": version, "body": body }),
                            );
                        }
                    }
                });
            }

            let quit = MenuItem::with_id(app, "quit", "Quit Remnus", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Remnus")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => focus_main_window(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        focus_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
