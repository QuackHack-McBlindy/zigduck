use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::domain::{default_true, AutomationAction};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HouseDevice {
    #[serde(default = "default_true")]
    pub enable: bool,
    #[serde(default)]
    pub room: Option<String>,
    #[serde(default)]
    pub ip: Option<String>,
    #[serde(default)]
    pub state_endpoint: Option<String>,
    #[serde(default)]
    pub state: Option<DeviceStateConfig>,
    #[serde(default)]
    pub controls: HashMap<String, HouseControl>,
}

impl HouseDevice {
    pub fn effective_state_endpoint(&self) -> Option<&str> {
        self.state
            .as_ref()
            .and_then(|s| s.endpoint.as_deref())
            .or(self.state_endpoint.as_deref())
    }

    pub fn refresh_interval_secs(&self) -> Option<u64> {
        self.state
            .as_ref()
            .and_then(|s| s.refresh)
            .filter(|&n| n > 0)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceStateConfig {
    #[serde(default)]
    pub endpoint: Option<String>,
    #[serde(default)]
    pub refresh: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HouseControl {
    #[serde(rename = "type")]
    pub control_type: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub endpoint: Option<String>,
    #[serde(default)]
    pub min: Option<i64>,
    #[serde(default)]
    pub max: Option<i64>,
    #[serde(default)]
    pub values: Vec<String>,
    #[serde(default)]
    pub actions: Vec<AutomationAction>,
}
