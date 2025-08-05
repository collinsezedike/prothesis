use anchor_lang::prelude::*;

/// DAO configuration account - singleton that stores governance parameters
#[account]
#[derive(InitSpace)]
pub struct DAOConfig {
    /// DAO id differentiator
    pub id: u64,
    /// The authority that can update DAO parameters
    pub authority: Option<Pubkey>,
    /// Minimum percentage of upvotes/downvote required for approval/dismissal, as basis point (e.g., 1000 = 10%)
    pub vote_pct: u16,
    /// Minimum percentage of signature required for funds withdrawal, as basis point (e.g., 1000 = 10%)
    pub min_sig_pct: u16,
    /// Lifetime of a proposal in seconds (e.g., 604800 = 7 days)
    pub proposal_lifetime: i64,
    /// PDA bump
    pub bump: u8,
}

impl DAOConfig {
    pub const SPACE: usize = 8 + DAOConfig::INIT_SPACE; //
}
