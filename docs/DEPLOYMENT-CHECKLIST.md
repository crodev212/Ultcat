# ULTRA CAT deployment checklist (pre-deployment)

**Nothing in this runbook has been broadcast.** It is a review plan for Cronos mainnet (chain ID 25), not authorization to deploy. Confirm the owner’s wallet addresses, art, recipient CSV, 1/1 allocation, audit status, and gas budget immediately before any transaction.

## Immutable settings

- Treasury and 5% ERC-2981 royalty receiver: `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2` (checksum verified; user-selected).
- NFT: `ULTRA CAT` / `ULTCAT`; fixed max supply 5,212.
- Wolfies source: `0x719fdfb0ba006747a83438cc8900c8a2b35e0aff` at block 97,406,258.
- Airdrop: 701 addresses, one each; only the dead sink excluded; contract addresses included.
- Remaining 4,511 are treasury reserve NFTs, not a public paid mint. Ebisu's Bay prices are chosen manually at listing time.
- Public seed: `ULTCAT_5212_GENESIS_V1`; 21 public 1/1s; no hidden reveal.

## Before deploying

1. Follow `docs/PROBE-SIGNING-GUIDE.md` and `docs/EBISUS-BAY-PREDEPLOY-COMPATIBILITY.md`. The owner must personally review and sign the separate public-API/UI probe before the final collection deployment. If API or actual item-page rendering is inconclusive, stop and use the optional technical-support route; do not assume the docs guarantee Base64 SVG support. Do not silently add a hosted fallback.
2. Run `npm ci`, `npm test`, and `npm run preview`; retain the test output and review `release/preview-gallery.html`.
3. Independently verify the 702-owner historical snapshot and the filtered 701-address recipient CSV. Check the dead-sink exclusion, duplicate count, contract-holder risk, and snapshot block/hash in `snapshot/wolfies-snapshot-block-97406258.json`. Verify every proof and the Merkle root in `release/airdrop-proofs.json`.
4. Confirm the `release/trait-manifest.json` seed, complete 1/1 token-ID map, trait/rareness counts, and the two airdropped 1/1 assignments (#133 and #631).
5. Confirm control of the exact treasury/royalty address, and use a hardware wallet or multisig if appropriate. The source has no admin address setter.
6. Obtain an independent review/audit. The local tests are not a security audit and the build has not been fork-tested against Cronos.
7. On a clean reproducible build, compare Solidity version, optimizer settings, source hashes, deployed bytecode sizes, and constructor arguments against the release package. Do not use an edited or stale artifact.

## Deployment sequence

1. Deploy `release/UltraCatRenderer.json` first. Save its Cronos transaction hash, address, and runtime code hash; verify its source and runtime bytecode.
2. Using the helper in `probe/deploy-probe.html` as described in `docs/PROBE-SIGNING-GUIDE.md`, deploy the **test-only** probe with constructor arguments, in order: (a) recipient `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2`; (b) the verified renderer address from step 1; (c) royalty receiver `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2`. The helper pins the exact renderer/probe bytecode hashes and checks the network and sender. This mints only `ULTRA CAT COMPAT PROBE #1`; do not sell it.
3. Wait for Ebisu's Bay indexing. Run `node scripts/check_ebisus_api.js <probe-address> 1`, then open the probe's actual item page and confirm that both the thumbnail and detail image render. Optionally import it into chosen target wallets. If API or actual Ebisu UI rendering is inconclusive, stop and use the optional technical-support route; do not deploy the final collection under a “no display risk” requirement.
4. Only after the probe passes, deploy `release/UltraCat5212.json` with constructor arguments, in order: (a) treasury `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2`; (b) the same verified renderer address. Save and verify the NFT deployment.
5. Confirm getters: `name()`, `symbol()`, `MAX_SUPPLY() = 5212`, `AIRDROP_RECIPIENTS() = 701`, `RESERVE_SUPPLY() = 4511`, `AIRDROP_MERKLE_ROOT()` matches `release/airdrop-proofs.json`, `WOLFIES_SNAPSHOT_BLOCK() = 97406258`, `WOLFIES_COLLECTION()`, `treasury()`, `royaltyReceiver()`, `artRenderer()`, `COLLECTION_SEED()`, and `royaltyInfo(1, 10000) = (treasury, 500)`. Make sure the renderer runtime is the reviewed artifact.
6. Confirm a few `previewSVG(tokenId)` results render, and that `tokenURI()` follows the ERC-721 metadata convention once a production token is minted.

## Initial distribution transactions

`airdropBatch(address[] recipients, bytes32[][] proofs)` checks each recipient against the committed `AIRDROP_MERKLE_ROOT`, then enforces strict order by `keccak256(abi.encodePacked(COLLECTION_SEED, recipient))` with the address as a hash-tie breaker. **Pass the CSV and corresponding proof rows in their existing order; do not alphabetically resort them.** Continue the same order across calls.

- Send 7 airdrop batches of 100 addresses, then 1 batch of 1 address, passing each address's proof from `release/airdrop-proofs.json`. The contract mints token IDs 1–701 directly to the respective addresses.
- After all 701 recipients have been minted, send 9 `mintReserveBatch(500)` transactions and 1 `mintReserveBatch(11)` transaction. These mint IDs 702–5,212 to the treasury.
- Verify `totalSupply() == 5212`, `airdropRecipientCount() == 701`, `ownerOf` samples, the expected airdrop recipients, and treasury ownership of all reserve IDs. Review all transaction receipts.
- Call `finalizeDistribution()` only after checks pass. It permanently closes the initial mint functions.
- List reserve tokens manually on Ebisu's Bay. Listing prices are not set by this contract.

Use fresh Cronos RPC/wallet `eth_estimateGas` results before each call. Local EthereumJS VM measurements are only rough engineering references: renderer deploy ~4.22M gas; NFT deploy ~1.97M; a 100-recipient airdrop batch with Merkle proofs ~5.28M; a 500-token reserve batch ~1.01M; `tokenURI(1)` ~0.63M. Do not treat these as current Cronos quotes.

## CRO and gas budget (planning estimate, not a quote)

A live read of Cronos's public fee-market REST endpoint on **2026-10-02** returned `base_fee = 375000000000` wei (**375 Gwei**). Cronos documents this fee as dynamic; it can move with block activity, and transaction affordability depends on the fee cap and gas limit. Re-query Cronos `eth_feeHistory`/`eth_gasPrice` and run `eth_estimateGas` for the actual signed transaction immediately before funding and broadcasting. See [Cronos fee-market documentation](https://docs.cronos.org/cronos-chain-protocol/module_overview/module_feemarket) and the [live fee-parameter endpoint](https://rest.cronos.com/ethermint/feemarket/v1/params).

The local measured subtotal for renderer deploy + NFT deploy + all 8 airdrop batches + all 10 reserve batches is **52,423,916 gas**; it excludes `finalizeDistribution()`, marketplace approvals/listings, and any failed/retried transaction. The separate probe contract deploy measured **1,277,397 gas**; the probe path deploys the renderer only once and reuses it if the production launch proceeds. Thus the probe-plus-launch path is about **53,701,313 gas** before finalization. At 375 Gwei this is about **20.14 CRO** by measured gas, or about **26.18 CRO** with a 30% gas-limit margin. At twice that base fee, the same buffered estimate is about **52.36 CRO**. Local gas is not a Cronos estimate. As a provisional balance target, keep **300 CRO** available in the wallet that will sign the calls; at the observed fee this is ample, and it covers the probe-plus-launch measured gas with 30% headroom at fees up to roughly 4,300 Gwei. Unused CRO remains in the wallet. This target does **not** include Ebisu's Bay listing/approval costs, and it must be recalculated if the live fee quote is materially higher.

The fixed treasury address must be the caller for the airdrop, reserve mints, and finalization. The current user-selected address is `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2`; it also receives the 5% royalties and reserve NFTs. If deployment and treasury are different signers, the deployer needs gas for the two deployments and the treasury signer separately needs gas for the distribution calls. The user must verify access to this exact address on Cronos Mainnet before sending CRO; never expose a seed phrase/private key.

## Transfer caveat

The contract mints directly without `safeMint` callbacks so that all accepted contract-holder addresses can be included even if they do not implement `IERC721Receiver`. A contract wallet that receives an NFT may nevertheless have no supported way to initiate an ERC-721 transfer or withdrawal. This is why all 29 snapshot addresses found to have code at the later code check need review before the airdrop. The user's chosen recipient rule includes them; no on-chain logic can force an unrelated recipient contract to expose a withdrawal method.
