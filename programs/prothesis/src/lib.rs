pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("5Smo5qyWNHkaQ5KouJ8X1em8Zwwy3Bvwz3DWELjaZQkp");

#[program]
pub mod prothesis {
    use super::*;

    pub fn initialize_dao(
        ctx: Context<InitializeDAO>,
        id: u64,
        consensus_pct: u16,
        consensus_lifetime: i64,
    ) -> Result<()> {
        ctx.accounts
            .initialize_dao(id, consensus_pct, consensus_lifetime, &ctx.bumps)
    }

    pub fn fund_dao(ctx: Context<FundDAO>, amount: u64) -> Result<()> {
        ctx.accounts.fund_dao(amount)
    }

    pub fn add_member(ctx: Context<AddMember>) -> Result<()> {
        ctx.accounts.add_member(&ctx.bumps)
    }

    pub fn initiate_promotion(ctx: Context<InitiatePromotion>) -> Result<()> {
        ctx.accounts.initiate_promotion(&ctx.bumps)
    }

    pub fn vote_on_promotion(ctx: Context<VoteOnPromotion>, vote: u8) -> Result<()> {
        ctx.accounts.vote_on_promotion(vote)
    }

    pub fn review_promotion(ctx: Context<ReviewPromotion>) -> Result<()> {
        ctx.accounts.review_promotion()
    }

    pub fn resolve_promotion(ctx: Context<ResolvePromotion>) -> Result<()> {
        ctx.accounts.resolve_promotion()
    }

    pub fn submit_proposal(
        ctx: Context<SubmitProposal>,
        title: String,
        content: String,
        treasury: Pubkey
    ) -> Result<()> {
        ctx.accounts.submit_proposal(title, content, treasury, &ctx.bumps)
    }

    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, vote: u8) -> Result<()> {
        ctx.accounts.vote_on_proposal(vote)
    }

    pub fn review_proposal(ctx: Context<ReviewProposal>) -> Result<()> {
        ctx.accounts.review_proposal()
    }

    // pub fn resolve_proposal(ctx: Context<ResolveProposal>) -> Result<()> {
    //     ctx.accounts.resolve_proposal()
    // }
}
