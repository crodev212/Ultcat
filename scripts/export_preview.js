const fs = require('node:fs');
const path = require('node:path');
const { Interface, AbiCoder } = require('ethers');
const { createVM } = require('@ethereumjs/vm');
const { createAddressFromString, createAccount, bytesToHex, hexToBytes } = require('@ethereumjs/util');

const ROOT = path.resolve(__dirname, '..');
const main = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCat5212.json'), 'utf8'));
const renderer = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCatRenderer.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'trait-manifest.json'), 'utf8'));
const treasury = createAddressFromString('0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2');
const coder = AbiCoder.defaultAbiCoder();
const iface = new Interface(main.abi);

function addressObject(addr) { return createAddressFromString(typeof addr === 'string' ? addr : addr.toString()); }
async function execute(vm, { caller, to, data, gasLimit = 30_000_000n }) {
  return vm.evm.runCall({ caller: addressObject(caller), to: to ? addressObject(to) : undefined, data: hexToBytes(data), gasLimit });
}
function deployData(artifact, args = []) {
  return artifact.bytecode + (args.length ? coder.encode(args.map(x => x.type), args.map(x => x.value)).slice(2) : '');
}
function callData(method, args) { return iface.encodeFunctionData(method, args); }
function decode(method, result) { return iface.decodeFunctionResult(method, bytesToHex(result.execResult.returnValue)); }
function mustSucceed(result, label) {
  if (result.execResult.exceptionError) throw new Error(`${label} failed: ${result.execResult.exceptionError.error}`);
}
function permute(value, mask, multiplier, increment, domain) {
  let x = BigInt(value);
  for (let step = 0; step < 256; step++) {
    x = (x * BigInt(multiplier) + BigInt(increment)) & BigInt(mask);
    if (x < BigInt(domain)) return Number(x);
  }
  throw new Error(`cycle walk failed for token ${value + 1}`);
}
function getProperties(tokenId) {
  const p = manifest.permutation;
  let rank = permute(tokenId - 1, BigInt(p.combo_domain_mask), p.combo_multiplier, p.combo_increment, manifest.trait_combinations);
  const traits = Object.entries(manifest.trait_categories).map(([category, values]) => {
    const id = rank % 6;
    rank = Math.floor(rank / 6);
    return `${category}: ${values[id]}`;
  });
  const rarityRank = permute(tokenId - 1, BigInt(p.rarity_domain_mask), p.rarity_multiplier, p.rarity_increment, manifest.total_supply);
  const tier = Object.entries(manifest.rarity_counts).reduce((_, [name, count], i, arr) => {
    const threshold = arr.slice(0, i + 1).reduce((sum, pair) => sum + pair[1], 0);
    if (rarityRank < threshold) return name;
    return _;
  }, '');
  const special = manifest.one_of_one_assignments.find(item => item.tokenId === tokenId);
  return { traits, tier, special };
}

async function run() {
  const vm = await createVM();
  await vm.stateManager.putAccount(treasury, createAccount({ balance: 10n ** 24n }));
  const rendererCreate = await execute(vm, { caller: treasury, data: renderer.bytecode });
  mustSucceed(rendererCreate, 'renderer deployment');
  const rendererAddress = rendererCreate.createdAddress;
  const mainCreate = await execute(vm, {
    caller: treasury,
    data: deployData(main, [
      { type: 'address', value: treasury.toString() },
      { type: 'address', value: rendererAddress.toString() }
    ])
  });
  mustSucceed(mainCreate, 'collection deployment');
  const contractAddress = mainCreate.createdAddress;

  const ids = new Set(Array.from({ length: 12 }, (_, i) => i + 1));
  for (const tier of ['Uncommon', 'Rare', 'Epic', 'Legendary']) {
    const sample = Array.from({ length: manifest.total_supply }, (_, i) => i + 1).find(id => getProperties(id).tier === tier);
    if (sample) ids.add(sample);
  }
  for (const item of manifest.one_of_one_assignments) ids.add(item.tokenId);

  const cards = [];
  for (const tokenId of [...ids].sort((a, b) => a - b)) {
    const result = await execute(vm, {
      caller: treasury,
      to: contractAddress,
      data: callData('previewSVG', [tokenId]),
      gasLimit: 30_000_000n
    });
    mustSucceed(result, `previewSVG(${tokenId})`);
    const svg = decode('previewSVG', result)[0];
    const props = getProperties(tokenId);
    const badge = props.special ? `<span class="badge one">1/1 · ${props.special.name}</span>` : `<span class="badge">${props.tier}</span>`;
    const allTraits = props.traits.map(x => `<li>${x}</li>`).join('');
    cards.push(`<article class="card"><div class="art" role="img" aria-label="ULTRA CAT ${tokenId}">${svg}</div><div class="details"><div class="title-row"><h2>ULTRA CAT #${tokenId}</h2>${badge}</div><ul>${allTraits}</ul></div></article>`);
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ULTRA CAT · On-chain art preview</title>
<style>
:root{color-scheme:dark;--bg:#10111b;--panel:#1a1b29;--line:#303247;--muted:#a7a9bd;--accent:#ffb84d;--mint:#a9f2da}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -15%,#34304d 0,#10111b 48rem);color:#f4f2f9;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{width:min(1440px,calc(100% - 36px));margin:0 auto}header{padding:42px 0 28px;border-bottom:1px solid var(--line)}.eyebrow{color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}h1{font-size:clamp(34px,6vw,70px);line-height:.98;letter-spacing:-.055em;margin:12px 0 14px}.intro{max-width:760px;color:#c2c3d0;line-height:1.65;margin:0}.facts{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.fact{border:1px solid var(--line);background:#ffffff08;padding:9px 12px;border-radius:999px;font-size:12px;color:#d7d7e1}.fact strong{color:#fff}.notice{margin:20px 0 26px;padding:13px 16px;border-left:3px solid var(--accent);background:#ffffff08;color:#d4d2dc;line-height:1.55;font-size:13px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:26px 0 14px}.section-head h2{margin:0;font-size:18px}.section-head p{margin:0;color:var(--muted);font-size:12px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding-bottom:46px}.card{overflow:hidden;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,#212234,#171824);box-shadow:0 8px 24px #0003}.art{padding:12px;background:linear-gradient(135deg,#272b40,#131522)}.art svg{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:9px}.details{padding:13px 14px 15px}.title-row{display:flex;justify-content:space-between;align-items:center;gap:8px}.title-row h2{font-size:14px;margin:0;white-space:nowrap}.badge{flex:none;border:1px solid #ffffff27;border-radius:999px;padding:4px 7px;color:var(--mint);font-size:10px;font-weight:750}.badge.one{color:#ffd979;background:#8f6b211f;border-color:#b78e42}.details ul{list-style:none;padding:0;margin:11px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:5px 8px}.details li{font-size:10px;line-height:1.3;color:#bebfce}.details li::before{content:"";display:inline-block;width:5px;height:5px;margin:0 6px 1px 0;background:var(--accent);border-radius:1px}footer{border-top:1px solid var(--line);padding:20px 0 36px;color:var(--muted);font-size:12px;line-height:1.6}@media(max-width:1050px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){.wrap{width:min(100% - 24px,520px)}header{padding-top:28px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.art{padding:8px}.details{padding:10px}.title-row{align-items:flex-start;flex-direction:column}.details ul{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}}@media(max-width:390px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body><div class="wrap"><header><div class="eyebrow">Pixel cats · Cronos · fully on-chain</div><h1>ULTRA CAT</h1><p class="intro">A compact pixel-art PFP collection built from deterministic trait combinations. Seven visual feature groups, 5,212 unique base combinations, and 21 named 1/1 overlays—all rendered by Solidity without hosted images or metadata.</p><div class="facts"><span class="fact"><strong>5,212</strong> planned NFTs</span><span class="fact"><strong>701</strong> frozen-snapshot airdrops</span><span class="fact"><strong>4,511</strong> treasury reserve</span><span class="fact"><strong>21</strong> 1/1s</span></div></header>
<div class="notice"><strong>Pre-deployment concept preview.</strong> These samples are generated by the compiled on-chain renderer in a local EVM. No ULTRA CAT contract is deployed yet, and no airdrop or marketplace listing has occurred. Token IDs, recipient mapping, contract address, and release still require final review.</div>
<div class="section-head"><h2>Selected traits &amp; 1/1s</h2><p>${cards.length} on-chain-rendered samples</p></div><main class="grid">${cards.join('\n')}</main>
<footer>Art and metadata are designed to be generated from contract code. Holder snapshot: Wolfies at Cronos block 97,406,258. Images above are embedded SVG previews, not external assets. Confirm distribution and deployment independently before any transaction.</footer></div></body></html>`;

  const out = path.join(ROOT, 'release', 'preview-gallery.html');
  fs.writeFileSync(out, html);
  console.log(`Exported ${cards.length} local, on-chain-rendered art previews to ${path.relative(ROOT, out)}.`);
}

run().catch(err => { console.error(err); process.exit(1); });
