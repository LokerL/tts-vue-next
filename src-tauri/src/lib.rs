mod audio;
mod commands;
mod edge_tts;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::tts::tts_convert,
            commands::tts::tts_stop,
            commands::voices::get_voices,
            commands::file::read_text_file,
            commands::file::select_folder,
            commands::file::show_in_folder,
            commands::audio::convert_audio_format,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
