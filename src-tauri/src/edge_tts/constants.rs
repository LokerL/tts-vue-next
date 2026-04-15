pub const TRUSTED_CLIENT_TOKEN: &str = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
pub const CHROMIUM_FULL_VERSION: &str = "143.0.3650.75";
pub const CHROMIUM_MAJOR_VERSION: &str = "143";
pub const SEC_MS_GEC_VERSION: &str = "1-143.0.3650.75";

pub const BASE_URL: &str =
    "speech.platform.bing.com/consumer/speech/synthesize/readaloud";

pub const WSS_URL: &str =
    "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

pub const VOICE_LIST_URL: &str =
    "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list";

pub const DEFAULT_OUTPUT_FORMAT: &str = "audio-24khz-48kbitrate-mono-mp3";

pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
pub const ORIGIN: &str = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
pub const MAX_CHUNK_BYTES: usize = 4096;
pub const CBR_BITRATE: u64 = 48_000;
pub const TICKS_PER_SECOND: u64 = 10_000_000;
pub const WINDOWS_EPOCH_OFFSET: u64 = 11_644_473_600;
pub const DRM_ROUNDING_SECONDS: u64 = 300;
pub const CONNECT_TIMEOUT_SECS: u64 = 10;
pub const RECEIVE_TIMEOUT_SECS: u64 = 60;
