use crate::edge_tts::errors::EdgeTTSError;
use crate::edge_tts::types::Voice;

pub async fn list_voices() -> Result<Vec<Voice>, EdgeTTSError> {
    Ok(vec![])
}
