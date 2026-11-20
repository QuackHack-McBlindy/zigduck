use std::time::Duration;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn start_periodic_checks(&self) {
        let no_motion_interval_secs = std::cmp::max(self.config.no_motion.after * 60, 30);
        let state = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(no_motion_interval_secs));
            loop {
                interval.tick().await;
                state.check_no_motion_global().await;
            }
        });


        let state = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                state.check_presence_automations().await;
                state.check_time_based_automations().await;
                state.check_presence_transition().await;
            }
        });
    }
}
