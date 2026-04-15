use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSConfig {
    pub voice: String,
    pub rate: String,
    pub pitch: String,
    pub volume: String,
    pub output_format: String,
}

impl Default for TTSConfig {
    fn default() -> Self {
        Self {
            voice: "en-US-EmmaMultilingualNeural".to_string(),
            rate: "+0%".to_string(),
            pitch: "+0Hz".to_string(),
            volume: "+0%".to_string(),
            output_format: "audio-24khz-48kbitrate-mono-mp3".to_string(),
        }
    }
}

impl TTSConfig {
    pub fn voice_long_name(&self) -> String {
        let re = regex::Regex::new(r"^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$").unwrap();
        if let Some(caps) = re.captures(&self.voice) {
            let lang = caps.get(1).unwrap().as_str();
            let region = caps.get(2).unwrap().as_str();
            let name = caps.get(3).unwrap().as_str();

            if name.contains('-') {
                let parts: Vec<&str> = name.splitn(2, '-').collect();
                format!(
                    "Microsoft Server Speech Text to Speech Voice ({}-{}-{}, {})",
                    lang, region, parts[0], parts[1]
                )
            } else {
                format!(
                    "Microsoft Server Speech Text to Speech Voice ({}-{}, {})",
                    lang, region, name
                )
            }
        } else {
            self.voice.clone()
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TTSChunk {
    Audio { data: Vec<u8> },
    WordBoundary {
        offset: f64,
        duration: f64,
        text: String,
    },
    SentenceBoundary {
        offset: f64,
        duration: f64,
        text: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Voice {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "ShortName")]
    pub short_name: String,
    #[serde(rename = "Gender")]
    pub gender: String,
    #[serde(rename = "Locale")]
    pub locale: String,
    #[serde(rename = "SuggestedCodec", default)]
    pub suggested_codec: String,
    #[serde(rename = "FriendlyName", default)]
    pub friendly_name: String,
    #[serde(rename = "Status", default)]
    pub status: String,
    #[serde(rename = "VoiceTag", default)]
    pub voice_tag: VoiceTag,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct VoiceTag {
    #[serde(rename = "ContentCategories", default)]
    pub content_categories: Vec<String>,
    #[serde(rename = "VoicePersonalities", default)]
    pub voice_personalities: Vec<String>,
}

#[derive(Debug, Default)]
pub struct CommunicateState {
    pub offset_compensation: u64,
    pub last_duration_offset: u64,
    pub chunk_audio_bytes: u64,
    pub cumulative_audio_bytes: u64,
}
