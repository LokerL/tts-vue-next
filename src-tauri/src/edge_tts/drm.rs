use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicI64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::edge_tts::constants::{
    DRM_ROUNDING_SECONDS, TICKS_PER_SECOND, TRUSTED_CLIENT_TOKEN, WINDOWS_EPOCH_OFFSET,
};

static CLOCK_SKEW_MS: AtomicI64 = AtomicI64::new(0);

pub fn generate_sec_ms_gec() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let skew_secs = CLOCK_SKEW_MS.load(Ordering::Relaxed) / 1000;
    let mut ticks = now as i64 + skew_secs + WINDOWS_EPOCH_OFFSET as i64;
    ticks -= ticks % DRM_ROUNDING_SECONDS as i64;

    let ticks_100ns = ticks as u64 * TICKS_PER_SECOND;
    let input = format!("{}{}", ticks_100ns, TRUSTED_CLIENT_TOKEN);
    let hash = Sha256::digest(input.as_bytes());

    format!("{:X}", hash)
}

pub fn adjust_clock_skew(server_date_str: &str) -> Result<(), String> {
    let server_time = chrono::DateTime::parse_from_rfc2822(server_date_str)
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(server_date_str, "%a, %d %b %Y %H:%M:%S GMT")
                .map(|dt| dt.and_utc().fixed_offset())
        })
        .map_err(|e| format!("Failed to parse server date '{}': {}", server_date_str, e))?;

    let server_ts = server_time.timestamp();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let delta_ms = (server_ts - now) * 1000;
    CLOCK_SKEW_MS.fetch_add(delta_ms, Ordering::Relaxed);

    Ok(())
}

pub fn generate_muid() -> String {
    use rand::Rng;

    let mut rng = rand::rng();
    let bytes: [u8; 16] = rng.random();
    bytes.iter().map(|byte| format!("{:02X}", byte)).collect()
}

pub fn js_date_string() -> String {
    let now = chrono::Utc::now();
    now.format("%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_sec_ms_gec_is_64_hex_chars() {
        let token = generate_sec_ms_gec();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_muid_is_32_hex_chars() {
        let muid = generate_muid();
        assert_eq!(muid.len(), 32);
        assert!(muid.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_js_date_string_format() {
        let s = js_date_string();
        assert!(s.contains("GMT+0000"));
        assert!(s.contains("Coordinated Universal Time"));
    }
}
