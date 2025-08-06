use anchor_lang::prelude::*;

/// Member account - stores the user joined 
#[account]
#[derive(InitSpace)]
pub struct Member {
    /// Time the member joined
    pub joined_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl Member {
    pub const SPACE: usize = 8 + Member::INIT_SPACE;
}
