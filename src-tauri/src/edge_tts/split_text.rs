use crate::edge_tts::constants::MAX_CHUNK_BYTES;
use crate::edge_tts::ssml::{remove_incompatible_characters, xml_escape};

pub fn split_text_by_byte_length(text: &str) -> Vec<String> {
    let cleaned = remove_incompatible_characters(text);
    let escaped = xml_escape(&cleaned);
    let trimmed = escaped.trim();

    if trimmed.is_empty() {
        return vec![];
    }

    let bytes = escaped.as_bytes();
    if bytes.len() <= MAX_CHUNK_BYTES {
        return vec![trimmed.to_string()];
    }

    let mut chunks = Vec::new();
    let mut start = 0;

    while start < bytes.len() {
        let remaining = bytes.len() - start;
        if remaining <= MAX_CHUNK_BYTES {
            let chunk = escaped[start..].trim();
            if !chunk.is_empty() {
                chunks.push(chunk.to_string());
            }
            break;
        }

        let mut end = start + MAX_CHUNK_BYTES;
        while end > start && !escaped.is_char_boundary(end) {
            end -= 1;
        }

        let slice = &escaped[start..end];
        let split_pos = slice
            .rfind('\n')
            .map(|pos| pos + 1)
            .or_else(|| slice.rfind(' ').map(|pos| pos + 1))
            .unwrap_or(slice.len());

        let mut actual_end = start + split_pos;
        if let Some(amp_pos) = escaped[start..actual_end].rfind('&') {
            let after_amp = &escaped[start + amp_pos..actual_end];
            if !after_amp.contains(';') {
                actual_end = start + amp_pos;
            }
        }

        if actual_end <= start {
            actual_end = end;
        }

        let chunk = escaped[start..actual_end].trim();
        if !chunk.is_empty() {
            chunks.push(chunk.to_string());
        }

        start = actual_end;
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_short_text_no_split() {
        let chunks = split_text_by_byte_length("Hello world");
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "Hello world");
    }

    #[test]
    fn test_empty_text() {
        let chunks = split_text_by_byte_length("");
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_whitespace_only() {
        let chunks = split_text_by_byte_length("   \n\n   ");
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_long_text_splits() {
        let text = "a ".repeat(3000);
        let chunks = split_text_by_byte_length(&text);
        assert!(chunks.len() > 1);
        for chunk in &chunks {
            assert!(chunk.as_bytes().len() <= MAX_CHUNK_BYTES);
        }
    }

    #[test]
    fn test_xml_escape_in_split() {
        let text = "Hello & world < test > end";
        let chunks = split_text_by_byte_length(&text);
        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].contains("&amp;"));
        assert!(chunks[0].contains("&lt;"));
        assert!(chunks[0].contains("&gt;"));
    }

    #[test]
    fn test_multibyte_utf8_protection() {
        let text = "你".repeat(2000);
        let chunks = split_text_by_byte_length(&text);
        assert!(chunks.len() > 1);
        for chunk in &chunks {
            assert!(chunk.is_char_boundary(0));
            assert!(chunk.as_bytes().len() <= MAX_CHUNK_BYTES);
        }
    }
}
