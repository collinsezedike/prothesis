use anchor_lang::prelude::*;

/// DAO configuration account - singleton that stores governance parameters
#[account]
#[derive(InitSpace)]
pub struct DAOConfig {
    /// DAO id differentiator
    pub id: u64,
    /// Minimum percentage of upvotes/downvote required for approval/dismissal, as basis point (e.g., 1000 = 10%)
    pub consensus_pct: u16,
    /// Lifetime of a proposal/promotion in seconds (e.g., 604800 = 7 days)
    pub consensus_lifetime: i64,
    /// Number of dao members
    pub members_count: u64,
    /// Number of dao council members
    pub council_count: u64,
    /// PDA bump
    pub bump: u8,
    /// Treasury bump
    pub treasury_bump: u8,
}

impl DAOConfig {
    pub const SPACE: usize = 8 + DAOConfig::INIT_SPACE;
}
