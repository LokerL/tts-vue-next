use tauri::command;

use crate::edge_tts::types::Voice;
use crate::edge_tts::voices::list_voices;

#[command]
pub async fn get_voices() -> Result<Vec<Voice>, String> {
    list_voices().await.map_err(|error| error.to_string())
}
