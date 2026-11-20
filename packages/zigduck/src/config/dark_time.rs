use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DarkTimeConfig {
    pub enabled: bool,
    pub transition: bool,
    pub after: u32,
    pub before: u32,
    pub duration: u64,
}
