use chrono::{Local, Timelike};
use ducktrace_logger::*;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::Condition;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn check_conditions(&self, conditions: &[Condition]) -> bool {
        for condition in conditions {
            if !self.check_condition(condition).await {
                return false;
            }
        }
        true
    }

    pub async fn check_condition(&self, condition: &Condition) -> bool {
        match condition.condition_type.as_str() {
            "dark_time" => self.is_dark_time(),
            "someone_home" => {
                if let Some(expected_value) = condition.value {
                    self.is_someone_home() == expected_value
                } else { self.is_someone_home() }
            }
            "room_occupied" => {
                if let Some(room) = &condition.room {
                    self.is_motion_triggered(room) || self.has_recent_motion_in_room(room)
                } else { false }
            }
            _ => false,
        }
    }

    pub fn is_dark_time(&self) -> bool {
        if !self.config.dark_time.enabled {
            return true;
        }
        let now = Local::now();
        let hour = now.hour();
        hour >= self.config.dark_time.after || hour <= self.config.dark_time.before
    }

    pub fn is_someone_home(&self) -> bool {
        if let Some(v) = *self.presence_state.read().unwrap() {
            return v;
        }
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let last_motion: u64 = self
            .get_state("apartment", "last_motion")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        const MOTION_GRACE_SECS: u64 = 300;
        last_motion > 0 && now.saturating_sub(last_motion) < MOTION_GRACE_SECS
    }

    pub async fn check_time_range(
        &self,
        start: &Option<String>,
        end: &Option<String>,
        days: &[String],
    ) -> bool {
        let now = Local::now();
        let current_day = now.format("%a").to_string().to_lowercase();

        if !days.iter().any(|day| day == &current_day) {
            return false;
        }

        if end.is_none() {
            if let Some(start_str) = start {
                if let Ok(start_time) = chrono::NaiveTime::parse_from_str(start_str, "%H:%M") {
                    let current_time = now.time();
                    return current_time.hour() == start_time.hour()
                        && current_time.minute() == start_time.minute();
                }
            }
            return false;
        }

        if let (Some(start_str), Some(end_str)) = (start, end) {
            if let (Ok(start_time), Ok(end_time)) = (
                chrono::NaiveTime::parse_from_str(start_str, "%H:%M"),
                chrono::NaiveTime::parse_from_str(end_str, "%H:%M"),
            ) {
                let current_time = now.time();
                return current_time >= start_time && current_time <= end_time;
            }
        }

        if let Some(start_str) = start {
            if let Ok(start_time) = chrono::NaiveTime::parse_from_str(start_str, "%H:%M") {
                if now.time() < start_time {
                    return false;
                }
            }
        }
        if let Some(end_str) = end {
            if let Ok(end_time) = chrono::NaiveTime::parse_from_str(end_str, "%H:%M") {
                if now.time() > end_time {
                    return false;
                }
            }
        }
        true
    }

    pub async fn check_time_based_automations(&self) {
        for (name, automation) in &self.automations.time_based {
            if !automation.enable {
                continue;
            }
            let schedule_matches = self
                .check_time_range(
                    &automation.schedule.start,
                    &automation.schedule.end,
                    &automation.schedule.days,
                )
                .await;

            if schedule_matches && self.check_conditions(&automation.conditions).await {
                for action in &automation.actions {
                    if let Err(e) = self
                        .execute_automation_action(action, "time_based", "global")
                        .await
                    {
                        dt_debug!("Error executing time-based automation: {}", e);
                    }
                }
            }
            let _ = name;
        }
    }

    pub async fn check_presence_automations(&self) {
        for (name, automation) in &self.automations.presence_based {
            if !automation.enable {
                continue;
            }
            let all_no_motion = automation.motion_sensors.iter().all(|sensor| {
                match self.motion_tracker.read() {
                    Ok(tracker) => tracker
                        .last_motion
                        .get(sensor)
                        .and_then(|last| SystemTime::now().duration_since(*last).ok())
                        .map(|d| d.as_secs() >= automation.no_motion_duration)
                        .unwrap_or(false),
                    Err(_) => false,
                }
            });

            if all_no_motion && self.check_conditions(&automation.conditions).await {
                for action in &automation.actions {
                    if let Err(e) = self
                        .execute_automation_action(action, "presence_based", "global")
                        .await
                    {
                        dt_debug!("Error executing presence automation: {}", e);
                    }
                }
            }
            let _ = name;
        }
    }
}
