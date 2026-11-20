use std::time::Duration;

use ducktrace_logger::*;
use tokio::process::Command as TokioCommand;

pub async fn probe_reachable(addr: &str, timeout_secs: u64) -> bool {
    let t = timeout_secs.max(1);
    let is_hostport = addr.contains(':') && addr.matches(':').count() == 1;
    if let Ok(Ok(o)) = tokio::time::timeout(
        Duration::from_secs(t + 1),
        TokioCommand::new("ping")
            .args(["-c", "1", "-W", &t.to_string(), addr])
            .output(),
    )
    .await
    {
        if o.status.success() {
            dt_debug!("probe {}: ping ok", addr);
            return true;
        }
    }

    if !is_hostport {
        if let Ok(Ok(o)) = tokio::time::timeout(
            Duration::from_secs(2),
            TokioCommand::new("ip")
                .args(["neigh", "show", addr])
                .output(),
        )
        .await
        {
            let out = String::from_utf8_lossy(&o.stdout);
            if out.contains("REACHABLE") || out.contains("STALE") || out.contains("DELAY") {
                dt_debug!("probe {}: arp ok ({})", addr, out.trim());
                return true;
            }
        }
    }

    if is_hostport {
        match tokio::time::timeout(
            Duration::from_secs(t),
            tokio::net::TcpStream::connect(addr),
        )
        .await
        {
            Ok(Ok(_)) => {
                dt_debug!("probe {}: tcp ok", addr);
                return true;
            }
            Ok(Err(e)) if e.kind() == std::io::ErrorKind::ConnectionRefused => {
                dt_debug!("probe {}: tcp refused (host up)", addr);
                return true;
            }
            Ok(Err(e)) => dt_debug!("probe {}: tcp {}", addr, e),
            Err(_) => dt_debug!("probe {}: tcp timeout", addr),
        }
    }
    dt_debug!("probe {}: offline", addr);
    false
}
