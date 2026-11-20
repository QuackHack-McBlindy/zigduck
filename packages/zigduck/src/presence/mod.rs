use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ducktrace_logger::*;

use crate::net::probe_reachable;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn start_presence_probes(&self) {
        if !self.config.presence.enabled || self.config.presence.probes.is_empty() {
            let _ = self.update_device_state("apartment", "probe_online", "false");
            dt_info!(
                "presence probes disabled or no probes configured ({} probe(s))",
                self.config.presence.probes.len()
            );
            return;
        }
        let probes = self.config.presence.probes.clone();
        let interval = self.config.presence.probe_interval_secs.max(10);
        let timeout = self.config.presence.probe_timeout_secs.max(1);
        let state = self.clone();
        dt_info!(
            "starting presence probes: {:?} every {}s (timeout {}s)",
            probes,
            interval,
            timeout
        );
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(Duration::from_secs(interval));
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            ticker.tick().await;

            loop {
                ticker.tick().await;
                let mut any_online = false;
                let mut winner: Option<&str> = None;
                for probe in &probes {
                    if probe_reachable(probe, timeout).await {
                        any_online = true;
                        winner = Some(probe);
                        break;
                    }
                }

                let prev = state.get_state("apartment", "probe_online");
                let new_str = if any_online { "true" } else { "false" };
                let transitioned = prev.as_deref() != Some(new_str);

                if transitioned {
                    match winner {
                        Some(w) => dt_debug!("probe online (winner: {})", w),
                        None => dt_debug!("all probes offline ({})", probes.join(", ")),
                    }
                    let ts = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    if new_str == "false" {
                        let _ = state.update_device_state(
                            "apartment",
                            "probe_offline_since",
                            &ts.to_string(),
                        );
                    } else {
                        let _ = state.update_device_state("apartment", "probe_offline_since", "0");
                    }
                }
                let _ = state.update_device_state("apartment", "probe_online", new_str);
            }
        });
    }

    pub async fn check_presence_transition(&self) {
        if !self.config.presence.enabled {
            return;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let last_motion: u64 = self
            .get_state("apartment", "last_motion")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let probe_online = self.get_state("apartment", "probe_online").as_deref() == Some("true");
        let last_door_open: u64 = self
            .get_state("apartment", "last_door_open")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let last_door_close: u64 = self
            .get_state("apartment", "last_door_close")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let last_door_event = last_door_open.max(last_door_close);

        const MOTION_GRACE_SECS: u64 = 300;
        const DOOR_HOME_WINDOW_SECS: u64 = 120;

        let motion_recent =
            last_motion > 0 && now.saturating_sub(last_motion) < MOTION_GRACE_SECS;
        let door_recent =
            last_door_event > 0 && now.saturating_sub(last_door_event) < DOOR_HOME_WINDOW_SECS;

        let raw_home = motion_recent || probe_online || door_recent;

        let committed = *self.presence_state.read().unwrap();

        if committed.is_none() {
            *self.presence_state.write().unwrap() = Some(raw_home);
            let s = if raw_home { "home" } else { "away" };
            let _ = self.update_device_state("apartment", "presence", s);
            let _ = self.update_device_state("apartment", "away_since", "0");
            if raw_home {
                let _ =
                    self.update_device_state("apartment", "last_confirmed_home", &now.to_string());
            }
            dt_debug!("presence seeded: {}", s);
            return;
        }
        let committed_home = committed.unwrap();

        if raw_home {
            let away_since = self
                .get_state("apartment", "away_since")
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);
            if away_since > 0 {
                let _ = self.update_device_state("apartment", "away_since", "0");
                dt_debug!("🏠 home signal - away countdown cancelled");
            }

            if !committed_home {
                *self.presence_state.write().unwrap() = Some(true);

                let confirmed_at = now.max(last_door_event);
                let _ = self.update_device_state(
                    "apartment",
                    "last_confirmed_home",
                    &confirmed_at.to_string(),
                );

                dt_info!("🏠 PRESENCE away --> home");
                let _ = self.update_device_state("apartment", "presence", "home");
                let _ =
                    self.update_device_state("apartment", "presence_changed", &now.to_string());
                let topic = format!("{}/apartment/presence", self.mqtt_base_topic);
                if let Err(e) = self.mqtt_publish(&topic, "home").await {
                    dt_warning!("failed to publish presence: {}", e);
                }
                for action in &self.config.presence.home_actions {
                    if let Err(e) = self.execute_presence_action(action, "home", "away").await {
                        dt_warning!("presence home action failed: {}", e);
                    }
                }
            }
            return;
        }

        if !committed_home {
            return;
        }

        let door_sensor_defined = self
            .automations
            .greeting
            .as_ref()
            .map(|g| !g.door.is_empty())
            .unwrap_or(false);

        if door_sensor_defined {
            let last_confirmed_home: u64 = self
                .get_state("apartment", "last_confirmed_home")
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);

            if last_door_close == 0 || last_door_close <= last_confirmed_home {
                let away_since = self
                    .get_state("apartment", "away_since")
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);
                if away_since > 0 {
                    let _ = self.update_device_state("apartment", "away_since", "0");
                    dt_debug!("away candidate cleared - no door pass since last home");
                }
                return;
            }
        }

        let delay_secs = self.config.presence.delay.saturating_mul(60);

        let away_since = self
            .get_state("apartment", "away_since")
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        if away_since == 0 {
            let _ = self.update_device_state("apartment", "away_since", &now.to_string());
            dt_debug!(
                "🏠 away candidate - waiting {} min before committing away",
                self.config.presence.delay
            );
            return;
        }

        let elapsed = now.saturating_sub(away_since);
        if elapsed < delay_secs {
            dt_debug!("away candidate for {}s / {}s", elapsed, delay_secs);
            return;
        }

        *self.presence_state.write().unwrap() = Some(false);
        let _ = self.update_device_state("apartment", "away_since", "0");
        dt_info!(
            "🏠 PRESENCE home --> away (after {} min)",
            self.config.presence.delay
        );
        let _ = self.update_device_state("apartment", "presence", "away");
        let _ = self.update_device_state("apartment", "presence_changed", &now.to_string());
        let topic = format!("{}/apartment/presence", self.mqtt_base_topic);
        if let Err(e) = self.mqtt_publish(&topic, "away").await {
            dt_warning!("failed to publish presence: {}", e);
        }
        for action in &self.config.presence.away_actions {
            if let Err(e) = self.execute_presence_action(action, "away", "home").await {
                dt_warning!("presence away action failed: {}", e);
            }
        }
    }
}
