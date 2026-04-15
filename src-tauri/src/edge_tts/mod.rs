pub mod constants;
pub mod types;
pub mod errors;
pub mod drm;
pub mod ssml;
pub mod split_text;
pub mod communicate;
pub mod voices;

pub use communicate::Communicate;
pub use errors::EdgeTTSError;
pub use types::{TTSChunk, TTSConfig, Voice};
pub use voices::list_voices;
