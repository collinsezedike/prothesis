use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata, MetadataAccount},
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::types::DataV2;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED, TREASURY_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, Status},
};

#[derive(Accounts)]
pub struct ResolveProposal<'info> {
    // Anybody can resolve the proposal, not just the author or council members
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        seeds = [MEMBER_SEED, resolver.key().as_ref(), dao_config.key().as_ref()],
        bump = resolver_member.bump
    )]
    pub resolver_member: Account<'info, Member>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, proposal.title.as_bytes().as_ref(), dao_config.key().as_ref()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump,
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump = dao_config.treasury_bump
    )]
    pub dao_treasury: SystemAccount<'info>,

    /// CHECK: This is validated with the treasury field in the proposal struct
    #[account(mut)]
    pub proposal_treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,

    // Optional NFT minting accounts
    #[account(
        init,
        payer = resolver,
        mint::decimals = 0,
        mint::authority = dao_treasury.key,
        mint::freeze_authority = dao_treasury,
        // seeds = [proposal.title.as_bytes().as_ref(), proposal.key().as_ref()],
        // bump,
    )]
    pub nft_mint: Option<Account<'info, Mint>>,

    #[account(
        init,
        payer = resolver,
        associated_token::mint = nft_mint,
        associated_token::authority = dao_treasury,
    )]
    pub dao_token_account: Option<Account<'info, TokenAccount>>,

    /// CHECK: This is the metadata account that will be created
    #[account(mut)]
    pub metadata_account: Option<AccountInfo<'info>>,

    pub token_metadata_program: Option<Program<'info, Metadata>>,

    pub token_program: Option<Program<'info, Token>>,

    pub associated_token_program: Option<Program<'info, AssociatedToken>>,

    pub rent: Option<Sysvar<'info, Rent>>,
}

impl<'info> ResolveProposal<'info> {
    pub fn resolve_proposal(&mut self, remaining_accounts: Vec<AccountInfo>) -> Result<()> {
        match self.proposal.status {
            Status::Approved => {
                self.check_signers(remaining_accounts)?;
                self.transfer_funds()?;
                self.mint_nft()?;
            }
            Status::Dismissed | Status::Expired => {} // Do nothing, just close the account
            Status::Pending => return Err(ProthesisError::CannotResolveBeforeReview.into()),
        };

        Ok(())
    }

    pub fn check_signers(&self, remaining_accounts: Vec<AccountInfo>) -> Result<()> {
        // If the resolver member itself is already a council member, that's enough
        let mut found_council_member = self.resolver_member.is_council;
        let mut signers_count: u64 = 1; // resolver_member counts as one signer

        // Collect all signer public keys from the remaining accounts (the actual keypair signers)
        let signer_pubkeys: Vec<Pubkey> = remaining_accounts
            .iter()
            .filter(|acct_info| acct_info.is_signer)
            .map(|acct_info| *acct_info.key)
            .collect();

        // Iterate through all remaining accounts to find Member accounts
        for acct_info in remaining_accounts.iter() {
            // Try to deserialize as Member
            if let Ok(data) = acct_info.try_borrow_data() {
                if let Ok(member) = Member::try_deserialize(&mut &data[..]) {
                    // Check if this member's owner is one of the signer keys
                    if signer_pubkeys.contains(&member.owner) {
                        signers_count = signers_count
                            .checked_add(1)
                            .ok_or(ProthesisError::CountOutOfRange)?;

                        // Check if this member is council
                        if member.is_council {
                            found_council_member = true;
                        }

                        // Break early if conditions met
                        if found_council_member
                            && signers_count >= self.dao_config.min_multisig_signers
                        {
                            break;
                        }
                    }
                }
            }
        }

        require!(found_council_member, ProthesisError::NoCouncilMemberSigned);
        require!(
            signers_count >= self.dao_config.min_multisig_signers,
            ProthesisError::InsufficientMultisigSigners
        );

        Ok(())
    }

    pub fn transfer_funds(&mut self) -> Result<()> {
        require!(
            self.dao_treasury.to_account_info().lamports() > self.proposal.amount_required,
            ProthesisError::InsufficientTreasuryBalance
        );

        require!(
            self.proposal_treasury.key() == self.proposal.treasury.key(),
            ProthesisError::MismatchedTreasuryAccount
        );

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.dao_treasury.to_account_info(),
            to: self.proposal_treasury.to_account_info(),
        };

        let dao_config = self.dao_config.key();

        let seeds: &[&[&[u8]]] = &[&[
            TREASURY_SEED,
            &dao_config.as_ref(),
            &[self.dao_config.treasury_bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds);

        transfer(cpi_ctx, self.proposal.amount_required)
    }

    pub fn mint_nft(&self) -> Result<()> {
        // Ensure all required accounts are present
        let nft_mint = self
            .nft_mint
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let dao_token_account = self
            .dao_token_account
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let metadata_account = self
            .metadata_account
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let token_metadata_program = self
            .token_metadata_program
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let token_program = self
            .token_program
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let _associated_token_program = self
            .associated_token_program
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;
        let rent = self
            .rent
            .as_ref()
            .ok_or(ProthesisError::MissingNftAccounts)?;

        // 1. Mint the NFT token
        let dao_config = self.dao_config.key();
        let seeds: &[&[&[u8]]] = &[&[
            TREASURY_SEED,
            &dao_config.as_ref(),
            &[self.dao_config.treasury_bump],
        ]];

        let cpi_accounts = MintTo {
            mint: nft_mint.to_account_info(),
            to: dao_token_account.to_account_info(),
            authority: self.dao_treasury.to_account_info(),
        };

        let cpi_ctx =
            CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, seeds);

        mint_to(cpi_ctx, 1)?;

        // 2. Create metadata for the NFT
        let metadata_uri = format!(
            "https://prothesis.dao/proposals/{}",
            self.proposal.title.replace(" ", "-").to_lowercase()
        );

        let data_v2 = DataV2 {
            name: self.proposal.title.clone(),
            symbol: "PROTHESIS".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let cpi_accounts = CreateMetadataAccountsV3 {
            metadata: metadata_account.to_account_info(),
            mint: nft_mint.to_account_info(),
            mint_authority: self.dao_treasury.to_account_info(),
            payer: self.resolver.to_account_info(),
            update_authority: self.dao_treasury.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: rent.to_account_info(),
        };

        let cpi_ctx =
            CpiContext::new_with_signer(token_metadata_program.to_account_info(), cpi_accounts, seeds);

        create_metadata_accounts_v3(
            cpi_ctx, data_v2, true, // is_mutable
            true, // update_authority_is_signer
            None, // collection_details
        )?;

        Ok(())
    }
}
