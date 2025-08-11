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

    pub fn exit_dao(ctx: Context<ExitDao>) -> Result<()> {
        ctx.accounts.exit_dao()
    }

    pub fn initiate_role_op(ctx: Context<InitiateRoleOp>, role_op_seed: Vec<u8>) -> Result<()> {
        ctx.accounts.initiate_role_op(role_op_seed, &ctx.bumps)
    }

    pub fn vote_on_role_op(ctx: Context<VoteOnRoleOp>, vote: u8) -> Result<()> {
        ctx.accounts.vote_on_role_op(vote)
    }

    pub fn review_role_op(ctx: Context<ReviewRoleOp>) -> Result<()> {
        ctx.accounts.review_role_op()
    }

    pub fn resolve_role_op(ctx: Context<ResolveRoleOp>) -> Result<()> {
        ctx.accounts.resolve_role_op()
    }

    pub fn submit_proposal(
        ctx: Context<SubmitProposal>,
        title: String,
        content: String,
        treasury: Pubkey,
    ) -> Result<()> {
        ctx.accounts
            .submit_proposal(title, content, treasury, &ctx.bumps)
    }

    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, vote: u8) -> Result<()> {
        ctx.accounts.vote_on_proposal(vote)
    }

    pub fn review_proposal(ctx: Context<ReviewProposal>) -> Result<()> {
        ctx.accounts.review_proposal()
    }

    pub fn resolve_proposal(ctx: Context<ResolveProposal>) -> Result<()> {
        ctx.accounts.resolve_proposal()
    }
}
