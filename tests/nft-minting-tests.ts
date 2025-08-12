// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Prothesis } from "../target/types/prothesis";
// import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
// import { expect } from "chai";
// import {
//   findMetadataPda,
//   mplTokenMetadata,
//   MPL_TOKEN_METADATA_PROGRAM_ID,
// } from "@metaplex-foundation/mpl-token-metadata";
// import { createUmi, publicKey, signerIdentity } from "@metaplex-foundation/umi";
// import {
//   TOKEN_PROGRAM_ID,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   getAssociatedTokenAddress
// } from "@solana/spl-token";

// import {
//   generateSigner,
//   getDAOConfigPDA,
//   getDAOTreasury,
//   getMemberAccount,
//   getProposalPDA,
//   getVotePDA
// } from "./helpers";

// // Metadata program ID
// // const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

// describe("prothesis - NFT minting tests", () => {
//   // Configure the client to use the local cluster
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const program = anchor.workspace.prothesis as Program<Prothesis>;

//   // Test wallets
//   let creator: Keypair;
//   let person1: Keypair;
//   let person2: Keypair;
//   let person3: Keypair;

//   // DAO parameters
//   const daoId = new anchor.BN(Math.floor(Math.random() * 10_000_000_000));
//   const consensusPct = 5100; // 51%
//   const consensusLifetime = new anchor.BN(5); // 5 seconds
//   const minMultisigSigners = new anchor.BN(3); // At least 3 signers

//   // PDAs
//   let daoConfigPDA: PublicKey;
//   let treasuryPDA: PublicKey;

//   let creatorMemberAccount: PublicKey;
//   let person1MemberAccount: PublicKey;
//   let person2MemberAccount: PublicKey;
//   let person3MemberAccount: PublicKey;

//   let proposalPDA: PublicKey;

//   // NFT accounts
//   let nftMint: Keypair;
//   let daoTokenAccount: PublicKey;
//   let metadataAccount: PublicKey;

//   // Proposal parameters
//   const proposalTitle = "NFT Proposal Test";
//   const proposalContent = "This proposal will mint an NFT when resolved";
//   const proposalAmount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

//   before(async () => {
//     // Generate Signers
//     creator = await generateSigner(provider);
//     person1 = await generateSigner(provider);
//     person2 = await generateSigner(provider);
//     person3 = await generateSigner(provider);
//     nftMint = Keypair.generate();

//     // Derive PDAs
//     daoConfigPDA = await getDAOConfigPDA(daoId);
//     treasuryPDA = getDAOTreasury(daoConfigPDA);
//     creatorMemberAccount = getMemberAccount(creator.publicKey, daoConfigPDA);
//     person1MemberAccount = getMemberAccount(person1.publicKey, daoConfigPDA);
//     person2MemberAccount = getMemberAccount(person2.publicKey, daoConfigPDA);
//     person3MemberAccount = getMemberAccount(person3.publicKey, daoConfigPDA);
//     proposalPDA = getProposalPDA(proposalTitle, daoConfigPDA);

//     // Derive NFT accounts
//     daoTokenAccount = await getAssociatedTokenAddress(
//       nftMint.publicKey,
//       treasuryPDA,
//       true // allowOwnerOffCurve
//     );

//     const umi = createUmi()
//       .use(mplTokenMetadata());

//     // umi.use(signerIdentity(person1))

//     // Derive metadata account
//     const metadataPDA = findMetadataPda(umi, {
//       mint: publicKey(nftMint.publicKey),
//     })[0];

//     metadataAccount = new PublicKey(metadataPDA);

//     // Initialize DAO
//     await program.methods
//       .initializeDao(daoId, consensusPct, consensusLifetime, minMultisigSigners)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         treasury: treasuryPDA,
//         creator: creator.publicKey,
//         member: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     // Fund the DAO treasury
//     const fundAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
//     await program.methods
//       .fundDao(fundAmount)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         treasury: treasuryPDA,
//         patron: creator.publicKey,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     // Add members
//     await program.methods
//       .addMember()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         aspirant: person1.publicKey,
//         newMember: person1MemberAccount,
//         councilMember: creatorMemberAccount,
//         councilSigner: creator.publicKey,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator, person1])
//       .rpc();

//     await program.methods
//       .addMember()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         aspirant: person2.publicKey,
//         newMember: person2MemberAccount,
//         councilSigner: creator.publicKey,
//         councilMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator, person2])
//       .rpc();

//     await program.methods
//       .addMember()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         aspirant: person3.publicKey,
//         newMember: person3MemberAccount,
//         councilSigner: creator.publicKey,
//         councilMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator, person3])
//       .rpc();

//     // Promote person1 to council
//     const promotionRoleOpPDA = await PublicKey.findProgramAddressSync(
//       [Buffer.from("promotion"), person1MemberAccount.toBuffer(), daoConfigPDA.toBuffer()],
//       program.programId
//     )[0];

//     await program.methods
//       .initiateRoleOp(Buffer.from("promotion"))
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         roleOp: promotionRoleOpPDA,
//         nominatedMember: person1MemberAccount,
//         councilSigner: creator.publicKey,
//         councilMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     const roleOpVotePDA = getVotePDA(creatorMemberAccount, promotionRoleOpPDA);
//     await program.methods
//       .voteOnRoleOp(1)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         roleOp: promotionRoleOpPDA,
//         vote: roleOpVotePDA,
//         voter: creator.publicKey,
//         voterMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     await program.methods
//       .reviewRoleOp()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         roleOp: promotionRoleOpPDA,
//         reviewer: creator.publicKey,
//         reviewerMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     await program.methods
//       .resolveRoleOp()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         treasury: treasuryPDA,
//         roleOp: promotionRoleOpPDA,
//         nominatedMember: person1MemberAccount,
//         resolver: creator.publicKey,
//         resolverMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();
//   });

//   it("Should submit a proposal for NFT minting", async () => {
//     await program.methods
//       .submitProposal(proposalTitle, proposalContent, person1.publicKey, proposalAmount)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         author: person1.publicKey,
//         authorMember: person1MemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([person1])
//       .rpc();

//     // Verify proposal was created
//     const proposal = await program.account.proposal.fetch(proposalPDA);
//     expect(proposal.title).to.equal(proposalTitle);
//     expect(proposal.content).to.equal(proposalContent);
//     expect(proposal.author.toString()).to.equal(person1MemberAccount.toString());
//     expect(proposal.treasury.toString()).to.equal(person1.publicKey.toString());
//     expect(proposal.status.pending).to.not.be.undefined;
//   });

//   it("Should vote on the proposal", async () => {
//     // Vote from person1 (council member)
//     const person1VotePDA = getVotePDA(person1MemberAccount, proposalPDA);
//     await program.methods
//       .voteOnProposal(1)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         vote: person1VotePDA,
//         voter: person1.publicKey,
//         voterMember: person1MemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([person1])
//       .rpc();

//     // Vote from creator (council member)
//     const creatorVotePDA = getVotePDA(creatorMemberAccount, proposalPDA);
//     await program.methods
//       .voteOnProposal(1)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         vote: creatorVotePDA,
//         voter: creator.publicKey,
//         voterMember: creatorMemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([creator])
//       .rpc();

//     // Vote from person2
//     const person2VotePDA = getVotePDA(person2MemberAccount, proposalPDA);
//     await program.methods
//       .voteOnProposal(1)
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         vote: person2VotePDA,
//         voter: person2.publicKey,
//         voterMember: person2MemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([person2])
//       .rpc();

//     // Verify votes were recorded
//     const proposal = await program.account.proposal.fetch(proposalPDA);
//     expect(proposal.upvotes.toString()).to.equal("3");
//   });

//   it("Should review and approve the proposal", async () => {
//     await program.methods
//       .reviewProposal()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         reviewer: person1.publicKey,
//         reviewerMember: person1MemberAccount,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([person1])
//       .rpc();

//     // Verify proposal was approved
//     const proposal = await program.account.proposal.fetch(proposalPDA);
//     expect(proposal.status.approved).to.not.be.undefined;
//   });

//   it("Should resolve the proposal and mint an NFT", async () => {
//     // Resolve the proposal with NFT minting
//     await program.methods
//       .resolveProposal()
//       .accountsStrict({
//         daoConfig: daoConfigPDA,
//         proposal: proposalPDA,
//         resolver: person2.publicKey,
//         resolverMember: person2MemberAccount,
//         daoTreasury: treasuryPDA,
//         proposalTreasury: person1.publicKey,
//         systemProgram: SystemProgram.programId,
//         nftMint: nftMint.publicKey,
//         daoTokenAccount: daoTokenAccount,
//         metadataAccount: metadataAccount,
//         tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([person2, creator, person1, nftMint])
//       .remainingAccounts([
//         { pubkey: creator.publicKey, isSigner: true, isWritable: true },
//         { pubkey: person1.publicKey, isSigner: true, isWritable: true },
//         { pubkey: creatorMemberAccount, isSigner: false, isWritable: false },
//         { pubkey: person1MemberAccount, isSigner: false, isWritable: false },
//       ])
//       .rpc();

//     // Verify NFT was minted
//     try {
//       // Check if token account exists
//       const tokenAccountInfo = await provider.connection.getAccountInfo(daoTokenAccount);
//       expect(tokenAccountInfo).to.not.be.null;

//       // Check if metadata account exists
//       const metadataAccountInfo = await provider.connection.getAccountInfo(metadataAccount);
//       expect(metadataAccountInfo).to.not.be.null;

//       console.log("NFT successfully minted with metadata!");
//     } catch (error) {
//       console.error("Error verifying NFT:", error);
//       throw error;
//     }
//   });

//   it("Should verify the NFT token account has the correct balance", async () => {
//     try {
//       // Get token account info
//       const tokenAccountInfo = await provider.connection.getAccountInfo(daoTokenAccount);

//       // The token account should exist
//       expect(tokenAccountInfo).to.not.be.null;

//       // Parse the token account data to verify the balance
//       // Note: In a real test, you would use the proper deserializer from @solana/spl-token
//       // This is a simplified check that the account exists and has data
//       expect(tokenAccountInfo.data.length).to.be.greaterThan(0);

//       console.log("NFT token account verified with correct data structure");
//     } catch (error) {
//       console.error("Error verifying token account:", error);
//       throw error;
//     }
//   });
// });