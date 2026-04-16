use tauri::command;

use crate::audio::ffmpeg;

#[command]
pub async fn convert_audio_format(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<(), String> {
    ffmpeg::convert_audio(&input_path, &output_path, &format).await
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
    async fn test_convert_audio_format_rejects_unknown_format() {
        let input_path = unique_temp_path("mp3");
        tokio::fs::write(&input_path, b"fake mp3").await.unwrap();
        let output_path = unique_temp_path("aac");

        let error = convert_audio_format(
            input_path.to_string_lossy().into_owned(),
            output_path.to_string_lossy().into_owned(),
            "aac".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(error, "Unsupported audio format: aac");
        let _ = tokio::fs::remove_file(input_path).await;
    }

    fn unique_temp_path(extension: &str) -> PathBuf {
        env::temp_dir().join(format!("tts-vue-next-{}.{}", Uuid::new_v4(), extension))
    }
}
