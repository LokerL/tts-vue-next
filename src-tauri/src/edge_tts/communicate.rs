use std::collections::HashMap;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::{watch, Mutex};
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Error as WebSocketError, Message};
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;
use uuid::Uuid;

use crate::edge_tts::constants::{
    CHROMIUM_MAJOR_VERSION, CONNECT_TIMEOUT_SECS, ORIGIN, RECEIVE_TIMEOUT_SECS, SEC_MS_GEC_VERSION,
    TRUSTED_CLIENT_TOKEN, USER_AGENT, WSS_URL,
};
use crate::edge_tts::drm::{adjust_clock_skew, generate_muid, generate_sec_ms_gec, js_date_string};
use crate::edge_tts::errors::EdgeTTSError;
use crate::edge_tts::split_text::split_text_by_byte_length;
use crate::edge_tts::ssml::build_ssml;

use crate::edge_tts::types::{CommunicateState, TTSConfig};

type EdgeWebSocket = WebSocketStream<MaybeTlsStream<TcpStream>>;

const CONNECT_TIMEOUT: std::time::Duration =
    std::time::Duration::from_secs(CONNECT_TIMEOUT_SECS);
const RECEIVE_TIMEOUT: std::time::Duration =
    std::time::Duration::from_secs(RECEIVE_TIMEOUT_SECS);

pub struct Communicate {
    config: TTSConfig,
    text: String,
    cancel_rx: watch::Receiver<bool>,
}

impl Communicate {
    pub fn new(text: String, config: TTSConfig, cancel_rx: watch::Receiver<bool>) -> Self {
        Self {
            config,
            text,
            cancel_rx,
        }
    }

    pub async fn stream_audio(&self) -> Result<Vec<u8>, EdgeTTSError> {
        self.stream_chunk_sequence_with_timeout(WSS_URL, RECEIVE_TIMEOUT, Arc::new(Mutex::new(CommunicateState::default())))
            .await
    }

    async fn stream_audio_from_url(&self, base_url: &str) -> Result<Vec<u8>, EdgeTTSError> {
        self.stream_chunk_sequence_with_timeout(
            base_url,
            RECEIVE_TIMEOUT,
            Arc::new(Mutex::new(CommunicateState::default())),
        )
        .await
    }

    async fn stream_audio_with_timeout(
        &self,
        base_url: &str,
        receive_timeout: std::time::Duration,
    ) -> Result<Vec<u8>, EdgeTTSError> {
        self.stream_chunk_sequence_with_timeout(
            base_url,
            receive_timeout,
            Arc::new(Mutex::new(CommunicateState::default())),
        )
        .await
    }

    async fn stream_chunk_sequence_with_timeout(
        &self,
        base_url: &str,
        receive_timeout: std::time::Duration,
        state: Arc<Mutex<CommunicateState>>,
    ) -> Result<Vec<u8>, EdgeTTSError> {
        if *self.cancel_rx.borrow() {
            return Err(EdgeTTSError::Cancelled);
        }

        let chunks = split_text_by_byte_length(&self.text);
        if chunks.is_empty() {
            return Err(EdgeTTSError::NoAudioReceived);
        }

        let mut all_audio = Vec::new();

        for chunk_text in &chunks {
            if *self.cancel_rx.borrow() {
                return Err(EdgeTTSError::Cancelled);
            }

            let audio = self
                .stream_single_chunk_with_timeout(
                    chunk_text,
                    base_url,
                    receive_timeout,
                    Arc::clone(&state),
                )
                .await?;
            all_audio.extend_from_slice(&audio);

            let mut state = state.lock().await;
            state.cumulative_audio_bytes += state.chunk_audio_bytes;
            state.offset_compensation = state.cumulative_audio_bytes;
            state.last_duration_offset = state.cumulative_audio_bytes;
        }

        if all_audio.is_empty() {
            Err(EdgeTTSError::NoAudioReceived)
        } else {
            Ok(all_audio)
        }
    }

    async fn stream_single_chunk_with_timeout(
        &self,
        chunk_text: &str,
        base_url: &str,
        receive_timeout: std::time::Duration,
        state: Arc<Mutex<CommunicateState>>,
    ) -> Result<Vec<u8>, EdgeTTSError> {
        let mut socket = self.connect_websocket(base_url).await?;
        let request_id = generate_request_id();

        socket
            .send(Message::Text(build_speech_config_message(&self.config).into()))
            .await
            .map_err(map_websocket_message_error)?;
        socket
            .send(Message::Text(build_ssml_message(&request_id, chunk_text, &self.config).into()))
            .await
            .map_err(map_websocket_message_error)?;

        let mut audio = Vec::new();
        let mut cancel_rx = self.cancel_rx.clone();

        {
            let mut state = state.lock().await;
            state.chunk_audio_bytes = 0;
            state.last_duration_offset = state.cumulative_audio_bytes;
        }

        loop {
            if *cancel_rx.borrow() {
                return Err(EdgeTTSError::Cancelled);
            }

            let message = tokio::select! {
                changed = cancel_rx.changed() => {
                    match changed {
                        Ok(()) if *cancel_rx.borrow() => return Err(EdgeTTSError::Cancelled),
                        Ok(()) => continue,
                        Err(_) => continue,
                    }
                }
                message = tokio::time::timeout(
                    receive_timeout,
                    socket.next(),
                ) => {
                    match message {
                        Ok(message) => message,
                        Err(_) => return Err(EdgeTTSError::WebSocketError("Receive timeout".to_string())),
                    }
                }
            };

            let Some(message_result) = message else {
                break;
            };

            let message = message_result.map_err(map_websocket_message_error)?;

            match message {
                Message::Text(text) => {
                    let (headers, _) = parse_text_message(text.as_str());
                    match headers.get("Path").map(String::as_str) {
                        Some("turn.start" | "response" | "audio.metadata") => {}
                        Some("turn.end") => break,
                        Some(other) => {
                            return Err(EdgeTTSError::UnexpectedResponse(format!(
                                "Unknown Path in text message: {other}"
                            )));
                        }
                        None => {
                            return Err(EdgeTTSError::UnexpectedResponse(
                                "Missing Path in text message".to_string(),
                            ));
                        }
                    }
                }
                Message::Binary(data) => {
                    if let Some((headers, payload)) = parse_binary_message(data.as_ref()) {
                        match headers.get("Path").map(String::as_str) {
                            Some("audio") if !payload.is_empty() => {
                                audio.extend_from_slice(payload);
                                let mut state = state.lock().await;
                                state.chunk_audio_bytes += payload.len() as u64;
                                state.last_duration_offset =
                                    state.cumulative_audio_bytes + state.chunk_audio_bytes;
                            }
                            Some("turn.end") => break,
                            _ => {}
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        if audio.is_empty() {
            Err(EdgeTTSError::NoAudioReceived)
        } else {
            Ok(audio)
        }
    }

    async fn connect_websocket(&self, base_url: &str) -> Result<EdgeWebSocket, EdgeTTSError> {
        self.connect_websocket_with_timeout(base_url, CONNECT_TIMEOUT)
            .await
    }

    async fn connect_websocket_with_timeout(
        &self,
        base_url: &str,
        connect_timeout: std::time::Duration,
    ) -> Result<EdgeWebSocket, EdgeTTSError> {
        match connect_websocket_once(base_url, connect_timeout).await {
            Ok(socket) => Ok(socket),
            Err(ConnectAttemptError::Forbidden(date_header)) => {
                if let Some(date) = date_header {
                    adjust_clock_skew(&date).map_err(EdgeTTSError::SkewAdjustmentError)?;
                }

                match connect_websocket_once(base_url, connect_timeout).await {
                    Ok(socket) => Ok(socket),
                    Err(ConnectAttemptError::Forbidden(_)) => Err(EdgeTTSError::HttpError(403)),
                    Err(ConnectAttemptError::Edge(error)) => Err(error),
                }
            }
            Err(ConnectAttemptError::Edge(error)) => Err(error),
        }
    }
}

async fn connect_websocket_once(
    base_url: &str,
    connect_timeout: std::time::Duration,
) -> Result<EdgeWebSocket, ConnectAttemptError> {
    let url = build_websocket_url(base_url).map_err(ConnectAttemptError::Edge)?;
    let mut request = url.into_client_request().map_err(|error| {
        ConnectAttemptError::Edge(EdgeTTSError::ConnectionError(error.to_string()))
    })?;

    request.headers_mut().insert("Origin", ORIGIN.parse().unwrap());
    request
        .headers_mut()
        .insert("User-Agent", USER_AGENT.parse().unwrap());
    request.headers_mut().insert(
        "Sec-CH-UA",
        format!(
            "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"{CHROMIUM_MAJOR_VERSION}\", \"Chromium\";v=\"{CHROMIUM_MAJOR_VERSION}\""
        )
        .parse()
        .unwrap(),
    );
    request
        .headers_mut()
        .insert("Sec-CH-UA-Mobile", "?0".parse().unwrap());
    request
        .headers_mut()
        .insert("Cookie", format!("muid={};", generate_muid()).parse().unwrap());

    let connect_result = tokio::time::timeout(connect_timeout, connect_async(request))
    .await
    .map_err(|_| {
        ConnectAttemptError::Edge(EdgeTTSError::ConnectionError(
            "Connection timeout".to_string(),
        ))
    })?;

    match connect_result {
        Ok((socket, _)) => Ok(socket),
        Err(WebSocketError::Http(response)) => {
            let status = response.status().as_u16();
            if status == 403 {
                let date_header = response
                    .headers()
                    .get("date")
                    .and_then(|value| value.to_str().ok())
                    .map(str::to_string);
                Err(ConnectAttemptError::Forbidden(date_header))
            } else {
                Err(ConnectAttemptError::Edge(EdgeTTSError::HttpError(status)))
            }
        }
        Err(error) => Err(ConnectAttemptError::Edge(EdgeTTSError::ConnectionError(
            error.to_string(),
        ))),
    }
}

fn build_websocket_url(base_url: &str) -> Result<String, EdgeTTSError> {
    let mut url = Url::parse(base_url)
        .map_err(|error| EdgeTTSError::ConnectionError(error.to_string()))?;
    let connection_id = generate_request_id();
    let sec_ms_gec = generate_sec_ms_gec();

    url.query_pairs_mut()
        .append_pair("TrustedClientToken", TRUSTED_CLIENT_TOKEN)
        .append_pair("Sec-MS-GEC", &sec_ms_gec)
        .append_pair("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION)
        .append_pair("ConnectionId", &connection_id);

    Ok(url.into())
}

fn build_speech_config_message(config: &TTSConfig) -> String {
    let timestamp = js_date_string();
    let body = serde_json::json!({
        "context": {
            "synthesis": {
                "audio": {
                    "metadataoptions": {
                        "sentenceBoundaryEnabled": false,
                        "wordBoundaryEnabled": false
                    },
                    "outputFormat": config.output_format
                }
            }
        }
    });

    format!(
        "X-Timestamp:{timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{body}"
    )
}

fn build_ssml_message(request_id: &str, text: &str, config: &TTSConfig) -> String {
    let ssml = build_ssml(config, text.trim());
    let timestamp = js_date_string();

    format!(
        "X-RequestId:{request_id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:{timestamp}\r\nPath:ssml\r\n\r\n{ssml}"
    )
}

fn parse_text_message(text: &str) -> (HashMap<String, String>, &str) {
    match text.split_once("\r\n\r\n") {
        Some((headers_str, body)) => (parse_header_string(headers_str), body),
        None => (parse_header_string(text), ""),
    }
}

fn parse_header_string(headers_str: &str) -> HashMap<String, String> {
    headers_str
        .lines()
        .filter_map(|line| {
            let (key, value) = line.split_once(':')?;
            Some((key.trim().to_string(), value.trim().to_string()))
        })
        .collect()
}

fn parse_binary_message(data: &[u8]) -> Option<(HashMap<String, String>, &[u8])> {
    let header_length_bytes: [u8; 2] = data.get(..2)?.try_into().ok()?;
    let header_length = u16::from_be_bytes(header_length_bytes) as usize;
    let header_end = 2 + header_length;
    let header_bytes = data.get(2..header_end)?;
    let headers_str = std::str::from_utf8(header_bytes).ok()?;
    let payload = data.get(header_end..)?;

    Some((parse_header_string(headers_str), payload))
}

fn generate_request_id() -> String {
    Uuid::new_v4().simple().to_string().to_uppercase()
}

fn map_websocket_message_error(error: WebSocketError) -> EdgeTTSError {
    match error {
        WebSocketError::Http(response) => EdgeTTSError::HttpError(response.status().as_u16()),
        other => EdgeTTSError::WebSocketError(other.to_string()),
    }
}

enum ConnectAttemptError {
    Forbidden(Option<String>),
    Edge(EdgeTTSError),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::time::Duration;

    use tokio::net::TcpListener;
    use tokio::time::sleep;
    use tokio_tungstenite::accept_async;

    use crate::edge_tts::split_text::split_text_by_byte_length;

    #[test]
    fn test_parse_text_message_splits_headers_and_body() {
        let message = concat!(
            "X-RequestId:abc\r\n",
            "Path:turn.end\r\n",
            "Content-Type:application/json\r\n\r\n",
            "{\"ok\":true}"
        );

        let (headers, body) = parse_text_message(message);

        assert_eq!(headers.get("X-RequestId"), Some(&"abc".to_string()));
        assert_eq!(headers.get("Path"), Some(&"turn.end".to_string()));
        assert_eq!(body, "{\"ok\":true}");
    }

    #[test]
    fn test_parse_binary_message_extracts_audio_payload() {
        let headers = b"Path:audio\r\nContent-Type:audio/mpeg";
        let mut frame = Vec::new();
        frame.extend_from_slice(&(headers.len() as u16).to_be_bytes());
        frame.extend_from_slice(headers);
        frame.extend_from_slice(b"abc123");

        let (parsed_headers, payload) = parse_binary_message(&frame).unwrap();

        assert_eq!(parsed_headers.get("Path"), Some(&"audio".to_string()));
        assert_eq!(
            parsed_headers.get("Content-Type"),
            Some(&"audio/mpeg".to_string())
        );
        assert_eq!(payload, b"abc123");
    }

    #[test]
    fn test_parse_binary_message_rejects_truncated_frame() {
        let frame = [0x00, 0x08, b'P', b'a', b't'];
        assert!(parse_binary_message(&frame).is_none());
    }

    #[test]
    fn test_parse_header_string_ignores_invalid_lines() {
        let headers = parse_header_string("Path:audio\r\ninvalid\r\nX-RequestId:abc");

        assert_eq!(headers.get("Path"), Some(&"audio".to_string()));
        assert_eq!(headers.get("X-RequestId"), Some(&"abc".to_string()));
        assert_eq!(headers.len(), 2);
    }

    #[test]
    fn test_build_websocket_url_contains_required_query_parameters() {
        let url = build_websocket_url("wss://example.com/edge/v1").unwrap();

        assert!(url.contains("TrustedClientToken="));
        assert!(url.contains("Sec-MS-GEC="));
        assert!(url.contains("Sec-MS-GEC-Version="));
        assert!(url.contains("ConnectionId="));
    }

    #[test]
    fn test_build_ssml_message_uses_pre_escaped_chunk_text() {
        let escaped_chunk = &split_text_by_byte_length("A & B < C > D")[0];
        let message = build_ssml_message("req", escaped_chunk, &TTSConfig::default());

        assert!(message.contains("A &amp; B &lt; C &gt; D"));
        assert!(!message.contains("&amp;amp;"));
        assert!(!message.contains("&amp;lt;"));
        assert!(!message.contains("&amp;gt;"));
    }

    #[tokio::test]
    async fn test_stream_audio_rejects_empty_text() {
        let (_cancel_tx, cancel_rx) = watch::channel(false);
        let communicate = Communicate::new(String::new(), TTSConfig::default(), cancel_rx);

        let error = communicate.stream_audio().await.unwrap_err();

        assert!(matches!(error, EdgeTTSError::NoAudioReceived));
    }

    #[tokio::test]
    async fn test_stream_audio_honors_preemptive_cancellation() {
        let (cancel_tx, cancel_rx) = watch::channel(false);
        cancel_tx.send(true).unwrap();
        let communicate = Communicate::new("hello world".to_string(), TTSConfig::default(), cancel_rx);

        let error = communicate.stream_audio().await.unwrap_err();

        assert!(matches!(error, EdgeTTSError::Cancelled));
    }

    #[tokio::test]
    async fn test_connect_websocket_returns_timeout_when_handshake_stalls() {
        let base_url = spawn_stalled_tcp_server().await;
        let (_cancel_tx, cancel_rx) = watch::channel(false);
        let communicate = Communicate::new("hello world".to_string(), TTSConfig::default(), cancel_rx);

        let error = communicate
            .connect_websocket_with_timeout(&base_url, Duration::from_millis(50))
            .await
            .unwrap_err();

        match error {
            EdgeTTSError::ConnectionError(message) => {
                assert!(message.to_lowercase().contains("timeout"));
            }
            other => panic!("unexpected error: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_stream_audio_returns_timeout_when_server_stalls() {
        let base_url = spawn_silent_websocket_server().await;
        let (_cancel_tx, cancel_rx) = watch::channel(false);
        let communicate = Communicate::new("hello world".to_string(), TTSConfig::default(), cancel_rx);

        let error = communicate
            .stream_audio_with_timeout(&base_url, Duration::from_millis(50))
            .await
            .unwrap_err();

        match error {
            EdgeTTSError::WebSocketError(message) => {
                assert!(message.to_lowercase().contains("timeout"));
            }
            other => panic!("unexpected error: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_stream_audio_updates_communicate_state_consistently_across_chunks() {
        let text = "你好 ".repeat(1500);
        let chunks = split_text_by_byte_length(&text);
        assert!(chunks.len() > 1);

        let payloads: Vec<Vec<u8>> = (0..chunks.len())
            .map(|index| format!("chunk-{index}").into_bytes())
            .collect();
        let expected_total = payloads.iter().map(|payload| payload.len() as u64).sum::<u64>();
        let state = Arc::new(Mutex::new(CommunicateState::default()));
        let connection_count = Arc::new(AtomicUsize::new(0));
        let base_url =
            spawn_chunked_audio_server(payloads, Arc::clone(&connection_count)).await;
        let (_cancel_tx, cancel_rx) = watch::channel(false);
        let communicate = Communicate::new(text, TTSConfig::default(), cancel_rx);

        let audio = communicate
            .stream_chunk_sequence_with_timeout(&base_url, RECEIVE_TIMEOUT, Arc::clone(&state))
            .await
            .unwrap();

        assert_eq!(audio.len() as u64, expected_total);
        let state = state.lock().await;
        assert_eq!(state.cumulative_audio_bytes, expected_total);
        assert_eq!(state.offset_compensation, expected_total);
        assert_eq!(state.last_duration_offset, expected_total);
        assert_eq!(connection_count.load(Ordering::SeqCst), chunks.len());
    }

    #[tokio::test]
    async fn test_stream_single_chunk_keeps_last_duration_offset_global_while_receiving_audio() {
        let first_payload = b"abc".to_vec();
        let second_payload = b"de".to_vec();
        let expected_total = 10_u64;
        let state = Arc::new(Mutex::new(CommunicateState {
            offset_compensation: expected_total,
            last_duration_offset: expected_total,
            chunk_audio_bytes: 0,
            cumulative_audio_bytes: expected_total,
        }));
        let observed_offsets = Arc::new(Mutex::new(Vec::new()));
        let base_url = spawn_observing_audio_server(
            vec![first_payload.clone(), second_payload.clone()],
            Arc::clone(&state),
            Arc::clone(&observed_offsets),
        )
        .await;
        let (_cancel_tx, cancel_rx) = watch::channel(false);
        let communicate = Communicate::new("hello world".to_string(), TTSConfig::default(), cancel_rx);

        let audio = communicate
            .stream_single_chunk_with_timeout(
                "hello world",
                &base_url,
                RECEIVE_TIMEOUT,
                Arc::clone(&state),
            )
            .await
            .unwrap();

        assert_eq!(audio, [first_payload, second_payload].concat());
        let observed_offsets = observed_offsets.lock().await.clone();
        assert_eq!(observed_offsets, vec![expected_total + 3, expected_total + 5]);

        let state = state.lock().await;
        assert_eq!(state.chunk_audio_bytes, 5);
        assert_eq!(state.last_duration_offset, expected_total + 5);
        assert_eq!(state.cumulative_audio_bytes, expected_total);
    }


    async fn spawn_stalled_tcp_server() -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (_stream, _) = listener.accept().await.unwrap();
            sleep(Duration::from_millis(300)).await;
        });

        format!("ws://{address}/edge/v1")
    }

    async fn spawn_silent_websocket_server() -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let mut websocket = accept_async(stream).await.unwrap();
            let _ = websocket.next().await;
            let _ = websocket.next().await;
            sleep(Duration::from_millis(300)).await;
        });

        format!("ws://{address}/edge/v1")
    }

    async fn spawn_unknown_path_websocket_server(path: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let mut websocket = accept_async(stream).await.unwrap();
            let _ = websocket.next().await;
            let _ = websocket.next().await;
            websocket
                .send(Message::Text(format!("Path:{path}\r\n\r\n").into()))
                .await
                .unwrap();
            websocket.close(None).await.unwrap();
        });

        format!("ws://{address}/edge/v1")
    }

    async fn spawn_observing_audio_server(
        payloads: Vec<Vec<u8>>,
        state: Arc<Mutex<CommunicateState>>,
        observed_offsets: Arc<Mutex<Vec<u64>>>,
    ) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let mut websocket = accept_async(stream).await.unwrap();
            let _ = websocket.next().await;
            let _ = websocket.next().await;
            let mut expected_chunk_bytes = 0_u64;

            for payload in payloads {
                let headers = b"Path:audio\r\nContent-Type:audio/mpeg";
                let mut frame = Vec::new();
                frame.extend_from_slice(&(headers.len() as u16).to_be_bytes());
                frame.extend_from_slice(headers);
                frame.extend_from_slice(&payload);

                websocket.send(Message::Binary(frame.into())).await.unwrap();
                expected_chunk_bytes += payload.len() as u64;
                wait_for_chunk_progress(&state, expected_chunk_bytes).await;

                let current_offset = state.lock().await.last_duration_offset;
                observed_offsets.lock().await.push(current_offset);
            }

            websocket
                .send(Message::Text("Path:turn.end\r\n\r\n".into()))
                .await
                .unwrap();
            websocket.close(None).await.unwrap();
        });

        format!("ws://{address}/edge/v1")
    }

    async fn wait_for_chunk_progress(
        state: &Arc<Mutex<CommunicateState>>,
        expected_chunk_bytes: u64,
    ) {
        for _ in 0..50 {
            {
                let state = state.lock().await;
                if state.chunk_audio_bytes >= expected_chunk_bytes {
                    return;
                }
            }
            sleep(Duration::from_millis(5)).await;
        }

        panic!("timed out waiting for chunk_audio_bytes to reach {expected_chunk_bytes}");
    }

    async fn spawn_chunked_audio_server(
        payloads: Vec<Vec<u8>>,
        connection_count: Arc<AtomicUsize>,
    ) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            for payload in payloads {
                let (stream, _) = listener.accept().await.unwrap();
                connection_count.fetch_add(1, Ordering::SeqCst);
                let mut websocket = accept_async(stream).await.unwrap();
                let _ = websocket.next().await;
                let _ = websocket.next().await;

                let headers = b"Path:audio\r\nContent-Type:audio/mpeg";
                let mut frame = Vec::new();
                frame.extend_from_slice(&(headers.len() as u16).to_be_bytes());
                frame.extend_from_slice(headers);
                frame.extend_from_slice(&payload);

                websocket.send(Message::Binary(frame.into())).await.unwrap();
                websocket
                    .send(Message::Text("Path:turn.end\r\n\r\n".into()))
                    .await
                    .unwrap();
                websocket.close(None).await.unwrap();
            }
        });

        format!("ws://{address}/edge/v1")
    }
}
