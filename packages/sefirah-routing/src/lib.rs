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
    FallbackConsentRequired,
}

/// An explicit decision made for this delivery, not a stored global preference.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FallbackConsent {
    Approved,
    Denied,
}

/// Exactly one delivery attempt may be active. Cloudflare is never selected by default.
pub struct DeliveryPlan {
    next: usize,
    available_peer_routes: [bool; 3],
    pending: Option<Route>,
    delivered: bool,
    cloud_authorized: bool,
}

impl Default for DeliveryPlan {
    fn default() -> Self {
        Self::with_available_peer_routes([false, false, false])
    }
}

impl DeliveryPlan {
    pub fn new() -> Self {
        Self::default()
    }

    /// The transport layer must report actually available peer routes. A
    /// disabled route cannot be treated as having successfully delivered data.
    pub fn with_available_peer_routes(available_peer_routes: [bool; 3]) -> Self {
        Self {
            next: 0,
            available_peer_routes,
            pending: None,
            delivered: false,
            cloud_authorized: false,
        }
    }

    fn skip_unavailable(&mut self) {
        while self.next < PEER_ROUTES.len() && !self.available_peer_routes[self.next] {
            self.next += 1;
        }
    }

    /// Reserve the next route. A failed route must be acknowledged before another begins.
    pub fn next_route(&mut self) -> Option<Route> {
        if self.delivered || self.pending.is_some() {
            return None;
        }
        self.skip_unavailable();
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

    /// Can only be called after every peer route has failed and explicit consent
    /// has been given for this one delivery. This does not send any data.
    pub fn authorize_last_resort(&mut self, consent: FallbackConsent) -> Result<(), RouteError> {
        if self.pending.is_none() {
            self.skip_unavailable();
        }
        if self.delivered || self.pending.is_some() || self.next != PEER_ROUTES.len() {
            return Err(RouteError::PeerRoutesNotExhausted);
        }
        if consent != FallbackConsent::Approved {
            return Err(RouteError::FallbackConsentRequired);
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
    use super::{DeliveryPlan, FallbackConsent, Route, RouteError};

    #[test]
    fn peer_routes_precede_cloud_and_cloud_is_disabled_by_default() {
        let mut plan = DeliveryPlan::with_available_peer_routes([true, true, true]);
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        assert_eq!(plan.next_route(), None);
        assert_eq!(plan.authorize_last_resort(FallbackConsent::Approved), Err(RouteError::PeerRoutesNotExhausted));
        plan.acknowledge(Route::Sefirah, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Nearby));
        plan.acknowledge(Route::Nearby, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::TrustedCarrier));
        plan.acknowledge(Route::TrustedCarrier, false).unwrap();
        assert_eq!(plan.next_route(), None);
    }

    #[test]
    fn explicit_last_resort_is_only_available_after_peer_failures() {
        let mut plan = DeliveryPlan::with_available_peer_routes([true, true, true]);
        for route in [Route::Sefirah, Route::Nearby, Route::TrustedCarrier] {
            assert_eq!(plan.next_route(), Some(route));
            plan.acknowledge(route, false).unwrap();
        }
        assert_eq!(plan.authorize_last_resort(FallbackConsent::Denied), Err(RouteError::FallbackConsentRequired));
        assert_eq!(plan.next_route(), None);
        plan.authorize_last_resort(FallbackConsent::Approved).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Cloudflare));
        plan.acknowledge(Route::Cloudflare, false).unwrap();
        assert_eq!(plan.next_route(), None);
    }

    #[test]
    fn a_success_stops_all_other_routes() {
        let mut plan = DeliveryPlan::with_available_peer_routes([true, true, true]);
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        plan.acknowledge(Route::Sefirah, true).unwrap();
        assert!(plan.delivered());
        assert_eq!(plan.next_route(), None);
        assert_eq!(plan.authorize_last_resort(FallbackConsent::Approved), Err(RouteError::PeerRoutesNotExhausted));
    }

    #[test]
    fn stale_or_wrong_acknowledgements_cannot_advance_delivery() {
        let mut plan = DeliveryPlan::with_available_peer_routes([true, true, true]);
        assert_eq!(plan.acknowledge(Route::Sefirah, false), Err(RouteError::NoPendingAttempt));
        assert_eq!(plan.next_route(), Some(Route::Sefirah));
        assert_eq!(plan.acknowledge(Route::Cloudflare, true), Err(RouteError::WrongAttempt));
        assert_eq!(plan.next_route(), None);
        plan.acknowledge(Route::Sefirah, false).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Nearby));
    }

    #[test]
    fn unavailable_peer_transports_are_skipped_without_faking_success() {
        let mut plan = DeliveryPlan::with_available_peer_routes([false, true, false]);
        assert_eq!(plan.next_route(), Some(Route::Nearby));
        plan.acknowledge(Route::Nearby, false).unwrap();
        assert_eq!(plan.next_route(), None);
        assert_eq!(plan.authorize_last_resort(FallbackConsent::Denied), Err(RouteError::FallbackConsentRequired));
        plan.authorize_last_resort(FallbackConsent::Approved).unwrap();
        assert_eq!(plan.next_route(), Some(Route::Cloudflare));
    }

    #[test]
    fn an_unavailable_transport_cannot_be_acknowledged() {
        let mut plan = DeliveryPlan::new();
        assert_eq!(plan.acknowledge(Route::Sefirah, true), Err(RouteError::NoPendingAttempt));
        assert!(!plan.delivered());
        assert_eq!(plan.next_route(), None);
    }
}
