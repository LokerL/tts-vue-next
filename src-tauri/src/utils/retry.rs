use std::future::Future;
use std::time::Duration;
use tokio::time::sleep;

pub async fn retry_with_backoff<T, E, F, Fut>(
    max_retries: u32,
    base_delay_ms: u64,
    mut operation: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    let total_attempts = u64::from(max_retries) + 1;
    let mut last_error = None;

    for attempt in 0..=max_retries {
        match operation().await {
            Ok(value) => return Ok(value),
            Err(error) => {
                if attempt < max_retries {
                    let multiplier = 2u64.checked_pow(attempt).unwrap_or(u64::MAX);
                    let delay = base_delay_ms.saturating_mul(multiplier);
                    log::warn!(
                        "Attempt {}/{} failed: {}. Retrying in {}ms...",
                        u64::from(attempt) + 1,
                        total_attempts,
                        error,
                        delay
                    );
                    sleep(Duration::from_millis(delay)).await;
                }
                last_error = Some(error);
            }
        }
    }

    Err(last_error.expect("retry_with_backoff requires at least one attempt"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;

    #[tokio::test]
    async fn test_retry_succeeds_first_try() {
        let result: Result<i32, String> = retry_with_backoff(3, 10, || async { Ok(42) }).await;
        assert_eq!(result.unwrap(), 42);
    }

    #[tokio::test]
    async fn test_retry_succeeds_after_failures() {
        let count = Arc::new(AtomicU32::new(0));
        let count_clone = count.clone();

        let result: Result<i32, String> = retry_with_backoff(3, 10, move || {
            let c = count_clone.clone();
            async move {
                let n = c.fetch_add(1, Ordering::SeqCst);
                if n < 2 {
                    Err(format!("fail {}", n))
                } else {
                    Ok(42)
                }
            }
        })
        .await;

        assert_eq!(result.unwrap(), 42);
        assert_eq!(count.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn test_retry_exhausted() {
        let result: Result<i32, String> =
            retry_with_backoff(2, 10, || async { Err("always fails".to_string()) }).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "always fails");
    }

    #[tokio::test]
    async fn test_retry_handles_max_retries_without_overflow() {
        let result: Result<i32, String> =
            retry_with_backoff(u32::MAX, 0, || async { Ok(42) }).await;
        assert_eq!(result.unwrap(), 42);
    }

    #[tokio::test]
    async fn test_retry_handles_large_attempt_exponent_without_overflow() {
        let count = Arc::new(AtomicU32::new(0));
        let count_clone = count.clone();

        let result: Result<i32, String> = retry_with_backoff(65, 0, move || {
            let c = count_clone.clone();
            async move {
                let n = c.fetch_add(1, Ordering::SeqCst);
                if n < 65 {
                    Err(format!("fail {}", n))
                } else {
                    Ok(42)
                }
            }
        })
        .await;

        assert_eq!(result.unwrap(), 42);
        assert_eq!(count.load(Ordering::SeqCst), 66);
    }
}
