use tauri::command;

#[command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    let _ = path;
    Ok(String::new())
}

#[command]
pub async fn select_folder() -> Result<Option<String>, String> {
    Ok(None)
}

#[command]
pub async fn show_in_folder(path: String) -> Result<(), String> {
    let _ = path;
    Ok(())
}
