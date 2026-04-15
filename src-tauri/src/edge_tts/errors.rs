use thiserror::Error;

#[derive(Error, Debug)]
pub enum EdgeTTSError {
    #[error("Unknown response from server: {0}")]
    UnknownResponse(String),

    #[error("Unexpected response from server: {0}")]
    UnexpectedResponse(String),

    #[error("No audio data received for chunk")]
    NoAudioReceived,

    #[error("WebSocket error: {0}")]
    WebSocketError(String),

    #[error("Clock skew adjustment error: {0}")]
    SkewAdjustmentError(String),

    #[error("Connection error: {0}")]
    ConnectionError(String),

    #[error("HTTP error: status {0}")]
    HttpError(u16),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Request error: {0}")]
    ReqwestError(#[from] reqwest::Error),

    #[error("Cancelled")]
    Cancelled,
}

impl serde::Serialize for EdgeTTSError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
