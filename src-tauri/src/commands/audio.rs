use std::path::Path;

use tauri::command;

use crate::audio::ffmpeg;

#[command]
pub async fn convert_audio_format(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<(), String> {
    validate_temporary_audio_input_path(&input_path)?;
    validate_audio_output_path(&output_path)?;

    ffmpeg::convert_audio(&input_path, &output_path, &format).await
}

fn validate_audio_output_path(path: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    let Some(file_name) = file_path.file_name().and_then(|value| value.to_str()) else {
        return Err("Output file name is invalid".to_string());
    };
    if file_name.is_empty() {
        return Err("Output file name is invalid".to_string());
    }

    let Some(parent) = file_path.parent() else {
        return Err("Output file must include a parent directory".to_string());
    };
    if !parent.exists() {
        return Err(format!("Output directory not found: {}", parent.display()));
    }
    if !parent.is_dir() {
        return Err("Output parent path is not a directory".to_string());
    }

    let Some(extension) = file_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
    else {
        return Err("Output file must have an audio extension".to_string());
    };

    if !matches!(extension.as_str(), "mp3" | "wav" | "ogg" | "flac") {
        return Err(format!("Unsupported output file type: .{extension}"));
    }

    Ok(())
}

fn validate_temporary_audio_input_path(path: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    if !file_path.exists() {
        return Err(format!("Path not found: {path}"));
    }
    if !file_path.is_file() {
        return Err("Path is not a file".to_string());
    }

    let Some(file_name) = file_path.file_name().and_then(|value| value.to_str()) else {
        return Err("Temporary audio file name is invalid".to_string());
    };

    if !file_name.to_ascii_lowercase().ends_with(".tmp.mp3") {
        return Err("Only temporary audio files can be converted".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::path::PathBuf;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_convert_audio_format_returns_error_for_missing_input() {
        let input_path = unique_temp_path("missing.mp3");
        let output_path = unique_temp_path("wav");

        let result = convert_audio_format(
            input_path.to_string_lossy().into_owned(),
            output_path.to_string_lossy().into_owned(),
            "wav".to_string(),
        )
        .await;

        assert!(result.is_err());
        assert!(!output_path.exists());
    }

    #[tokio::test]
    async fn test_convert_audio_format_rejects_non_temporary_input_path() {
        let input_path = unique_temp_path("mp3");
        tokio::fs::write(&input_path, b"fake mp3").await.unwrap();
        let output_path = unique_temp_path("wav");

        let error = convert_audio_format(
            input_path.to_string_lossy().into_owned(),
            output_path.to_string_lossy().into_owned(),
            "wav".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(error, "Only temporary audio files can be converted");
        let _ = tokio::fs::remove_file(input_path).await;
    }

    #[tokio::test]
    async fn test_convert_audio_format_rejects_unsupported_output_extension() {
        let input_path = unique_temp_audio_path();
        tokio::fs::write(&input_path, b"fake mp3").await.unwrap();
        let output_path = unique_temp_path("txt");

        let error = convert_audio_format(
            input_path.to_string_lossy().into_owned(),
            output_path.to_string_lossy().into_owned(),
            "wav".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(error, "Unsupported output file type: .txt");
        let _ = tokio::fs::remove_file(input_path).await;
    }

    fn unique_temp_audio_path() -> PathBuf {
        env::temp_dir().join(format!("tts-vue-next-{}.tmp.mp3", Uuid::new_v4()))
    }

    fn unique_temp_path(extension: &str) -> PathBuf {
        env::temp_dir().join(format!("tts-vue-next-{}.{}", Uuid::new_v4(), extension))
    }
}
