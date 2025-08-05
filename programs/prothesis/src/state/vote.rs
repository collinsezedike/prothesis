use anchor_lang::prelude::*;

/// Enum representing the type of vote
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq)]
pub enum VoteType {
    /// An upvote for a proposal
    Upvote,
    /// A downvote for a proposal
    Downvote,
}

/// Vote account - tracks a single user's vote on a specific proposal
#[account]
#[derive(InitSpace)]
pub struct Vote {
    /// The type of vote cast (Up or Down)
    pub vote_type: VoteType,
}

impl Vote {
    pub const SPACE: usize = 8 + Vote::INIT_SPACE;
}
