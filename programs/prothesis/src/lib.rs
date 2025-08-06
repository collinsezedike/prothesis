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
        authority: Option<Pubkey>,
        vote_pct: u16,
        min_sig_pct: u16,
        proposal_lifetime: i64,
    ) -> Result<()> {
        ctx.accounts.initialize_dao(
            id,
            authority,
            vote_pct,
            min_sig_pct,
            proposal_lifetime,
            &ctx.bumps,
        )
    }

    pub fn fund_dao(ctx: Context<FundDAO>, amount: u64) -> Result<()> {
        ctx.accounts.fund_dao(amount)
    }
    
    pub fn submit_proposal(
        ctx: Context<SubmitProposal>,
        title: String,
        content: String,
    ) -> Result<()> {
        ctx.accounts.submit_proposal(title, content, &ctx.bumps)
    }

    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, vote: u8) -> Result<()> {
        ctx.accounts.vote_on_proposal(vote)
    }
}
