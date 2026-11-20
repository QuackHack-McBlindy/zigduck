use serde::{Deserialize, Serialize};

use crate::domain::AutomationAction;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub probes: Vec<String>,
    #[serde(default = "default_probe_interval")]
    pub probe_interval_secs: u64,
    #[serde(default = "default_probe_timeout")]
    pub probe_timeout_secs: u64,
    #[serde(default = "default_presence_delay")]
    pub delay: u64,
    #[serde(default)]
    pub home_actions: Vec<AutomationAction>,
    #[serde(default)]
    pub away_actions: Vec<AutomationAction>,
}

fn default_presence_delay() -> u64 { 30 }
fn default_probe_interval() -> u64 { 60 }
fn default_probe_timeout()  -> u64 { 2 }

impl Default for PresenceConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            probes: vec![],
            probe_interval_secs: default_probe_interval(),
            probe_timeout_secs:  default_probe_timeout(),
            delay:                 default_presence_delay(),
            home_actions: vec![],
            away_actions: vec![],
        }
    }
}
