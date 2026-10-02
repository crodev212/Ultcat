const fs = require('node:fs');
const path = require('node:path');
const { AbiCoder, keccak256, toUtf8Bytes, solidityPackedKeccak256 } = require('ethers');

const ROOT = path.resolve(__dirname, '..');
const MAX_SUPPLY = 5212;
const AIRDROP_COUNT = 701;
const RESERVE_COUNT = MAX_SUPPLY - AIRDROP_COUNT;
const COMBO_DOMAIN = 279936; // 6^7 base trait combinations
const SEED_TEXT = 'ULTCAT_5212_GENESIS_V1';
const DEAD = '0x000000000000000000000000000000000000dead';
const ONE_OF_ONE_NAMES = [
  'Moonbeam Monarch', 'Solar Pouncer', 'Nebula Whiskers', 'Crown of Nine Lives',
  'Prismatic Paw', 'Midnight Oracle', 'Aurora Purr', 'Golden Comet', 'Crystal Claw',
  'Cosmic Catnip', 'Ember Empress', 'Frostfang', 'Velvet Phantom', 'Lucky Lantern',
  'Royal Ragdoll', 'Starfall Sprite', 'Jade Jester', 'Pearl Prowler', 'Thunder Tabby',
  'Dreamweaver', 'Ultra Genesis'
];
const TIERS = [
  { name: 'Common', until: 2500 },
  { name: 'Uncommon', until: 4000 },
  { name: 'Rare', until: 4800 },
  { name: 'Epic', until: 5100 },
  { name: 'Legendary', until: 5191 },
  { name: '1/1', until: 5212 }
];
const TRAITS = {
  Background: ['Neon Alley', 'Moonlit Rooftop', 'Cat Garden', 'Candy Grid', 'Royal Blue', 'Aurora'],
  'Cat Style': ['Shorthair', 'Maine Coon', 'Persian', 'Siamese', 'Sphynx', 'Fold-Eared'],
  'Fur Color': ['Ginger', 'Tuxedo', 'Calico', 'Silver Tabby', 'Cream', 'Lavender'],
  Outfit: ['Street Hoodie', 'Royal Cape', 'Star Suit', 'Paw Sweater', 'Tuxedo', 'Astro Armor'],
  Expression: ['Curious', 'Sleepy', 'Grinning', 'Sly', 'Blep', 'Fierce'],
  'Eye Style': ['Emerald', 'Sapphire', 'Gold', 'Star Pupils', 'Slit Eyes', 'Heterochrome'],
  Ornament: ['Bell Collar', 'Blue Bow', 'Mini Crown', 'Headphones', 'Moon Charm', 'Flower Clip']
};

function parseSingleColumnCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  const col = header.indexOf('recipient_address');
  if (col < 0) throw new Error(`recipient_address column missing in ${file}`);
  return lines.map(line => line.split(',')[col].trim().toLowerCase());
}

function permute(value, mask, multiplier, increment, domain) {
  let x = BigInt(value);
  for (let steps = 1; steps <= 256; steps++) {
    x = (x * multiplier + increment) & mask;
    if (x < BigInt(domain)) return { value: Number(x), steps };
  }
  throw new Error(`cycle walk exceeded 256 steps at input ${value}`);
}

const seedHex = keccak256(toUtf8Bytes(SEED_TEXT));
const seed = BigInt(seedHex);
const comboMask = 0xfffffn;
const rarityMask = 0x1fffn;
const comboA = (seed & 0xffffcn) | 1n;
const comboC = ((seed >> 20n) & comboMask) | 1n;
const rarityA = ((seed >> 40n) & 0x1ffcn) | 1n;
const rarityC = ((seed >> 53n) & rarityMask) | 1n;
if (comboA % 4n !== 1n || comboC % 2n !== 1n || rarityA % 4n !== 1n || rarityC % 2n !== 1n) {
  throw new Error('LCG full-period conditions are not met');
}

const holdersFile = path.join(ROOT, 'snapshot', 'wolfies-holders-block-97406258.csv');
const recipientsFile = path.join(ROOT, 'snapshot', 'airdrop-recipients-block-97406258.csv');
const snapshotFile = path.join(ROOT, 'snapshot', 'wolfies-snapshot-block-97406258.json');
const allHolders = parseSingleColumnCsv(holdersFile);
const recipients = parseSingleColumnCsv(recipientsFile);
const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
if (allHolders.length !== 702 || recipients.length !== AIRDROP_COUNT) throw new Error('Unexpected holder/recipient count');
if (allHolders.filter(x => x === DEAD).length !== 1 || recipients.includes(DEAD)) throw new Error('Dead-sink rule mismatch');
const recipientSortKeys = recipients.map(address => solidityPackedKeccak256(['uint256', 'address'], [seedHex, address]).toLowerCase());
if (new Set(recipients).size !== recipients.length || recipients.some((address, i) => i && (
  recipientSortKeys[i] < recipientSortKeys[i - 1]
    || (recipientSortKeys[i] === recipientSortKeys[i - 1] && address <= recipients[i - 1])
))) {
  throw new Error('Airdrop list must be unique and sorted by the public seed/address hash');
}
if (snapshot.snapshot_block !== 97406258 || snapshot.airdrop_recipient_count !== AIRDROP_COUNT) {
  throw new Error('Snapshot report does not match the contract configuration');
}

const abiCoder = AbiCoder.defaultAbiCoder();
const leaves = recipients.map(address => keccak256(keccak256(abiCoder.encode(['address'], [address]))));
const merkleLevels = [leaves];
while (merkleLevels.at(-1).length > 1) {
  const level = merkleLevels.at(-1);
  const next = [];
  for (let i = 0; i < level.length; i += 2) {
    const left = level[i].toLowerCase();
    const right = (level[i + 1] || level[i]).toLowerCase();
    const pair = left < right ? [left, right] : [right, left];
    next.push(solidityPackedKeccak256(['bytes32', 'bytes32'], pair));
  }
  merkleLevels.push(next);
}
const merkleRoot = merkleLevels.at(-1)[0];
const contractSource = fs.readFileSync(path.join(ROOT, 'contracts', 'UltraCat5212.sol'), 'utf8');
if (!contractSource.includes(`AIRDROP_MERKLE_ROOT = ${merkleRoot};`)) {
  throw new Error(`AIRDROP_MERKLE_ROOT in UltraCat5212.sol must be updated to ${merkleRoot}`);
}
const proofRecords = recipients.map((address, recipientIndex) => {
  let index = recipientIndex;
  const proof = [];
  for (let levelIndex = 0; levelIndex < merkleLevels.length - 1; levelIndex++) {
    const level = merkleLevels[levelIndex];
    const siblingIndex = index ^ 1;
    proof.push(level[siblingIndex] || level[index]);
    index = Math.floor(index / 2);
  }
  return {
    address,
    token_id: recipientIndex + 1,
    sort_key: recipientSortKeys[recipientIndex],
    proof
  };
});
for (const row of proofRecords) {
  let node = keccak256(keccak256(abiCoder.encode(['address'], [row.address])));
  for (const sibling of row.proof) {
    const pair = node.toLowerCase() < sibling.toLowerCase() ? [node, sibling] : [sibling, node];
    node = solidityPackedKeccak256(['bytes32', 'bytes32'], pair);
  }
  if (node.toLowerCase() !== merkleRoot.toLowerCase()) throw new Error(`Invalid Merkle proof for ${row.address}`);
}
const proofFile = path.join(ROOT, 'release', 'airdrop-proofs.json');
fs.mkdirSync(path.dirname(proofFile), { recursive: true });
fs.writeFileSync(proofFile, JSON.stringify({
  merkle_root: merkleRoot,
  leaf: 'keccak256(keccak256(abi.encode(address)))',
  node: 'keccak256(abi.encodePacked(min(bytes32_a, bytes32_b), max(bytes32_a, bytes32_b)))',
  recipient_count: proofRecords.length,
  rows: proofRecords
}, null, 2) + '\n');

const comboSeen = new Set();
const tierCounts = Object.fromEntries(TIERS.map(x => [x.name, 0]));
const comboMaxSteps = { max: 0, tokenId: 0 };
const rarityMaxSteps = { max: 0, tokenId: 0 };
const oneOfOnes = [];
const recipientOneOfOnes = [];
const sampleTraits = {};
for (let tokenId = 1; tokenId <= MAX_SUPPLY; tokenId++) {
  const combo = permute(tokenId - 1, comboMask, comboA, comboC, COMBO_DOMAIN);
  comboSeen.add(combo.value);
  if (combo.steps > comboMaxSteps.max) Object.assign(comboMaxSteps, { max: combo.steps, tokenId });
  let n = combo.value;
  const values = Object.keys(TRAITS).map(key => {
    const id = n % 6;
    n = Math.floor(n / 6);
    return id;
  });
  if (tokenId <= 8) sampleTraits[tokenId] = values.map((id, i) => ({
    category: Object.keys(TRAITS)[i], id, value: Object.values(TRAITS)[i][id]
  }));

  const rank = permute(tokenId - 1, rarityMask, rarityA, rarityC, MAX_SUPPLY);
  if (rank.steps > rarityMaxSteps.max) Object.assign(rarityMaxSteps, { max: rank.steps, tokenId });
  const tierIndex = TIERS.findIndex(t => rank.value < t.until);
  const tier = TIERS[tierIndex];
  tierCounts[tier.name]++;
  if (tierIndex === 5) {
    const oneOfOneId = rank.value - 5191;
    const record = { tokenId, name: ONE_OF_ONE_NAMES[oneOfOneId], airdrop: tokenId <= AIRDROP_COUNT };
    oneOfOnes.push(record);
    if (record.airdrop) recipientOneOfOnes.push({ ...record, recipient: recipients[tokenId - 1] });
  }
}
if (comboSeen.size !== MAX_SUPPLY) throw new Error(`Only ${comboSeen.size} unique trait combinations`);
if (Object.values(tierCounts).reduce((a, b) => a + b, 0) !== MAX_SUPPLY) throw new Error('Rarity counts do not sum to supply');
if (oneOfOnes.length !== ONE_OF_ONE_NAMES.length) throw new Error('Incorrect 1/1 count');

const manifest = {
  collection: 'ULTRA CAT',
  symbol: 'ULTCAT',
  network: 'Cronos mainnet',
  chain_id: 25,
  status: 'pre-deployment build; no contract is deployed',
  total_supply: MAX_SUPPLY,
  wolfies_collection: '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff',
  wolfies_snapshot_block: snapshot.snapshot_block,
  wolfies_snapshot_hash: snapshot.snapshot_hash,
  airdrop_rule: 'one per unique snapshot owner, excluding only the dead sink; contract addresses included',
  airdrop_count: AIRDROP_COUNT,
  reserve_count: RESERVE_COUNT,
  airdrop_recipient_file: 'snapshot/airdrop-recipients-block-97406258.csv',
  airdrop_proofs_file: 'release/airdrop-proofs.json',
  airdrop_merkle_root: merkleRoot,
  airdrop_order: 'ascending keccak256(abi.encodePacked(public collection seed, address)); lowercase address breaks any hash tie; token IDs 1..701',
  seed_text: SEED_TEXT,
  seed_keccak256: seedHex,
  trait_category_count: 7,
  trait_combinations: COMBO_DOMAIN,
  unique_trait_combinations_verified: comboSeen.size,
  trait_categories: TRAITS,
  rarity_counts: tierCounts,
  one_of_one_count: oneOfOnes.length,
  one_of_one_assignments: oneOfOnes,
  one_of_ones_airdropped_to_snapshot_recipients: recipientOneOfOnes.length,
  one_of_one_recipient_assignments: recipientOneOfOnes,
  permutation: {
    type: 'seed-derived full-period LCG over a power-of-two domain with cycle walking',
    combo_domain_mask: `0x${comboMask.toString(16)}`,
    combo_multiplier: comboA.toString(),
    combo_increment: comboC.toString(),
    rarity_domain_mask: `0x${rarityMask.toString(16)}`,
    rarity_multiplier: rarityA.toString(),
    rarity_increment: rarityC.toString(),
    max_combo_cycle_steps_for_supply: comboMaxSteps.max,
    max_combo_cycle_token_id: comboMaxSteps.tokenId,
    max_rarity_cycle_steps_for_supply: rarityMaxSteps.max,
    max_rarity_cycle_token_id: rarityMaxSteps.tokenId
  },
  sample_trait_assignments: sampleTraits
};
const out = path.join(ROOT, 'release', 'trait-manifest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Verified ${recipients.length} recipients, ${RESERVE_COUNT} reserve NFTs, ${comboSeen.size} unique art combinations, and ${oneOfOnes.length} 1/1s.`);
console.log(`Seed ${seedHex}; maximum cycle-walk steps: art=${comboMaxSteps.max}, rarity=${rarityMaxSteps.max}.`);
console.log(`Wrote ${path.relative(ROOT, out)}.`);
