# `$ULTCAT` / ULTRA CAT — 5,212 On-Chain Cat NFTs

A new Cronos NFT project based on the fully on-chain, compact-renderer approach in `/home/user/brocode/README.md`. The art direction is crisp pixel-art PFP cats, with six variations in the principal feature groups and 21 deterministic 1/1 overlays. No IPFS, external image storage, or metadata server is planned.

## Distribution decisions recorded so far

- Name: **ULTRA CAT**; symbol: **ULTCAT**.
- Cronos mainnet; total supply: **5,212**.
- No public paid-mint function. One cat is airdropped to each unique Wolfies-holder address in the fixed snapshot, excluding the dead sink; the rest are minted to the treasury for manual Ebisu's Bay listings at prices selected by the owner.
- Airdrop holder source: Wolfies ERC-721 `0x719fdfb0ba006747a83438cc8900c8a2b35e0aff`.
- Snapshot: block **97,406,258**, hash `0x488dfd1b1ac4b879ea3aeba045b87aac498bbfca185e324108ec9caf3907b809`, timestamp **2026-10-02 03:30:12 UTC**.
- Snapshot scan: **5,211 live Wolfies across 702 unique owner addresses**; 1 token ID in the scanned 1–5,212 range was burned/nonexistent. The accepted recipient rule excludes `0x000000000000000000000000000000000000dead` only, includes contract-code holders, giving **701 airdrop addresses** and **4,511 reserve cats**.
- Royalty: **5% ERC-2981**. The selected treasury, royalty receiver, reserve owner, and distribution caller is `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2` (updated from the earlier address at the user's direction).
- Rarity mapping: deterministic and publicly inspectable; no hidden reveal is promised.

## Airdrop caveat

The 701-address recipient CSV is sorted by the public hash `keccak256(abi.encodePacked(COLLECTION_SEED, address))`, with an address tie-break, so token IDs are deterministically assigned in a pseudo-random order rather than favoring low-numbered wallets. The contract enforces that ordering across batches and verifies each address against an immutable Merkle root for exactly this 701-wallet list (`release/airdrop-proofs.json`). 29 snapshot holders had contract code at the latest code check. The accepted rule includes them. The airdrop implementation uses direct minting to those addresses, but some contract wallets may not provide a way to transfer a newly minted NFT; their control/withdrawal behavior should be reviewed before distribution. The known dead sink is excluded.

The CSV is a public point-in-time holder snapshot, not an endorsed or identity-verified wallet list. Transfers after block 97,406,258 do not change eligibility under this frozen rule. Review `snapshot/` before sending any airdrop batch.

## Art and rarity plan

Seven visible categories each have six choices: background, cat style, fur color, outfit, expression, eye style, and ornament. The 279,936 possible base combinations are mapped by a public seed-derived permutation; all **5,212** token IDs have unique base trait tuples. Rarity counts are Common **2,500**, Uncommon **1,500**, Rare **800**, Epic **300**, Legendary **91**, and **21** named 1/1s. The 1/1 token-ID map is public in `release/trait-manifest.json`; under the current mapping, 1/1 tokens **#133 and #631** are in the airdrop, and the other 19 are treasury reserve.

## On-chain storage model

The implementation comprises two contracts: `UltraCatRenderer` contains reusable pixel-SVG recipes and trait names in deployed code; `UltraCat5212` contains ERC-721 ownership/distribution logic and calls that renderer for metadata. Deploy the renderer first, then pass its address and the fixed treasury address to the NFT constructor. Images and JSON are built on request; each token URI returns Base64 JSON with a Base64 SVG `image`, and `contractURI()` includes an on-chain collection logo and royalty fields. The SVGs are self-contained 512×512 square documents with a 64×64 pixel grid, no scripts, remote fonts, filters, or external image requests. No finished per-token image slots, IPFS, or metadata server are required. The NFT uses ERC721A batching to reduce same-owner reserve-mint storage costs. Normal ERC-721 ownership and distribution state still live on Cronos and cost gas.

## Build and verification status

A first implementation now compiles with Solidity **0.8.37**, optimizer + IR, and Paris-compatible bytecode. The NFT runtime is **9,496 bytes**; renderer runtime is **21,080 bytes**, both below the 24,576-byte EVM runtime limit. `npm test` deploys both artifacts in a local EthereumJS VM and exercises the 701 proof-verified direct mints, 4,511 reserve mints, supply cap, recipient ordering, transfers, metadata/SVG decoding, royalties, and finalization. A full local output sweep decoded all **5,212** `tokenURI()` records and nested SVGs, found all valid and byte-distinct, and is recorded in `release/all-art-validation.json`. The latest local simulation measured about **628,000 gas** for `tokenURI(1)`; the full-sweep maximum was **798,917 local-VM gas**. `npm run test:probe` compiles and locally tests the separate, one-token Ebisu compatibility probe; it does **not** deploy or establish marketplace support. A 100-recipient airdrop batch used about **5.28 million gas** and a 500-token treasury batch about **1.01 million gas**. These are indicative local-VM figures, **not Cronos RPC estimates or a security audit**.

`npm run preview` writes `release/preview-gallery.html`; `release/collection-logo.svg` is a convenience copy of the collection logo returned by `contractURI()`. Release artifacts and the deterministic trait/recipient manifest are under `release/`. See `docs/PLATFORM-COMPATIBILITY.md` for exactly what has been tested and what must be verified in Ebisu's Bay and actual wallets after deployment; `docs/PROBE-SIGNING-GUIDE.md` explains the local wallet-signing helper, and `docs/EBISUS-BAY-PREDEPLOY-COMPATIBILITY.md` gives the API/UI compatibility gate and optional technical-support request for the nested Base64 JSON/SVG format. `node scripts/check_ebisus_api.js <contract-address> <tokenId>` checks Ebisu's documented read-only NFT API after the collection is indexed. No `ULTRA CAT` contract has been deployed, no airdrop transaction has been sent, and no Ebisu's Bay listings have been created. Before deployment, review the art, all 701 recipients, the 1/1 allocation, constructor addresses, and the exact compiled artifacts. The build has not received an independent security audit.
