use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationConfig {
    pub dimmer_actions: HashMap<String, RoomDimmerActions>,
    pub room_actions: HashMap<String, HashMap<String, Vec<AutomationAction>>>,
    pub global_actions: HashMap<String, Vec<AutomationAction>>,
    pub time_based: HashMap<String, TimeBasedAutomation>,
    pub presence_based: HashMap<String, PresenceBasedAutomation>,
    pub mqtt_triggered: HashMap<String, MqttTriggeredAutomation>,
    pub greeting: Option<GreetingAutomation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomDimmerActions {
    pub on_press_release: Option<DimmerAction>,
    pub on_hold_release: Option<DimmerAction>,
    pub off_press_release: Option<DimmerAction>,
    pub off_hold_release: Option<DimmerAction>,
    pub up_press_release: Option<DimmerAction>,
    pub up_hold_release: Option<DimmerAction>,
    pub down_press_release: Option<DimmerAction>,
    pub down_hold_release: Option<DimmerAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimmerAction {
    pub enable: bool,
    pub description: String,
    pub extra_actions: Vec<AutomationAction>,
    #[serde(default)]
    pub override_actions: Vec<AutomationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AutomationAction {
    Simple(String),
    Structured(StructuredAction),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub command: Option<String>,
    pub topic: Option<String>,
    pub message: Option<String>,
    pub scene: Option<String>,
    pub duration: Option<u64>,
    pub snapshot_name: Option<String>,
    pub scope: Option<String>,
    pub room: Option<String>,
    pub devices: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeBasedAutomation {
    pub enable: bool,
    pub description: String,
    pub schedule: TimeRangeSchedule,
    pub conditions: Vec<Condition>,
    pub actions: Vec<AutomationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceBasedAutomation {
    pub enable: bool,
    pub description: String,
    pub motion_sensors: Vec<String>,
    pub no_motion_duration: u64,
    pub conditions: Vec<Condition>,
    pub actions: Vec<AutomationAction>,
    pub motion_restored_actions: Vec<AutomationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttTriggeredAutomation {
    pub enable: bool,
    pub description: String,
    pub topic: String,
    pub message: Option<String>,
    pub conditions: Vec<Condition>,
    pub actions: Vec<AutomationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRangeSchedule {
    pub start: Option<String>,
    pub end: Option<String>,
    pub days: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    #[serde(rename = "type")]
    pub condition_type: String,
    pub room: Option<String>,
    pub value: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GreetingAutomation {
    pub enable: bool,
    pub away_duration: u64,
    pub door: String,
    pub message: String,
    pub delay: u64,
    pub actions: Vec<AutomationAction>,
}
