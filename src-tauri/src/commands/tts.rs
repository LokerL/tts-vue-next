use tauri::command;

#[command]
pub async fn tts_convert() -> Result<Vec<u8>, String> {
    Ok(vec![])
}

#[command]
pub async fn tts_stop() -> Result<(), String> {
    Ok(())
}
