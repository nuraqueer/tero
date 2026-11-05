//! Development harness for the same core used by JNI. Do not use real member data.
use std::io::{self, BufRead};
fn main() {
    for line in io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        if line.len() > 70 * 1024 {
            continue;
        }
        std::thread::spawn(move || {
            let request = serde_json::from_str::<serde_json::Value>(&line)
                .ok()
                .and_then(|v| v.get("request").cloned())
                .unwrap_or(serde_json::Value::Null);
            let response = sefirah_tor::call(&line);
            let response = serde_json::from_str::<serde_json::Value>(&response).unwrap_or_default();
            println!(
                "{}",
                serde_json::json!({"request":request,"response":response})
            );
        });
    }
}
