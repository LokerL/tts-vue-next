use crate::edge_tts::constants::{
    CHROMIUM_MAJOR_VERSION, SEC_MS_GEC_VERSION, TRUSTED_CLIENT_TOKEN, USER_AGENT,
    VOICE_LIST_URL,
};
use crate::edge_tts::drm::{adjust_clock_skew, generate_muid, generate_sec_ms_gec};
use crate::edge_tts::errors::EdgeTTSError;
use crate::edge_tts::types::Voice;

pub async fn list_voices() -> Result<Vec<Voice>, EdgeTTSError> {
    list_voices_from_url(VOICE_LIST_URL).await
}

async fn list_voices_from_url(base_url: &str) -> Result<Vec<Voice>, EdgeTTSError> {
    let client = reqwest::Client::new();

    match fetch_voices(&client, base_url).await {
        Ok(voices) => Ok(voices),
        Err(EdgeTTSError::HttpError(403)) => fetch_voices(&client, base_url).await,
        Err(error) => Err(error),
    }
}

async fn fetch_voices(
    client: &reqwest::Client,
    base_url: &str,
) -> Result<Vec<Voice>, EdgeTTSError> {
    let separator = if base_url.contains('?') { '&' } else { '?' };
    let url = format!(
        "{base_url}{separator}trustedclienttoken={TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC={}&Sec-MS-GEC-Version={SEC_MS_GEC_VERSION}",
        generate_sec_ms_gec()
    );

    let response = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .header("Accept-Encoding", "gzip, deflate, br, zstd")
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Authority", "speech.platform.bing.com")
        .header(
            "Sec-CH-UA",
            format!(
                "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"{CHROMIUM_MAJOR_VERSION}\", \"Chromium\";v=\"{CHROMIUM_MAJOR_VERSION}\""
            ),
        )
        .header("Sec-CH-UA-Mobile", "?0")
        .header("Accept", "*/*")
        .header("Sec-Fetch-Site", "none")
        .header("Sec-Fetch-Mode", "cors")
        .header("Sec-Fetch-Dest", "empty")
        .header("Cookie", format!("muid={};", generate_muid()))
        .send()
        .await?;

    if response.status().as_u16() == 403 {
        if let Some(date_header) = response.headers().get("date") {
            if let Ok(date) = date_header.to_str() {
                let _ = adjust_clock_skew(date);
            }
        }
        return Err(EdgeTTSError::HttpError(403));
    }

    if !response.status().is_success() {
        return Err(EdgeTTSError::HttpError(response.status().as_u16()));
    }

    Ok(response.json().await?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn test_list_voices_parses_response_and_defaults_missing_fields() {
        let response = json_response(
            200,
            r#"[{"Name":"Microsoft Server Speech Text to Speech Voice (en-US, AvaNeural)","ShortName":"en-US-AvaNeural","Gender":"Female","Locale":"en-US"}]"#,
            None,
        );
        let (base_url, _requests) = spawn_server(vec![response]).await;

        let voices = list_voices_from_url(&base_url).await.unwrap();

        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].short_name, "en-US-AvaNeural");
        assert_eq!(voices[0].voice_tag.content_categories, Vec::<String>::new());
        assert_eq!(voices[0].voice_tag.voice_personalities, Vec::<String>::new());
        assert_eq!(voices[0].friendly_name, "");
        assert_eq!(voices[0].status, "");
    }

    #[tokio::test]
    async fn test_list_voices_retries_once_after_403() {
        let forbidden =
            json_response(403, "forbidden", Some("Date: Wed, 15 Apr 2026 12:00:00 GMT\r\n"));
        let success = json_response(
            200,
            r#"[{"Name":"Microsoft Server Speech Text to Speech Voice (en-US, AvaNeural)","ShortName":"en-US-AvaNeural","Gender":"Female","Locale":"en-US"}]"#,
            None,
        );
        let (base_url, requests) = spawn_server(vec![forbidden, success]).await;

        let voices = list_voices_from_url(&base_url).await.unwrap();

        assert_eq!(voices.len(), 1);
        assert_eq!(requests.lock().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn test_list_voices_returns_http_error_for_non_403() {
        let response = json_response(500, "boom", None);
        let (base_url, _requests) = spawn_server(vec![response]).await;

        let error = list_voices_from_url(&base_url).await.unwrap_err();

        match error {
            EdgeTTSError::HttpError(500) => {}
            other => panic!("unexpected error: {other:?}"),
        }
    }

    async fn spawn_server(responses: Vec<String>) -> (String, Arc<Mutex<Vec<String>>>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let requests_for_task = Arc::clone(&requests);

        tokio::spawn(async move {
            for response in responses {
                let (mut stream, _) = listener.accept().await.unwrap();
                let mut buffer = vec![0_u8; 8192];
                let read = stream.read(&mut buffer).await.unwrap();
                requests_for_task
                    .lock()
                    .unwrap()
                    .push(String::from_utf8_lossy(&buffer[..read]).into_owned());
                stream.write_all(response.as_bytes()).await.unwrap();
                stream.shutdown().await.unwrap();
            }
        });

        (format!("http://{}", address), requests)
    }

    fn json_response(status: u16, body: &str, extra_headers: Option<&str>) -> String {
        let reason = match status {
            200 => "OK",
            403 => "Forbidden",
            500 => "Internal Server Error",
            _ => "OK",
        };
        let headers = extra_headers.unwrap_or("");
        format!(
            "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n{}\r\n{}",
            status,
            reason,
            body.len(),
            headers,
            body
        )
    }
}
