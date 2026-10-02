# Local wallet signing guide: Ebisu compatibility probe

This is a **test-only** path. The final `UltraCat5212` contract, airdrop, reserve mints, and listings remain untouched until the probe is indexed and its artwork visibly renders in Ebisu's Bay. The probe cannot guarantee every wallet/marketplace.

## What is being deployed

- `UltraCatRenderer` — the same immutable renderer planned for the final collection; reuse its address if the probe passes.
- `UltraCatCompatProbe` — a separate one-token ERC-721 named `ULTRA CAT COMPAT PROBE`, which returns the same nested Base64 JSON/SVG structure. It sends the test token to the selected treasury address. **Do not list or sell it.**

The local-only suite `npm run test:probe` has passed. The HTML helper passed a syntax check and a mocked-provider end-to-end flow, including constructor arguments and confirmation gates; no real wallet, RPC, broadcast, or CRO was used for that test. The suite measured 4,220,869 gas for the renderer deployment, 1,277,397 for the probe deployment, and 598,392 for `tokenURI(1)` in the EthereumJS VM. These are not Cronos estimates.

## Requirements

- A computer you control with Chrome/Brave/Firefox and MetaMask (or another EIP-1193 wallet) configured for **Cronos Mainnet, chain ID 25**.
- The selected wallet `0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2` available in that wallet. The page blocks a different address or chain.
- Node.js 20+ if you want to run the included API checker from the project folder.
- Do not paste or export a seed phrase/private key. This page calls the wallet provider; it does not request or transmit keys.

## Serve the page locally

1. Download and extract `release/ultracat-predeployment-package.zip` on your own computer.
2. From the extracted `ultracat` project directory, start a local static server, for example:

   ```bash
   python3 -m http.server 8765
   ```

3. In the same computer's browser, open `http://127.0.0.1:8765/probe/deploy-probe.html`. **Do not use the sandbox file preview for signing.** It has no access to your wallet or Cronos RPC.
4. Upload the two artifact files when prompted:
   - `release/UltraCatRenderer.json`
   - `release/UltraCatCompatProbe.json`

   The helper verifies each init-bytecode string against a pinned SHA-256 digest before enabling deployment. Renderer digest: `6a2543a7f28f2c76e9790c7c0ad5b84b9c2de40f2a0ee1b1be0f1f3b4d5270b3`; probe digest: `d3a110584b44a9bc1e0951488c5619c02e82dc41283339514817a11b7360ae9a`. The digest is over the exact UTF-8 bytecode string, including its leading `0x`.
5. Connect the selected wallet. Verify the page shows the exact treasury address and Cronos Mainnet before continuing.

## Sign the two test transactions

1. Click **Estimate and request renderer deployment**. Review the gas estimate and final MetaMask prompt. Sign only if the sender, network, and contract-creation transaction look right. Save the renderer address and transaction hash shown after confirmation.
2. Click **Estimate and request probe deployment**. Review the prompt. The constructor arguments are populated by the page as `(recipient = selected treasury, renderer = just-deployed renderer, royaltyReceiver = selected treasury)`. Sign only if these values and the chain are correct. Save the probe address and transaction hash.
3. The page never calls the production NFT contract and contains no airdrop/reserve/finalize buttons. It stops after the probe deployment. Keep the tab open between both transactions because the renderer address is held in memory. If a submitted transaction times out or the tab closes, check its hash and explorer status before retrying; do not redeploy blindly.

The public fee endpoint returned 375 Gwei on 2026-10-02. The renderer+probe local gas subtotal is about 5.50M gas: roughly **2.06 CRO** by measured gas at that fee, or about **2.68 CRO** with a 30% gas-limit margin. Fees change; the wallet's live prompt and `eth_estimateGas` take precedence. Do not send CRO to an address from chat. The separate full-launch planning balance is in `docs/DEPLOYMENT-CHECKLIST.md`.

## Check Ebisu's Bay before main launch

1. Wait for indexing. From the project directory, run:

   ```bash
   node scripts/check_ebisus_api.js <probe-contract-address> 1
   ```

   This queries Ebisu's documented public `/nft?collection=...&tokenId=...` API. A successful API response is not enough by itself.
2. Open the probe's actual NFT item page in Ebisu's Bay. Confirm the thumbnail and detail image render, and verify the image is the expected pixel cat rather than a broken placeholder. If a collection page is created, inspect its logo too.
3. If Ebisu passes, manually import the probe NFT into MetaMask on Cronos Mainnet and verify its media; test Crypto.com DeFi Wallet as well if that is one of your holders' target wallets. MetaMask auto-detection does not cover Cronos, so manual import is the relevant check. These tests cover only the named clients, not every wallet.
4. If the API, marketplace UI, and chosen wallet checks pass, report the renderer/probe addresses and result. The next step is to prepare the final collection deployment, using the **same renderer**. Do not begin the 701-recipient airdrop until that is reviewed.
5. If the API has no record or the UI image is blank, treat the result as **inconclusive/failed** and do not deploy the final collection. Follow the optional regular technical-support request in `docs/EBISUS-BAY-PREDEPLOY-COMPATIBILITY.md`, or stop. No public documentation can guarantee that every wallet or marketplace will render the art.
