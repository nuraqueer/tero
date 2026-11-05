//! Delivery policy only. This crate never opens a network connection or stores plaintext.

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Route {
    Sefirah,
    Nearby,
    TrustedCarrier,
    Cloudflare,
}

const PEER_ROUTES: [Route; 3] = [Route::Sefirah, Route::Nearby, Route::TrustedCarrier];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RouteError {
    NoPendingAttempt,
    WrongAttempt,
    PeerRoutesNotExhausted,
}

/// Exactly one delivery attempt may be active. Cloudflare is never selected by default.
#[derive(Default)]
pub struct DeliveryPlan {
    next: usize,
    pending: Option<Route>,
    delivered: bool,
    cloud_authorized: bool,
}

impl DeliveryPlan {
    pub fn new() -> Self {
        Self::default()
    }

    /// Reserve the next route. A failed route must be acknowledged before another begins.
    pub fn next_route(&mut self) -> Option<Route> {
        if self.delivered || self.pending.is_some() {
            return None;
        }
        let route = if let Some(route) = PEER_ROUTES.get(self.next).copied() {
            route
        } else if self.next == PEER_ROUTES.len() && self.cloud_authorized {
            Route::Cloudflare
        } else {
            return None;
        };
        self.pending = Some(route);
        Some(route)
    }

    /// The caller must verify the receipt before reporting success.
    pub fn acknowledge(&mut self, route: Route, delivered: bool) -> Result<(), RouteError> {
        match self.pending {
            None => return Err(RouteError::NoPendingAttempt),
            Some(pending) if pending != route => return Err(RouteError::WrongAttempt),
            Some(_) => {}
        }
        self.pending = None;
        self.delivered = delivered;
        if !delivered {
            self.next += 1;
        }
        Ok(())
    }

    /// Can only be called after every peer route has failed, never pre-authorized.
    pub fn authorize_last_resort(&mut self) -> Result<(), RouteError> {
        if self.delivered || self.pending.is_some() || self.next != PEER_ROUTES.len() {
            return Err(RouteError::PeerRoutesNotExhausted);
        }
        self.cloud_authorized = true;
        Ok(())
    }

    pub fn delivered(&self) -> bool {
        self.delivered
    }
}

#[cfg(test)]
mod tests {
    use super::{DeliveryPlan, Route, RouteError};

    #[test]
    fn peer_routes_precede_cloud_and_cloud_is_disabled_by_default() {
        let mut plan = DeliveryPlan::new();
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        assert_eq!(plan.next_route(), None);
        assert_eq!(plan.authorize_last_resort(), Err(RouteError::PeerRoutesNotExhausted));
        plan.acknowledge(Route::Sefirah, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Nearby));
        plan.acknowledge(Route::Nearby, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::TrustedCarrier));
        plan.acknowledge(Route::TrustedCarrier, false).unwrap();
        assert_eq!(plan.next_route(), None);
    }

    #[test]
    fn explicit_last_resort_is_only_available_after_peer_failures() {
        let mut plan = DeliveryPlan::new();
        for route in [Route::Sefirah, Route::Nearby, Route::TrustedCarrier] {
            assert_eq!(plan.next_route(), Some(route));
            plan.acknowledge(route, false).unwrap();
        }
        plan.authorize_last_resort().unwrap();
        assert_eq!(plan.next_route(), Some(Route::Cloudflare));
        plan.acknowledge(Route::Cloudflare, false).unwrap();
        assert_eq!(plan.next_route(), None);
    }

    #[test]
    fn a_success_stops_all_other_routes() {
        let mut plan = DeliveryPlan::new();
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        plan.acknowledge(Route::Sefirah, true).unwrap();
        assert!(plan.delivered());
        assert_eq!(plan.next_route(), None);
        assert_eq!(plan.authorize_last_resort(), Err(RouteError::PeerRoutesNotExhausted));
    }

    #[test]
    fn stale_or_wrong_acknowledgements_cannot_advance_delivery() {
        let mut plan = DeliveryPlan::new();
        assert_eq!(plan.acknowledge(Route::Sefirah, false), Err(RouteError::NoPendingAttempt));
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        assert_eq!(plan.acknowledge(Route::Cloudflare, true), Err(RouteError::WrongAttempt));
        assert_eq!(plan.next_route(), None);
        plan.acknowledge(Route::Sefirah, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Nearby));
    }
}
