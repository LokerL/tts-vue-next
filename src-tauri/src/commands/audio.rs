use tauri::command;

#[command]
pub async fn convert_audio_format(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<(), String> {
    let _ = (input_path, output_path, format);
    Ok(())
}
