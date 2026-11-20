pub mod tracker;

use std::time::Duration;

use ducktrace_logger::*;
use tokio::process::Command as TokioCommand;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TvProbe {
    On,
    Off,
    Unreachable,
    Unauthorized,
}

pub async fn check_tv_power(ip: &str) -> TvProbe {
    let serial = format!("{}:5555", ip);

    let _ = tokio::time::timeout(
        Duration::from_secs(2),
        TokioCommand::new("adb")
            .args(["connect", &serial])
            .output(),
    )
    .await;

    let output = match tokio::time::timeout(
        Duration::from_secs(4),
        TokioCommand::new("adb")
            .args(["-s", &serial, "shell", "dumpsys", "power"])
            .output(),
    )
    .await
    {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => {
            dt_debug!("adb spawn failed for {}: {}", ip, e);
            return TvProbe::Unreachable;
        }
        Err(_) => {
            dt_debug!("adb dumpsys {} timed out", ip);
            return TvProbe::Unreachable;
        }
    };

    let stderr = String::from_utf8_lossy(&output.stderr);

    if stderr.contains("unauthorized") || stderr.contains("device unauthorized") {
        return TvProbe::Unauthorized;
    }

    if !output.status.success() {
        dt_debug!(
            "adb dumpsys {} exited {}: {}",
            ip,
            output.status,
            stderr.trim()
        );
        return TvProbe::Unreachable;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lower = stdout.to_lowercase();

    if lower.contains("mwakefulness=awake")
        || lower.contains("display power: state=on")
        || lower.contains("mscreenstate=on")
        || lower.contains("mhdmiplugged=true")
    {
        return TvProbe::On;
    }

    if lower.contains("mwakefulness=asleep")
        || lower.contains("mwakefulness=dreaming")
        || lower.contains("mwakefulness=dosing")
        || lower.contains("display power: state=off")
        || lower.contains("mscreenstate=off")
        || lower.contains("mhdmiplugged=false")
    {
        return TvProbe::Off;
    }

    dt_warning!(
        "tv dumpsys {} unknown format ({} bytes), first 400: {}",
        ip,
        stdout.len(),
        stdout.chars().take(400).collect::<String>()
    );
    TvProbe::Unreachable
}
