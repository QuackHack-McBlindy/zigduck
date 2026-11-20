use serde::{Deserialize, Serialize};

use crate::domain::default_true;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TvConfig {
    #[serde(default = "default_true")]
    pub enable: bool,
    pub ip: String,
    #[serde(default = "default_tv_poll_secs")]
    pub poll_interval: u64,
}

fn default_tv_poll_secs() -> u64 {
    30
}
