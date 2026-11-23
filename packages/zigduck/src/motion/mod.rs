use std::collections::HashMap;
use std::time::{Duration, SystemTime};

use ducktrace_logger::*;

use crate::state::ZigduckState;

#[derive(Debug, Clone)]
pub struct MotionTracker {
    pub last_motion: HashMap<String, SystemTime>,
    pub last_occupancy: HashMap<String, bool>,
}

impl ZigduckState {
    pub fn update_motion_tracker(&self, sensor_name: &str) {
        if let Ok(mut tracker) = self.motion_tracker.write() {
            tracker.last_motion.insert(sensor_name.to_string(), SystemTime::now());
        } else {
            dt_warning!("failed to lock motion tracker for update");
        }
    }


    pub fn has_recent_motion_in_room(&self, room: &str) -> bool {
        let motion_timeout = Duration::from_secs(300);

        if let Ok(tracker) = self.motion_tracker.read() {
            return tracker.last_motion.iter().any(|(sensor_name, last_motion)| {
                if let Some(device) = self.get_device(sensor_name) {
                    if device.room == room {
                        if let Ok(elapsed) = SystemTime::now().duration_since(*last_motion) {
                            return elapsed < motion_timeout;
                        }
                    }
                }
                false
            });
        }
        false
    }

    pub fn get_motion_sensor_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self
            .devices
            .iter()
            .filter(|(_, d)| d.device_type.contains("motion"))
            .map(|(name, _)| name.clone())
            .collect();

        if let Ok(tracker) = self.motion_tracker.read() {
            for sensor in tracker.last_motion.keys() {
                if self.devices.contains_key(sensor) && !names.contains(sensor) {
                    names.push(sensor.clone());
                }
            }
        }
        names
    }

    pub async fn check_no_motion_global(&self) {
        if !self.config.no_motion.enabled {
            return;
        }

        let sensors = self.get_motion_sensor_names();
        if sensors.is_empty() {
            dt_debug!("no motion sensors found; skipping global no-motion check");
            return;
        }

        let after_seconds = self.config.no_motion.after * 60;
        let now = SystemTime::now();

        let all_no_motion = match self.motion_tracker.read() {
            Ok(tracker) => sensors.iter().all(|sensor| {
                match tracker.last_motion.get(sensor) {
                    None => true,
                    Some(last) => now
                        .duration_since(*last)
                        .map(|d| d.as_secs() >= after_seconds)
                        .unwrap_or(true),
                }
            }),
            Err(_) => false,
        };

        if all_no_motion {
            dt_info!(
                "no motion for {} minutes on all sensors; turning off lights (excluding {:?})",
                self.config.no_motion.after,
                self.config.no_motion.exclude
            );

            if let Err(e) = self.all_lights_off_except(&self.config.no_motion.exclude).await {
                dt_warning!("failed to turn off all lights: {}", e);
            }
        }
    }


    pub fn set_motion_triggered(
        &self,
        room: &str,
        triggered: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut map = self.motion_triggered.write().unwrap();
        map.insert(room.to_string(), triggered);
        Ok(())
    }

    pub fn is_motion_triggered(&self, room: &str) -> bool {
        let map = self.motion_triggered.read().unwrap();
        map.get(room).copied().unwrap_or(false)
    }
}
