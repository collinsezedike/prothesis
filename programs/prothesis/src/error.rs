use anchor_lang::prelude::*;

/// Error codes for the Prothesis DAO program
#[error_code]
pub enum ProthesisError {
    /// Returned when a member is not a council member
    #[msg("Not a council member")]
    NotCouncilMember,

    /// Error indicating that the count has either overflowed or underflowed
    #[msg("Count overflow or underflow")]
    CountOutOfRange,

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

    /// Return when the role operation seed is invalid or not recognized.
    #[msg("Invalid role operation seed: A role operation seed must be either b'promotion', b'demotion' or b'ramoval'")]
    InvalidRoleOpSeed,

    /// Treasury does not have enough funds to cover the proposal's requested amount
    #[msg("Treasury balance is less than the proposal's required amount")]
    InsufficientTreasuryBalance,

    /// The treasury account provided does not match the treasury specified in the proposal.
    #[msg("Treasury account does not match the proposal's treasury")]
    MismatchedTreasuryAccount,
}
