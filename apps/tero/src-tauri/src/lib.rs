#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
    native: bool,
    identity_vault_ready: bool,
    peer_transport_ready: bool,
    cloud_fallback_enabled: bool,
}

#[tauri::command]
fn runtime_capabilities() -> RuntimeCapabilities {
    RuntimeCapabilities {
        native: true,
        identity_vault_ready: false,
        peer_transport_ready: false,
        cloud_fallback_enabled: false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![runtime_capabilities])
        .run(tauri::generate_context!())
        .expect("failed to run Tero");
}
