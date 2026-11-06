#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
    native: bool,
    identity_vault_ready: bool,
    peer_transport_ready: bool,
    cloud_fallback_enabled: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LegacyVaultInspection {
    format_version: u8,
    kdf_log2_n: u8,
    compatible_kdf: bool,
}

/// This is a read-only format check. It never unlocks, imports, persists, or
/// returns the encrypted record, salt, passcode or device-bound secret.
#[tauri::command]
fn inspect_legacy_vault(encoded: String) -> Result<LegacyVaultInspection, &'static str> {
    let header = sefirah_identity::inspect_legacy_vault(&encoded)
        .map_err(|_| "The legacy vault format is not recognised")?;
    Ok(LegacyVaultInspection {
        format_version: 1,
        kdf_log2_n: header.log2_n,
        compatible_kdf: (10..=15).contains(&header.log2_n) && header.r == 8 && header.p == 1,
    })
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
        .invoke_handler(tauri::generate_handler![runtime_capabilities, inspect_legacy_vault])
        .run(tauri::generate_context!())
        .expect("failed to run Tero");
}
