// Tauri backend for SubSpace Voice-to-Text Application
// Handles secure API key management - NEVER expose keys to frontend

use std::env;
use std::path::PathBuf;

/// Load environment variables from .env file
fn load_env_file() {
    // Try multiple locations for .env file
    let possible_paths = [
        // Project root (parent of src-tauri)
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.env"),
        // Current directory
        PathBuf::from(".env"),
        // src-tauri directory
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".env"),
    ];

    for env_path in possible_paths.iter() {
        if let Ok(canonical) = env_path.canonicalize() {
            if canonical.exists() {
                if let Ok(contents) = std::fs::read_to_string(&canonical) {
                    for line in contents.lines() {
                        let line = line.trim();
                        if line.is_empty() || line.starts_with('#') {
                            continue;
                        }
                        if let Some((key, value)) = line.split_once('=') {
                            let key = key.trim();
                            let value = value.trim().trim_matches('"').trim_matches('\'');
                            if !key.is_empty() {
                                std::env::set_var(key, value);
                            }
                        }
                    }
                    println!("Loaded .env from: {:?}", canonical);
                    return;
                }
            }
        }
    }
    println!("No .env file found");
}

/// Command to get the Deepgram API key securely from environment
/// The frontend calls this to get the key for WebSocket connection
#[tauri::command]
fn get_deepgram_api_key() -> Result<String, String> {
    // Try to get API key from environment variable
    // In production, this should be set via system environment or .env file
    env::var("DEEPGRAM_API_KEY").map_err(|_| {
        "DEEPGRAM_API_KEY environment variable not set. Please set it before running the app."
            .to_string()
    })
}

/// Command to check if API key is configured
#[tauri::command]
fn is_api_key_configured() -> bool {
    env::var("DEEPGRAM_API_KEY").is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file in debug mode
    #[cfg(debug_assertions)]
    load_env_file();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_deepgram_api_key,
            is_api_key_configured
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
