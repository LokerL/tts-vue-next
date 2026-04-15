use crate::edge_tts::types::TTSConfig;

pub fn xml_escape(text: &str) -> String {
    let mut result = String::with_capacity(text.len());

    for ch in text.chars() {
        match ch {
            '&' => result.push_str("&amp;"),
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&apos;"),
            _ => result.push(ch),
        }
    }

    result
}

pub fn build_ssml(config: &TTSConfig, escaped_text: &str) -> String {
    let voice_name = config.voice_long_name();

    format!(
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>\
         <voice name='{}'>\
         <prosody pitch='{}' rate='{}' volume='{}'>\
         {}\
         </prosody>\
         </voice>\
         </speak>",
        voice_name, config.pitch, config.rate, config.volume, escaped_text
    )
}

pub fn remove_incompatible_characters(text: &str) -> String {
    text.chars()
        .map(|ch| {
            let code_point = ch as u32;
            if (code_point <= 0x08)
                || (code_point == 0x0B)
                || (code_point == 0x0C)
                || (0x0E..=0x1F).contains(&code_point)
            {
                ' '
            } else {
                ch
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xml_escape() {
        assert_eq!(xml_escape("a & b < c > d"), "a &amp; b &lt; c &gt; d");
        assert_eq!(xml_escape("hello"), "hello");
        assert_eq!(xml_escape("\"quoted\""), "&quot;quoted&quot;");
    }

    #[test]
    fn test_build_ssml_structure() {
        let config = TTSConfig::default();
        let ssml = build_ssml(&config, "Hello world");
        assert!(ssml.contains("<speak version='1.0'"));
        assert!(ssml.contains("xml:lang='en-US'"));
        assert!(ssml.contains("EmmaMultilingualNeural"));
        assert!(ssml.contains("rate='+0%'"));
        assert!(ssml.contains("pitch='+0Hz'"));
        assert!(ssml.contains("Hello world"));
    }

    #[test]
    fn test_remove_incompatible_characters() {
        let input = "hello\x00\x01\tworld\n\x0Bfoo";
        let result = remove_incompatible_characters(input);
        assert_eq!(result, "hello  \tworld\n foo");
    }
}
