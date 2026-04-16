use std::process::Stdio;

use tokio::process::Command;

const SUPPORTED_FORMATS: &[&str] = &["mp3", "wav", "ogg", "flac"];

pub async fn convert_audio(input_path: &str, output_path: &str, format: &str) -> Result<(), String> {
    validate_format(format)?;

    let mut command = Command::new("ffmpeg");
    command
        .arg("-i")
        .arg(input_path)
        .arg("-y")
        .args(format_args(format))
        .arg(output_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = command
        .output()
        .await
        .map_err(|error| format!("Failed to run ffmpeg: {error}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err("ffmpeg error: unknown error".to_string())
        } else {
            Err(format!("ffmpeg error: {stderr}"))
        }
    }
}

pub async fn save_audio(audio_bytes: &[u8], output_path: &str, format: &str) -> Result<(), String> {
    validate_format(format)?;

    if format == "mp3" {
        return tokio::fs::write(output_path, audio_bytes)
            .await
            .map_err(|error| format!("Failed to write file: {error}"));
    }

    let temp_mp3_path = format!("{output_path}.tmp.mp3");
    tokio::fs::write(&temp_mp3_path, audio_bytes)
        .await
        .map_err(|error| format!("Failed to write temp file: {error}"))?;

    let result = convert_audio(&temp_mp3_path, output_path, format).await;
    let _ = tokio::fs::remove_file(&temp_mp3_path).await;
    result
}

fn validate_format(format: &str) -> Result<(), String> {
    if SUPPORTED_FORMATS.contains(&format) {
        Ok(())
    } else {
        Err(format!("Unsupported audio format: {format}"))
    }
}

fn format_args(format: &str) -> Vec<&'static str> {
    match format {
        "mp3" => vec![],
        "wav" => vec!["-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2"],
        "ogg" => vec!["-acodec", "libvorbis", "-q:a", "5"],
        "flac" => vec!["-acodec", "flac"],
        _ => vec![],
    }
}
