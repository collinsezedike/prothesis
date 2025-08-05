use anchor_lang::prelude::*;

/// Error codes for the Prothesis DAO program
#[error_code]
pub enum ProthesisError {
    /// Returned when a non-authority tries to perform an admin action
    #[msg("Only the DAO authority can perform this action")]
    InvalidAuthority,

    /// Returned when proposal title exceeds the maximum length
    #[msg("Proposal title exceeds maximum length")]
    TitleTooLong,

    /// Returned when proposal content exceeds the maximum length
    #[msg("Proposal content exceeds maximum length")]
    ContentTooLong,

    /// Returned when trying to vote on a proposal that is not in Pending status
    #[msg("Voting is only allowed on pending proposals")]
    ProposalNotPending,

    /// Returned when the specified vote is neither 0 nor 1
    #[msg("Invalid vote type: A vote must be either 1 for upvote or 0 for downvote")]
    InvalidVoteType,

    /// Returned when a user tries to vote twice on the same proposal
    #[msg("User has already voted on this proposal")]
    DuplicateVote,
}
