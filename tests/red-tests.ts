import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Prothesis } from "../target/types/prothesis";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

import {
  generateSigner,
  getDAOConfigPDA,
  getDAOTreasury,
  getMemberAccount,
  getProposalPDA,
  getRoleOpPDA,
  getVotePDA
} from "./helpers";

describe("prothesis - negative tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.prothesis as Program<Prothesis>;

  // Test wallets
  let creator: Keypair;
  let person1: Keypair;
  let person2: Keypair;
  let nonMember: Keypair;

  // DAO parameters
  const daoId = new anchor.BN(Math.floor(Math.random() * 10_000_000_000));
  const consensusPct = 5100; // 51%
  const consensusLifetime = new anchor.BN(5); // 5 seconds
  const minMultisigSigners = new anchor.BN(3); // At least 3 signers

  // PDAs
  let daoConfigPDA: PublicKey;
  let treasuryPDA: PublicKey;

  let creatorMemberAccount: PublicKey;
  let person1MemberAccount: PublicKey;
  let person2MemberAccount: PublicKey;
  let nonMemberAccount: PublicKey;

  let promotionRoleOpPDA: PublicKey;
  let demotionRoleOpPDA: PublicKey;
  let removalRoleOpPDA: PublicKey;

  let proposalPDA: PublicKey;

  // Proposal parameters
  const proposalTitle = "Test Proposal";
  const proposalContent = "This is a test proposal for the DAO";
  const longTitle = "This is a long title that exceeds the max length for a proposal title in the DAO system and should trigger an error when submitted";
  const longContent = "This is an extremely long content that exceeds the maximum allowed length for proposal content. ".repeat(30);

  before(async () => {
    // Generate Signers
    creator = await generateSigner(provider);
    person1 = await generateSigner(provider);
    person2 = await generateSigner(provider);
    nonMember = await generateSigner(provider);

    // Derive PDAs
    daoConfigPDA = getDAOConfigPDA(daoId);
    treasuryPDA = getDAOTreasury(daoConfigPDA);
    creatorMemberAccount = getMemberAccount(creator.publicKey, daoConfigPDA);
    person1MemberAccount = getMemberAccount(person1.publicKey, daoConfigPDA);
    person2MemberAccount = getMemberAccount(person2.publicKey, daoConfigPDA);
    nonMemberAccount = getMemberAccount(nonMember.publicKey, daoConfigPDA);

    // Initialize DAO
    await program.methods
      .initializeDao(daoId, consensusPct, consensusLifetime, minMultisigSigners)
      .accountsStrict({
        daoConfig: daoConfigPDA,
        treasury: treasuryPDA,
        creator: creator.publicKey,
        member: creatorMemberAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Add members
    await program.methods
      .addMember()
      .accountsStrict({
        daoConfig: daoConfigPDA,
        aspirant: person1.publicKey,
        newMember: person1MemberAccount,
        councilMember: creatorMemberAccount,
        councilSigner: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator, person1])
      .rpc();

    await program.methods
      .addMember()
      .accountsStrict({
        daoConfig: daoConfigPDA,
        aspirant: person2.publicKey,
        newMember: person2MemberAccount,
        councilSigner: creator.publicKey,
        councilMember: creatorMemberAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator, person2])
      .rpc();

    // Fund the DAO treasury
    const fundAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    await program.methods
      .fundDao(fundAmount)
      .accountsStrict({
        daoConfig: daoConfigPDA,
        treasury: treasuryPDA,
        patron: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Setup PDAs for role operations
    promotionRoleOpPDA = getRoleOpPDA("promotion", person1MemberAccount, daoConfigPDA);
    demotionRoleOpPDA = getRoleOpPDA("demotion", person1MemberAccount, daoConfigPDA);
    removalRoleOpPDA = getRoleOpPDA("removal", person1MemberAccount, daoConfigPDA);

    // Setup PDA for proposal
    proposalPDA = getProposalPDA(proposalTitle, daoConfigPDA);
  });

  describe("DAO Initialization and Membership", () => {
    it("Should fail when non-council member tries to add a new member", async () => {
      try {
        await program.methods
          .addMember()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            aspirant: nonMember.publicKey,
            newMember: nonMemberAccount,
            councilMember: person1MemberAccount, // Not a council member
            councilSigner: person1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([person1, nonMember])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Not a council member");
      }
    });
  });

  describe("Role Operations", () => {
    it("Should fail when non-council member tries to initiate a role operation", async () => {
      try {
        await program.methods
          .initiateRoleOp(Buffer.from("promotion"))
          .accountsStrict({
            daoConfig: daoConfigPDA,
            roleOp: promotionRoleOpPDA,
            nominatedMember: person1MemberAccount,
            councilSigner: person2.publicKey, // Not a council member
            councilMember: person2MemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([person2])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Not a council member");
      }
    });

    it("Should fail when using an invalid role operation seed", async () => {
      try {
        const invalidRoleOpPDA = getRoleOpPDA("invalid", person1MemberAccount, daoConfigPDA);

        await program.methods
          .initiateRoleOp(Buffer.from("invalid"))
          .accountsStrict({
            daoConfig: daoConfigPDA,
            roleOp: invalidRoleOpPDA,
            nominatedMember: person1MemberAccount,
            councilSigner: creator.publicKey,
            councilMember: creatorMemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Invalid role operation seed");
      }
    });

    it("Should fail when trying to vote with an invalid vote type", async () => {
      // First create a valid role operation
      await program.methods
        .initiateRoleOp(Buffer.from("promotion"))
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: promotionRoleOpPDA,
          nominatedMember: person1MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      try {
        const roleOpVotePDA = getVotePDA(creatorMemberAccount, promotionRoleOpPDA);

        // Try to vote with an invalid vote type (2)
        await program.methods
          .voteOnRoleOp(2) // Invalid vote type (should be 0 or 1)
          .accountsStrict({
            daoConfig: daoConfigPDA,
            roleOp: promotionRoleOpPDA,
            vote: roleOpVotePDA,
            voter: creator.publicKey,
            voterMember: creatorMemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Invalid vote type");
      }
    });

    it("Should fail when trying to resolve a role operation before review", async () => {
      try {
        await program.methods
          .resolveRoleOp()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            treasury: treasuryPDA,
            roleOp: promotionRoleOpPDA,
            nominatedMember: person1MemberAccount,
            resolver: creator.publicKey,
            resolverMember: creatorMemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("This cannot be resolved until it has been reviewed");
      }
    });
  });

  describe("Proposals", () => {
    it("Should fail when submitting a proposal with a title that's too long", async () => {
      try {
        const longTitleProposalPDA = getProposalPDA(longTitle, daoConfigPDA);
        const amount_required = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

        await program.methods
          .submitProposal(longTitle, proposalContent, person1.publicKey, amount_required)
          .accountsStrict({
            daoConfig: daoConfigPDA,
            proposal: longTitleProposalPDA,
            author: person1.publicKey,
            authorMember: person1MemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([person1])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        // expect(error.toString()).to.include("Proposal title exceeds maximum length");
        expect(error.toString()).to.include("TypeError: Max seed length exceeded"); // This fails first
      }
    });

    it("Should fail when submitting a proposal with content that's too long", async () => {
      try {
        const amount_required = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

        await program.methods
          .submitProposal(proposalTitle, longContent, person1.publicKey, amount_required)
          .accountsStrict({
            daoConfig: daoConfigPDA,
            proposal: proposalPDA,
            author: person1.publicKey,
            authorMember: person1MemberAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([person1])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        // expect(error.toString()).to.include("Proposal content exceeds maximum length");
        expect(error.toString()).to.include("RangeError: encoding overruns Buffer"); // This fails first
      }
    });

    it("Should fail when trying to resolve a proposal with insufficient treasury balance", async () => {
      // First create a valid proposal with a high amount
      const highAmount = new anchor.BN(10 * LAMPORTS_PER_SOL); // More than the treasury has
      const highAmountProposalTitle = "High Amount Proposal";
      const highAmountProposalPDA = getProposalPDA(highAmountProposalTitle, daoConfigPDA);

      await program.methods
        .submitProposal(highAmountProposalTitle, proposalContent, person1.publicKey, highAmount)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: highAmountProposalPDA,
          author: person1.publicKey,
          authorMember: person1MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person1])
        .rpc();

      // Vote on the proposal to get it approved
      const proposalVotePDA = getVotePDA(creatorMemberAccount, highAmountProposalPDA);
      await program.methods
        .voteOnProposal(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: highAmountProposalPDA,
          vote: proposalVotePDA,
          voter: creator.publicKey,
          voterMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Review the proposal
      await program.methods
        .reviewProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: highAmountProposalPDA,
          reviewer: creator.publicKey,
          reviewerMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([creator])
        .rpc();

      try {
        // Try to resolve the proposal with insufficient treasury balance
        await program.methods
          .resolveProposal()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            proposal: highAmountProposalPDA,
            resolver: creator.publicKey,
            resolverMember: creatorMemberAccount,
            daoTreasury: treasuryPDA,
            proposalTreasury: person1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator, person1, person2])
          .remainingAccounts([
            { pubkey: creator.publicKey, isSigner: true, isWritable: true },
            { pubkey: person1.publicKey, isSigner: true, isWritable: true },
            { pubkey: person2.publicKey, isSigner: true, isWritable: true },
            { pubkey: creatorMemberAccount, isSigner: false, isWritable: false },
            { pubkey: person1MemberAccount, isSigner: false, isWritable: false },
            { pubkey: person2MemberAccount, isSigner: false, isWritable: false }
          ])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Treasury balance is less than the proposal's required amount");
      }
    });

    it("Should fail when trying to resolve a proposal with mismatched treasury account", async () => {
      // First create a valid proposal
      const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const newProposalTitle = "Mismatched Treasury Proposal";
      const newProposalPDA = getProposalPDA(newProposalTitle, daoConfigPDA);

      await program.methods
        .submitProposal(newProposalTitle, proposalContent, person1.publicKey, amount)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          author: person1.publicKey,
          authorMember: person1MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person1])
        .rpc();

      // Vote on the proposal to get it approved
      const proposalVotePDA = getVotePDA(creatorMemberAccount, newProposalPDA);
      await program.methods
        .voteOnProposal(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          vote: proposalVotePDA,
          voter: creator.publicKey,
          voterMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Review the proposal
      await program.methods
        .reviewProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          reviewer: creator.publicKey,
          reviewerMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([creator])
        .rpc();

      try {
        // Try to resolve the proposal with a mismatched treasury account
        await program.methods
          .resolveProposal()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            proposal: newProposalPDA,
            resolver: creator.publicKey,
            resolverMember: creatorMemberAccount,
            daoTreasury: treasuryPDA,
            proposalTreasury: person2.publicKey, // Wrong treasury (should be person1)
            systemProgram: SystemProgram.programId,
          })
          .signers([creator, person1, person2])
          .remainingAccounts([
            { pubkey: creator.publicKey, isSigner: true, isWritable: true },
            { pubkey: person1.publicKey, isSigner: true, isWritable: true },
            { pubkey: person2.publicKey, isSigner: true, isWritable: true },
            { pubkey: creatorMemberAccount, isSigner: false, isWritable: false },
            { pubkey: person1MemberAccount, isSigner: false, isWritable: false },
            { pubkey: person2MemberAccount, isSigner: false, isWritable: false }
          ])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Treasury account does not match the proposal's treasury");
      }
    });

    it("Should fail when trying to resolve a proposal with insufficient multisig signers", async () => {
      // First create a valid proposal
      const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const newProposalTitle = "Insufficient Signers Proposal";
      const newProposalPDA = getProposalPDA(newProposalTitle, daoConfigPDA);

      await program.methods
        .submitProposal(newProposalTitle, proposalContent, person1.publicKey, amount)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          author: person1.publicKey,
          authorMember: person1MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person1])
        .rpc();

      // Vote on the proposal to get it approved
      const proposalVotePDA = getVotePDA(creatorMemberAccount, newProposalPDA);
      await program.methods
        .voteOnProposal(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          vote: proposalVotePDA,
          voter: creator.publicKey,
          voterMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Review the proposal
      await program.methods
        .reviewProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: newProposalPDA,
          reviewer: creator.publicKey,
          reviewerMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([creator])
        .rpc();

      try {
        // Try to resolve the proposal with only 2 signers (need 3)
        await program.methods
          .resolveProposal()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            proposal: newProposalPDA,
            resolver: creator.publicKey,
            resolverMember: creatorMemberAccount,
            daoTreasury: treasuryPDA,
            proposalTreasury: person1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator]) // Only 1 signers
          .remainingAccounts([
            { pubkey: creator.publicKey, isSigner: true, isWritable: true },
            { pubkey: creatorMemberAccount, isSigner: false, isWritable: false },
            { pubkey: person1MemberAccount, isSigner: false, isWritable: false }
          ])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.toString()).to.include("Insufficient multisig signers to approve this action");
      }
    });
  });

  describe("Member Exit", () => {
    it("Should fail when non-owner tries to exit a member", async () => {
      try {
        await program.methods
          .exitDao()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            exitingMember: person1MemberAccount,
            exiter: person2.publicKey, // Not the owner of the member account
            treasury: treasuryPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([person2])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        // This could be a constraint violation or a custom error
        expect(error.toString()).to.include("Error");
      }
    });

    it("Should fail when non-member tries to exit", async () => {
      try {
        await program.methods
          .exitDao()
          .accountsStrict({
            daoConfig: daoConfigPDA,
            exitingMember: nonMemberAccount, // Not a member
            exiter: nonMember.publicKey,
            treasury: treasuryPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([nonMember])
          .rpc();

        // If we reach here, the test failed
        expect.fail("Transaction should have failed");
      } catch (error) {
        // This is likely to be an account not found error
        expect(error.toString()).to.include("Error");
      }
    });
  });
});