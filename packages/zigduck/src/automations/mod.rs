pub mod action;
pub mod condition;
pub mod presence;
pub mod trigger;

use crate::state::ZigduckState;

impl ZigduckState {
    pub fn away_duration_secs(&self) -> u64 {
        self.automations
            .greeting
            .as_ref()
            .map(|g| g.away_duration)
            .unwrap_or(7200)
    }
}
