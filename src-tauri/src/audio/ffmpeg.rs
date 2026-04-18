use std::env;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use tauri::utils::platform;
use tokio::process::Command;

const SUPPORTED_FORMATS: &[&str] = &["mp3", "wav", "ogg", "flac"];
const FFMPEG_ENV_VAR: &str = "TTS_VUE_NEXT_FFMPEG";
const BUNDLED_FFMPEG_BINARY: &str = "ffmpeg";
const DEFAULT_FFMPEG_BINARY: &str = "ffmpeg";

struct ResolvedFFmpegProgram {
    program: String,
    source: FFmpegProgramSource,
}

enum FFmpegProgramSource {
    Bundled,
    Configured,
    PathFallback,
}

pub async fn convert_audio(input_path: &str, output_path: &str, format: &str) -> Result<(), String> {
    validate_format(format)?;

    let resolved_program = resolve_ffmpeg_program()?;
    let mut command = Command::new(&resolved_program.program);
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
        .map_err(|error| format_ffmpeg_launch_error(&resolved_program, error))?;

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

fn resolve_ffmpeg_program() -> Result<ResolvedFFmpegProgram, String> {
    if let Some(program) = resolve_bundled_ffmpeg_program() {
        return Ok(ResolvedFFmpegProgram {
            program,
            source: FFmpegProgramSource::Bundled,
        });
    }

    let configured_program = env::var(FFMPEG_ENV_VAR)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(program) = configured_program {
        if !Path::new(&program).is_file() {
            return Err(format!(
                "Configured ffmpeg binary from {FFMPEG_ENV_VAR} does not exist: {program}"
            ));
        }

        return Ok(ResolvedFFmpegProgram {
            program,
            source: FFmpegProgramSource::Configured,
        });
    }

    Ok(ResolvedFFmpegProgram {
        program: DEFAULT_FFMPEG_BINARY.to_string(),
        source: FFmpegProgramSource::PathFallback,
    })
}

fn resolve_bundled_ffmpeg_program() -> Option<String> {
    let program = bundled_ffmpeg_path().ok()?;
    program.is_file().then(|| program.to_string_lossy().into_owned())
}

fn bundled_ffmpeg_path() -> Result<PathBuf, std::io::Error> {
    let exe_path = platform::current_exe()?;
    let exe_dir = exe_path.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "current executable has no parent")
    })?;
    let base_dir = if exe_dir.ends_with("deps") {
        exe_dir.parent().unwrap_or(exe_dir)
    } else {
        exe_dir
    };

    Ok(base_dir.join(sidecar_filename()))
}

fn sidecar_filename() -> &'static str {
    if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        BUNDLED_FFMPEG_BINARY
    }
}

fn format_ffmpeg_launch_error(resolved_program: &ResolvedFFmpegProgram, error: std::io::Error) -> String {
    match resolved_program.source {
        FFmpegProgramSource::Bundled => format!(
            "Failed to run bundled ffmpeg ({}): {}. The packaged runtime may be missing or invalid.",
            resolved_program.program, error
        ),
        FFmpegProgramSource::Configured => format!(
            "Failed to run ffmpeg from {FFMPEG_ENV_VAR} ({}): {}",
            resolved_program.program, error
        ),
        FFmpegProgramSource::PathFallback => format!(
            "Failed to run ffmpeg from PATH ({}): {}. Bundled ffmpeg was unavailable, and the development PATH fallback also failed.",
            resolved_program.program, error
        ),
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};
    use std::sync::LazyLock;

    use tokio::sync::Mutex;
    use uuid::Uuid;

    static TEST_MUTEX: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

    #[tokio::test]
    async fn test_bundled_ffmpeg_binary_is_available_for_execution() {
        let _guard = TEST_MUTEX.lock().await;
        env::remove_var(FFMPEG_ENV_VAR);

        let resolved_program = resolve_ffmpeg_program().unwrap();
        match resolved_program.source {
            FFmpegProgramSource::Bundled => {}
            _ => panic!("expected bundled ffmpeg runtime"),
        }

        let output = Command::new(&resolved_program.program)
            .arg("-version")
            .output()
            .await
            .unwrap();

        assert!(output.status.success());
    }

    #[tokio::test]
    async fn test_resolve_ffmpeg_program_prefers_bundled_binary_over_env_override() {
        let _guard = TEST_MUTEX.lock().await;
        let bundled_ffmpeg_path = bundled_ffmpeg_path_for_current_test_exe();
        let missing_ffmpeg_path = unique_temp_path(script_extension());
        let backup_path = if bundled_ffmpeg_path.exists() {
            let backup_path = unique_temp_path(script_extension());
            tokio::fs::copy(&bundled_ffmpeg_path, &backup_path)
                .await
                .unwrap();
            Some(backup_path)
        } else {
            None
        };

        tokio::fs::write(&bundled_ffmpeg_path, b"bundled ffmpeg marker")
            .await
            .unwrap();

        env::set_var(FFMPEG_ENV_VAR, &missing_ffmpeg_path);
        let resolved_program = resolve_ffmpeg_program();
        env::remove_var(FFMPEG_ENV_VAR);

        if let Some(backup_path) = backup_path {
            tokio::fs::copy(&backup_path, &bundled_ffmpeg_path)
                .await
                .unwrap();
            let _ = tokio::fs::remove_file(backup_path).await;
        } else {
            let _ = tokio::fs::remove_file(&bundled_ffmpeg_path).await;
        }

        assert_eq!(
            resolved_program.unwrap().program,
            bundled_ffmpeg_path.to_string_lossy().into_owned()
        );
    }

    #[tokio::test]
    async fn test_convert_audio_reports_bundled_ffmpeg_failure() {
        let _guard = TEST_MUTEX.lock().await;
        let input_path = unique_temp_path("mp3");
        let output_path = unique_temp_path("ogg");
        let bundled_ffmpeg_path = bundled_ffmpeg_path_for_current_test_exe();
        let backup_path = backup_bundled_ffmpeg().await;
        tokio::fs::write(&input_path, b"fake mp3 bytes").await.unwrap();
        tokio::fs::write(&bundled_ffmpeg_path, b"not an executable")
            .await
            .unwrap();
        env::remove_var(FFMPEG_ENV_VAR);

        let error = convert_audio(
            input_path.to_string_lossy().as_ref(),
            output_path.to_string_lossy().as_ref(),
            "ogg",
        )
        .await
        .unwrap_err();

        restore_bundled_ffmpeg(backup_path).await;

        assert!(error.to_ascii_lowercase().contains("bundled"));
        assert!(!error.contains("Install ffmpeg"));

        let _ = tokio::fs::remove_file(input_path).await;
        let _ = tokio::fs::remove_file(output_path).await;
    }

    #[tokio::test]
    async fn test_path_launch_error_mentions_bundled_runtime_unavailability() {
        let error = format_ffmpeg_launch_error(
            &ResolvedFFmpegProgram {
                program: DEFAULT_FFMPEG_BINARY.to_string(),
                source: FFmpegProgramSource::PathFallback,
            },
            std::io::Error::new(std::io::ErrorKind::NotFound, "program not found"),
        );

        assert!(error.to_ascii_lowercase().contains("bundled"));
        assert!(!error.contains("Install ffmpeg"));
    }

    #[tokio::test]
    async fn test_convert_audio_reports_configured_ffmpeg_path() {
        let _guard = TEST_MUTEX.lock().await;
        let input_path = unique_temp_audio_path();
        let output_path = unique_temp_path("ogg");
        let missing_ffmpeg_path = unique_temp_path(script_extension());
        let backup_path = backup_bundled_ffmpeg().await;
        tokio::fs::write(&input_path, b"fake mp3 bytes")
            .await
            .unwrap();

        env::set_var(FFMPEG_ENV_VAR, &missing_ffmpeg_path);
        let error = convert_audio(
            input_path.to_string_lossy().as_ref(),
            output_path.to_string_lossy().as_ref(),
            "ogg",
        )
        .await
        .unwrap_err();
        env::remove_var(FFMPEG_ENV_VAR);
        restore_bundled_ffmpeg(backup_path).await;

        assert!(error.contains(FFMPEG_ENV_VAR));
        assert!(error.contains(missing_ffmpeg_path.to_string_lossy().as_ref()));

        let _ = tokio::fs::remove_file(input_path).await;
    }

    #[tokio::test]
    async fn test_save_audio_uses_configured_ffmpeg_for_non_mp3_output() {
        let _guard = TEST_MUTEX.lock().await;
        let output_path = unique_temp_path("ogg");
        let fake_ffmpeg_path = unique_temp_path(script_extension());
        let temp_mp3_path = format!("{}.tmp.mp3", output_path.to_string_lossy());
        let backup_path = backup_bundled_ffmpeg().await;
        create_fake_ffmpeg(&fake_ffmpeg_path).await;

        env::set_var(FFMPEG_ENV_VAR, &fake_ffmpeg_path);
        let result = save_audio(
            b"fake mp3 bytes",
            output_path.to_string_lossy().as_ref(),
            "ogg",
        )
        .await;
        env::remove_var(FFMPEG_ENV_VAR);
        restore_bundled_ffmpeg(backup_path).await;

        assert!(result.is_ok(), "{result:?}");
        assert_eq!(tokio::fs::read(&output_path).await.unwrap(), b"fake mp3 bytes");
        assert!(!Path::new(&temp_mp3_path).exists());

        let _ = tokio::fs::remove_file(output_path).await;
        let _ = tokio::fs::remove_file(fake_ffmpeg_path).await;
    }

    #[tokio::test]
    async fn test_convert_audio_format_command_uses_configured_ffmpeg_for_non_mp3_output() {
        let _guard = TEST_MUTEX.lock().await;
        let input_path = unique_temp_audio_path();
        let output_path = unique_temp_path("ogg");
        let fake_ffmpeg_path = unique_temp_path(script_extension());
        let backup_path = backup_bundled_ffmpeg().await;
        create_fake_ffmpeg(&fake_ffmpeg_path).await;
        tokio::fs::write(&input_path, b"fake mp3 bytes")
            .await
            .unwrap();

        env::set_var(FFMPEG_ENV_VAR, &fake_ffmpeg_path);
        let result = crate::commands::audio::convert_audio_format(
            input_path.to_string_lossy().into_owned(),
            output_path.to_string_lossy().into_owned(),
            "ogg".to_string(),
        )
        .await;
        env::remove_var(FFMPEG_ENV_VAR);
        restore_bundled_ffmpeg(backup_path).await;

        assert!(result.is_ok(), "{result:?}");
        assert_eq!(tokio::fs::read(&output_path).await.unwrap(), b"fake mp3 bytes");

        let _ = tokio::fs::remove_file(input_path).await;
        let _ = tokio::fs::remove_file(output_path).await;
        let _ = tokio::fs::remove_file(fake_ffmpeg_path).await;
    }

    async fn backup_bundled_ffmpeg() -> Option<PathBuf> {
        let bundled_ffmpeg_path = bundled_ffmpeg_path_for_current_test_exe();
        if bundled_ffmpeg_path.exists() {
            let backup_path = unique_temp_path(script_extension());
            tokio::fs::copy(&bundled_ffmpeg_path, &backup_path)
                .await
                .unwrap();
            tokio::fs::remove_file(&bundled_ffmpeg_path).await.unwrap();
            Some(backup_path)
        } else {
            None
        }
    }

    async fn restore_bundled_ffmpeg(backup_path: Option<PathBuf>) {
        let bundled_ffmpeg_path = bundled_ffmpeg_path_for_current_test_exe();
        if let Some(path) = backup_path {
            tokio::fs::copy(&path, &bundled_ffmpeg_path).await.unwrap();
            let _ = tokio::fs::remove_file(path).await;
        } else {
            let _ = tokio::fs::remove_file(&bundled_ffmpeg_path).await;
        }
    }

    async fn create_fake_ffmpeg(path: &Path) {
        #[cfg(target_os = "windows")]
        let script = "@echo off\r\nsetlocal enabledelayedexpansion\r\nset \"last=\"\r\nfor %%a in (%*) do set \"last=%%~a\"\r\ncopy /y \"%~2\" \"!last!\" >nul\r\n";

        #[cfg(not(target_os = "windows"))]
        let script = "#!/bin/sh\nfor last do :; done\ncp \"$2\" \"$last\"\n";

        tokio::fs::write(path, script).await.unwrap();

        #[cfg(not(target_os = "windows"))]
        {
            use std::os::unix::fs::PermissionsExt;

            let permissions = std::fs::Permissions::from_mode(0o755);
            tokio::fs::set_permissions(path, permissions).await.unwrap();
        }
    }

    fn script_extension() -> &'static str {
        #[cfg(target_os = "windows")]
        {
            "cmd"
        }

        #[cfg(not(target_os = "windows"))]
        {
            "sh"
        }
    }

    fn unique_temp_audio_path() -> PathBuf {
        env::temp_dir().join(format!("tts-vue-next-{}.tmp.mp3", Uuid::new_v4()))
    }

    fn unique_temp_path(extension: &str) -> PathBuf {
        env::temp_dir().join(format!("tts-vue-next-{}.{}", Uuid::new_v4(), extension))
    }

    fn bundled_ffmpeg_path_for_current_test_exe() -> PathBuf {
        super::bundled_ffmpeg_path().unwrap()
    }

    fn sidecar_filename() -> String {
        super::sidecar_filename().to_string()
    }
}
