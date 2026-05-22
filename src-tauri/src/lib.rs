use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Debug builds load the local dev server instead of the production URL.
            // build.devUrl in tauri.conf.json only signals "wait for this server" — it does
            // not override app.windows[].url, so we navigate programmatically here.
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval(
                    "window.location.replace('http://localhost:3000/tauri-app')"
                );
            }

            // Handle OAuth deep-link callbacks: remnus://auth?token=<jwt>
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    if url.scheme() == "remnus" {
                        let token = url
                            .query_pairs()
                            .find(|(k, _)| k == "token")
                            .map(|(_, v)| v.into_owned());
                        if let Some(token) = token {
                            #[cfg(not(debug_assertions))]
                            let activate_url = format!(
                                "https://remnus.com/api/auth/client-activate?token={}",
                                token
                            );
                            #[cfg(debug_assertions)]
                            let activate_url = format!(
                                "http://localhost:3000/api/auth/client-activate?token={}",
                                token
                            );
                            if let Some(window) = handle.get_webview_window("main") {
                                let js = format!("window.location.replace('{}')", activate_url);
                                let _ = window.eval(&js);
                            }
                        }
                    }
                }
            });

            // Hide to tray on window close instead of quitting.
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
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
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
