use std::time::Duration;

use ducktrace_logger::*;
use tokio::process::Command as TokioCommand;

use super::{check_tv_power, TvProbe};
use crate::net::probe_reachable;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn start_tv_state_trackers(&self) {
        if self.config.tv.is_empty() {
            dt_debug!("📺 No TVs configured; state tracking disabled");
            return;
        }

        match TokioCommand::new("adb").arg("version").output().await {
            Ok(o) if o.status.success() => {
                dt_debug!(
                    "📺 adb: {}",
                    String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .next()
                        .unwrap_or("<no output>")
                );
            }
            Ok(o) => dt_warning!(
                "📺 adb exited {}: {}",
                o.status,
                String::from_utf8_lossy(&o.stderr).trim()
            ),
            Err(e) => {
                dt_error!(
                    "📺 adb binary not runnable: {} - TV state tracking will not work",
                    e
                );
                return;
            }
        }

        for (name, tv) in &self.config.tv {
            if !tv.enable { dt_debug!("📺 '{}' is disabled; skipping tracker", name); continue; }
            let name = name.clone();
            let ip = tv.ip.clone();
            let interval_secs = tv.poll_interval.max(5);
            let state = self.clone();

            dt_info!(
                "📺 Starting tracker for '{}' ({}) every {}s",
                name,
                ip,
                interval_secs
            );

            tokio::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
                interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
                interval.tick().await;

                loop {
                    interval.tick().await;
                    let probe = check_tv_power(&ip).await;

                    let state_str = match probe {
                        TvProbe::On => "ON",
                        TvProbe::Off => "OFF",
                        TvProbe::Unauthorized => {
                            let prev = state.get_state(&name, "state");
                            if prev.as_deref() != Some("UNAUTHORIZED") {
                                dt_warning!(
                                    "📺 '{}' ADB unauthorized - accept 'Allow USB debugging' on the TV",
                                    name
                                );
                                let _ =
                                    state.update_device_state(&name, "state", "UNAUTHORIZED");
                            } else {
                                dt_debug!("📺 '{}' still unauthorized", name);
                            }
                            continue;
                        }
                        TvProbe::Unreachable => {
                            if probe_reachable(&ip, 2).await {
                                dt_debug!(
                                    "📺 '{}' ping ok but adb unavailable - keeping last state",
                                    name
                                );
                                continue;
                            }
                            dt_debug!("📺 '{}' unreachable - TV off", name);
                            "OFF"
                        }
                    };

                    let prev = state.get_state(&name, "state");
                    if prev.as_deref() != Some(state_str) {
                        dt_info!(
                            "📺 '{}' {} --> {}",
                            name,
                            prev.as_deref().unwrap_or("<none>"),
                            state_str
                        );
                    } else {
                        dt_debug!("📺 '{}' unchanged: {}", name, state_str);
                    }

                    if let Err(e) = state.update_device_state(&name, "state", state_str) {
                        dt_warning!("📺 '{}' write failed: {}", name, e);
                    }
                }
            });
        }
    }
}
