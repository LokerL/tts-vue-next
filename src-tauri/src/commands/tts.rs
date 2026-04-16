use std::collections::HashMap;
use std::future::Future;
use std::sync::{Arc, LazyLock};

use tauri::command;
use tokio::sync::{watch, Mutex};

use crate::edge_tts::Communicate;
use crate::edge_tts::errors::EdgeTTSError;
use crate::edge_tts::types::TTSConfig;
use crate::utils::retry::retry_with_backoff;

const DUPLICATE_TASK_ERROR: &str = "Task already exists";

static ACTIVE_TASKS: LazyLock<Arc<Mutex<HashMap<String, watch::Sender<bool>>>>> =
    LazyLock::new(|| Arc::new(Mutex::new(HashMap::new())));

#[derive(serde::Deserialize)]
pub struct TtsConvertParams {
    pub text: String,
    pub voice: String,
    pub rate: String,
    pub pitch: String,
    pub volume: String,
    #[serde(default = "default_format")]
    pub format: String,
    pub task_id: String,
    #[serde(default = "default_retries")]
    pub max_retries: u32,
}

fn default_format() -> String {
    "audio-24khz-48kbitrate-mono-mp3".to_string()
}

fn default_retries() -> u32 {
    3
}

#[command]
pub async fn tts_convert(params: TtsConvertParams) -> Result<Vec<u8>, String> {
    run_tts_convert(params, 1000, |text, config, cancel_rx| async move {
        let communicate = Communicate::new(text, config, cancel_rx);
        communicate.stream_audio().await
    })
    .await
}

async fn run_tts_convert<R, Fut>(
    params: TtsConvertParams,
    base_delay_ms: u64,
    run_stream: R,
) -> Result<Vec<u8>, String>
where
    R: Fn(String, TTSConfig, watch::Receiver<bool>) -> Fut,
    Fut: Future<Output = Result<Vec<u8>, EdgeTTSError>>,
{
    let (cancel_tx, cancel_rx) = watch::channel(false);
    let task_id = params.task_id;

    {
        let mut tasks = ACTIVE_TASKS.lock().await;
        if tasks.contains_key(&task_id) {
            return Err(format!("{DUPLICATE_TASK_ERROR}: {task_id}"));
        }
        tasks.insert(task_id.clone(), cancel_tx);
    }

    let config = TTSConfig {
        voice: params.voice,
        rate: params.rate,
        pitch: params.pitch,
        volume: params.volume,
        output_format: params.format,
    };

    let text = params.text;
    let result = retry_with_backoff(params.max_retries, base_delay_ms, || {
        let text = text.clone();
        let config = config.clone();
        let cancel_rx = cancel_rx.clone();
        async {
            match run_stream(text, config, cancel_rx).await {
                Err(EdgeTTSError::Cancelled) => Ok(Err(EdgeTTSError::Cancelled)),
                Ok(audio) => Ok(Ok(audio)),
                Err(error) => Err(error),
            }
        }
    })
    .await;

    ACTIVE_TASKS.lock().await.remove(&task_id);

    match result {
        Ok(Ok(audio)) => Ok(audio),
        Ok(Err(error)) | Err(error) => Err(error.to_string()),
    }
}

#[command]
pub async fn tts_stop(task_id: String) -> Result<(), String> {
    let tasks = ACTIVE_TASKS.lock().await;
    if let Some(cancel_tx) = tasks.get(&task_id) {
        cancel_tx.send(true).map_err(|error| error.to_string())
    } else {
        Err(format!("Task {task_id} not found"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::Duration;

    static TEST_MUTEX: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

    #[tokio::test]
    async fn test_run_tts_convert_registers_task_retries_and_unregisters_on_success() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;
        let attempts = Arc::new(AtomicUsize::new(0));
        let params = TtsConvertParams {
            text: "hello".to_string(),
            voice: "en-US-TestNeural".to_string(),
            rate: "+10%".to_string(),
            pitch: "+5Hz".to_string(),
            volume: "+20%".to_string(),
            format: "audio-test-format".to_string(),
            task_id: "task-1".to_string(),
            max_retries: 1,
        };

        let result = run_tts_convert(params, 0, {
            let attempts = Arc::clone(&attempts);
            move |text, config, cancel_rx| {
                let attempts = Arc::clone(&attempts);
                async move {
                    assert_eq!(text, "hello");
                    assert_eq!(config.voice, "en-US-TestNeural");
                    assert_eq!(config.rate, "+10%");
                    assert_eq!(config.pitch, "+5Hz");
                    assert_eq!(config.volume, "+20%");
                    assert_eq!(config.output_format, "audio-test-format");
                    assert!(!*cancel_rx.borrow());
                    assert!(ACTIVE_TASKS.lock().await.contains_key("task-1"));

                    let attempt = attempts.fetch_add(1, Ordering::SeqCst);
                    if attempt == 0 {
                        Err(EdgeTTSError::WebSocketError("retry".to_string()))
                    } else {
                        Ok(vec![1, 2, 3])
                    }
                }
            }
        })
        .await;

        assert_eq!(result.unwrap(), vec![1, 2, 3]);
        assert_eq!(attempts.load(Ordering::SeqCst), 2);
        assert!(ACTIVE_TASKS.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_run_tts_convert_unregisters_task_on_error() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;
        let params = TtsConvertParams {
            text: "hello".to_string(),
            voice: "en-US-TestNeural".to_string(),
            rate: "+0%".to_string(),
            pitch: "+0Hz".to_string(),
            volume: "+0%".to_string(),
            format: "audio-test-format".to_string(),
            task_id: "task-error".to_string(),
            max_retries: 1,
        };

        let error = run_tts_convert(params, 0, |_, _, _| async {
            Err(EdgeTTSError::WebSocketError("always fails".to_string()))
        })
        .await
        .unwrap_err();

        assert!(error.contains("always fails"));
        assert!(ACTIVE_TASKS.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_run_tts_convert_does_not_retry_cancelled() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;
        let attempts = Arc::new(AtomicUsize::new(0));
        let params = TtsConvertParams {
            text: "hello".to_string(),
            voice: "en-US-TestNeural".to_string(),
            rate: "+0%".to_string(),
            pitch: "+0Hz".to_string(),
            volume: "+0%".to_string(),
            format: "audio-test-format".to_string(),
            task_id: "task-cancelled".to_string(),
            max_retries: 3,
        };

        let error = run_tts_convert(params, 0, {
            let attempts = Arc::clone(&attempts);
            move |_, _, _| {
                let attempts = Arc::clone(&attempts);
                async move {
                    attempts.fetch_add(1, Ordering::SeqCst);
                    Err(EdgeTTSError::Cancelled)
                }
            }
        })
        .await
        .unwrap_err();

        assert_eq!(error, EdgeTTSError::Cancelled.to_string());
        assert_eq!(attempts.load(Ordering::SeqCst), 1);
        assert!(ACTIVE_TASKS.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_run_tts_convert_rejects_duplicate_task_id() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;
        let (cancel_tx, _cancel_rx) = watch::channel(false);
        ACTIVE_TASKS
            .lock()
            .await
            .insert("task-duplicate".to_string(), cancel_tx);
        let params = TtsConvertParams {
            text: "hello".to_string(),
            voice: "en-US-TestNeural".to_string(),
            rate: "+0%".to_string(),
            pitch: "+0Hz".to_string(),
            volume: "+0%".to_string(),
            format: "audio-test-format".to_string(),
            task_id: "task-duplicate".to_string(),
            max_retries: 1,
        };

        let error = run_tts_convert(params, 0, |_, _, _| async { Ok(vec![1]) })
            .await
            .unwrap_err();

        assert!(error.contains("already exists"));
        assert!(ACTIVE_TASKS.lock().await.contains_key("task-duplicate"));
        clear_active_tasks().await;
    }

    #[tokio::test]
    async fn test_tts_stop_signals_existing_task() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;
        let (cancel_tx, mut cancel_rx) = watch::channel(false);
        ACTIVE_TASKS
            .lock()
            .await
            .insert("task-1".to_string(), cancel_tx);

        tts_stop("task-1".to_string()).await.unwrap();

        tokio::time::timeout(Duration::from_millis(50), cancel_rx.changed())
            .await
            .unwrap()
            .unwrap();
        assert!(*cancel_rx.borrow());
        clear_active_tasks().await;
    }

    #[tokio::test]
    async fn test_tts_stop_returns_error_for_unknown_task() {
        let _guard = TEST_MUTEX.lock().await;
        clear_active_tasks().await;

        let error = tts_stop("missing-task".to_string()).await.unwrap_err();

        assert!(error.contains("not found"));
    }

    async fn clear_active_tasks() {
        ACTIVE_TASKS.lock().await.clear();
    }
}
