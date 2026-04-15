use tauri::command;

use crate::edge_tts::types::Voice;

#[command]
pub async fn get_voices() -> Result<Vec<Voice>, String> {
    Ok(vec![])
}
