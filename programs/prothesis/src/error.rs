use anchor_lang::prelude::*;

/// Error codes for the Prothesis DAO program
#[error_code]
pub enum ProthesisError {
    /// Returned when a member is not a council member
    #[msg("Not a council member")]
    NotCouncilMember,

    /// Returned when proposal title exceeds the maximum length
    #[msg("Proposal title exceeds maximum length")]
    TitleTooLong,

    /// Returned when proposal content exceeds the maximum length
    #[msg("Proposal content exceeds maximum length")]
    ContentTooLong,

    /// Returned when trying to vote on a proposal that is not in Pending status
    #[msg("Voting is only allowed on pending proposals")]
    ProposalNotPending,

    /// Returned when trying to review a proposal or promotion that has previously been reviewed
    #[msg("This has already been reviewed")]
    AlreadyReviewed,

    /// Returned when trying to resolve a proposal or promotion that has not been reviewed
    #[msg("This cannot be resolved until it has been reviewed.")]
    CannotResolveBeforeReview,

    /// Returned when the specified vote is neither 0 nor 1
    #[msg("Invalid vote type: A vote must be either 1 for upvote or 0 for downvote")]
    InvalidVoteType,

    /// Returned when a user tries to vote twice on the same proposal
    #[msg("User has already voted on this proposal")]
    DuplicateVote,
}
