const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Interface, AbiCoder } = require('ethers');
const { createVM } = require('@ethereumjs/vm');
const { createAddressFromString, createAccount, bytesToHex, hexToBytes } = require('@ethereumjs/util');

const ROOT = path.resolve(__dirname, '..');
const mainArtifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCat5212.json'), 'utf8'));
const rendererArtifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCatRenderer.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'trait-manifest.json'), 'utf8'));
const airdropProofs = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'airdrop-proofs.json'), 'utf8'));
const recipients = fs.readFileSync(path.join(ROOT, 'snapshot', 'airdrop-recipients-block-97406258.csv'), 'utf8')
  .trim().split(/\r?\n/).slice(1).map(x => x.toLowerCase());
const proofByAddress = new Map(airdropProofs.rows.map(row => [row.address.toLowerCase(), row.proof]));
const proofsFor = (batch) => batch.map(address => proofByAddress.get(address.toLowerCase()) || []);

const treasury = createAddressFromString('0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2');
const outsider = createAddressFromString('0x2000000000000000000000000000000000000002');
const transferTarget = '0x3000000000000000000000000000000000000003';
const coder = AbiCoder.defaultAbiCoder();

function addressObject(addr) {
  return createAddressFromString(typeof addr === 'string' ? addr : addr.toString());
}

async function execute(vm, { caller, to, data, gasLimit = 30_000_000n, staticCall = false }) {
  const result = await vm.evm.runCall({
    caller: addressObject(caller),
    to: to ? addressObject(to) : undefined,
    data: hexToBytes(data),
    gasLimit,
    isStatic: staticCall
  });
  return result;
}

function assertSuccess(result, label) {
  assert.equal(result.execResult.exceptionError, undefined, `${label} reverted: ${result.execResult.exceptionError?.error}`);
}
function assertRevert(result, label) {
  assert.ok(result.execResult.exceptionError, `${label} unexpectedly succeeded`);
}
function decode(iface, functionName, result) {
  return iface.decodeFunctionResult(functionName, bytesToHex(result.execResult.returnValue));
}
function deployData(artifact, args = []) {
  const encoded = args.length ? coder.encode(args.map(x => x.type), args.map(x => x.value)).slice(2) : '';
  return artifact.bytecode + encoded;
}
function callData(iface, method, args = []) {
  return iface.encodeFunctionData(method, args);
}
function base64Payload(uri, prefix) {
  assert.ok(uri.startsWith(prefix), `expected ${prefix}`);
  return Buffer.from(uri.slice(prefix.length), 'base64').toString('utf8');
}

async function run() {
  assert.equal(recipients.length, 701);
  const vm = await createVM();
  await vm.stateManager.putAccount(treasury, createAccount({ balance: 10n ** 24n }));
  await vm.stateManager.putAccount(outsider, createAccount({ balance: 10n ** 22n }));

  const rendererCreate = await execute(vm, { caller: treasury, data: rendererArtifact.bytecode });
  assertSuccess(rendererCreate, 'renderer deployment');
  const rendererAddress = rendererCreate.createdAddress;
  assert.ok(rendererAddress, 'renderer address missing');

  const mainCreateData = deployData(mainArtifact, [
    { type: 'address', value: treasury.toString() },
    { type: 'address', value: rendererAddress.toString() }
  ]);
  const mainCreate = await execute(vm, { caller: treasury, data: mainCreateData });
  assertSuccess(mainCreate, 'collection deployment');
  const contractAddress = mainCreate.createdAddress;
  assert.ok(contractAddress, 'collection address missing');
  const iface = new Interface(mainArtifact.abi);

  const constant = async (name) => {
    const result = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, name), staticCall: true });
    assertSuccess(result, `${name} read`);
    return decode(iface, name, result)[0];
  };
  assert.equal((await constant('MAX_SUPPLY')).toString(), '5212');
  assert.equal((await constant('AIRDROP_RECIPIENTS')).toString(), '701');
  assert.equal((await constant('RESERVE_SUPPLY')).toString(), '4511');
  assert.equal((await constant('WOLFIES_SNAPSHOT_BLOCK')).toString(), '97406258');
  assert.equal((await constant('AIRDROP_MERKLE_ROOT')).toLowerCase(), airdropProofs.merkle_root.toLowerCase());
  assert.equal((await constant('WOLFIES_COLLECTION')).toLowerCase(), '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff');
  assert.equal((await constant('treasury')).toLowerCase(), treasury.toString().toLowerCase());
  assert.equal((await constant('artRenderer')).toLowerCase(), rendererAddress.toString().toLowerCase());

  const badDead = await execute(vm, {
    caller: treasury, to: contractAddress,
    data: callData(iface, 'airdropBatch', [['0x000000000000000000000000000000000000dead'], [[]]])
  });
  assertRevert(badDead, 'dead-sink airdrop check');
  const badOrder = await execute(vm, {
    caller: treasury, to: contractAddress,
    data: callData(iface, 'airdropBatch', [[recipients[1], recipients[0]], proofsFor([recipients[1], recipients[0]])])
  });
  assertRevert(badOrder, 'ascending-recipient check');
  const badProof = await execute(vm, {
    caller: treasury, to: contractAddress,
    data: callData(iface, 'airdropBatch', [[recipients[0]], [['0x' + '00'.repeat(32)] ]])
  });
  assertRevert(badProof, 'Merkle recipient proof check');
  const unauthorized = await execute(vm, {
    caller: outsider, to: contractAddress,
    data: callData(iface, 'airdropBatch', [[recipients[0]], proofsFor([recipients[0]])])
  });
  assertRevert(unauthorized, 'treasury-only airdrop check');
  const reserveTooEarly = await execute(vm, {
    caller: treasury, to: contractAddress,
    data: callData(iface, 'mintReserveBatch', [1])
  });
  assertRevert(reserveTooEarly, 'reserve-before-airdrop check');

  const preview = await execute(vm, {
    caller: outsider, to: contractAddress,
    data: callData(iface, 'previewSVG', [1]), staticCall: true
  });
  assertSuccess(preview, 'pre-mint artwork preview');
  const previewSvg = decode(iface, 'previewSVG', preview)[0];
  assert.ok(previewSvg.startsWith('<svg'));
  assert.ok(previewSvg.includes('shape-rendering=\'crispEdges\''));

  const gas = { rendererDeploy: rendererCreate.execResult.executionGasUsed, collectionDeploy: mainCreate.execResult.executionGasUsed, airdropBatches: [], reserveBatches: [] };
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100);
    const result = await execute(vm, { caller: treasury, to: contractAddress, data: callData(iface, 'airdropBatch', [batch, proofsFor(batch)]) });
    assertSuccess(result, `airdrop batch ${i / 100 + 1}`);
    gas.airdropBatches.push(result.execResult.executionGasUsed);
  }
  assert.equal((await constant('airdropRecipientCount')).toString(), '701');
  assert.equal((await constant('lastAirdropRecipient')).toLowerCase(), recipients.at(-1));
  assert.equal((await constant('lastAirdropSortKey')).toLowerCase(), airdropProofs.rows.at(-1).sort_key.toLowerCase());

  for (let minted = 0; minted < 4511;) {
    const quantity = Math.min(500, 4511 - minted);
    const result = await execute(vm, { caller: treasury, to: contractAddress, data: callData(iface, 'mintReserveBatch', [quantity]) });
    assertSuccess(result, `reserve batch ${gas.reserveBatches.length + 1}`);
    gas.reserveBatches.push(result.execResult.executionGasUsed);
    minted += quantity;
  }

  const totalSupply = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'totalSupply'), staticCall: true });
  assertSuccess(totalSupply, 'totalSupply read');
  assert.equal(decode(iface, 'totalSupply', totalSupply)[0].toString(), '5212');

  const ownerOf = async (tokenId) => {
    const r = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'ownerOf', [tokenId]), staticCall: true });
    assertSuccess(r, `ownerOf(${tokenId})`);
    return decode(iface, 'ownerOf', r)[0].toLowerCase();
  };
  assert.equal(await ownerOf(1), recipients[0]);
  assert.equal(await ownerOf(701), recipients[700]);
  assert.equal(await ownerOf(702), treasury.toString().toLowerCase());
  assert.equal(await ownerOf(5212), treasury.toString().toLowerCase());

  const uri1Call = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'tokenURI', [1]), staticCall: true, gasLimit: 50_000_000n });
  assertSuccess(uri1Call, 'tokenURI(1)');
  const uri1 = decode(iface, 'tokenURI', uri1Call)[0];
  const json1 = JSON.parse(base64Payload(uri1, 'data:application/json;base64,'));
  const svg1 = base64Payload(json1.image, 'data:image/svg+xml;base64,');
  assert.equal(json1.name, 'ULTRA CAT #1');
  assert.ok(svg1.startsWith('<svg'));
  assert.ok(svg1.includes("width='512' height='512'"));
  assert.equal(json1.attributes.length, 8);
  assert.ok(json1.attributes.some(a => a.trait_type === 'Rarity'));
  assert.ok(uri1Call.execResult.executionGasUsed < 5_000_000n, `tokenURI gas too high: ${uri1Call.execResult.executionGasUsed}`);

  const oneOfOne = manifest.one_of_one_assignments[0];
  const specialCall = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'tokenURI', [oneOfOne.tokenId]), staticCall: true, gasLimit: 50_000_000n });
  assertSuccess(specialCall, '1/1 tokenURI');
  const specialJson = JSON.parse(base64Payload(decode(iface, 'tokenURI', specialCall)[0], 'data:application/json;base64,'));
  assert.ok(specialJson.attributes.some(a => a.trait_type === '1/1' && a.value === oneOfOne.name));

  const royalty = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'royaltyInfo', [1, 10000]), staticCall: true });
  assertSuccess(royalty, 'ERC-2981 royaltyInfo');
  const [receiver, amount] = decode(iface, 'royaltyInfo', royalty);
  assert.equal(receiver.toLowerCase(), treasury.toString().toLowerCase());
  assert.equal(amount.toString(), '500');
  const erc2981 = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'supportsInterface', ['0x2a55205a']), staticCall: true });
  assertSuccess(erc2981, 'ERC-2981 interface support');
  assert.equal(decode(iface, 'supportsInterface', erc2981)[0], true);
  for (const interfaceId of ['0x01ffc9a7', '0x80ac58cd', '0x5b5e139f']) {
    const standard = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'supportsInterface', [interfaceId]), staticCall: true });
    assertSuccess(standard, `interface ${interfaceId}`);
    assert.equal(decode(iface, 'supportsInterface', standard)[0], true, `missing interface ${interfaceId}`);
  }

  const contractUriCall = await execute(vm, { caller: outsider, to: contractAddress, data: callData(iface, 'contractURI'), staticCall: true });
  assertSuccess(contractUriCall, 'contractURI');
  const collectionJson = JSON.parse(base64Payload(decode(iface, 'contractURI', contractUriCall)[0], 'data:application/json;base64,'));
  assert.equal(collectionJson.seller_fee_basis_points, 500);
  assert.equal(collectionJson.fee_recipient.toLowerCase(), treasury.toString().toLowerCase());
  assert.equal(collectionJson.name, 'ULTRA CAT');
  const logoSvg = base64Payload(collectionJson.image, 'data:image/svg+xml;base64,');
  assert.ok(logoSvg.startsWith('<svg'));
  assert.ok(logoSvg.includes("width='512' height='512'"));
  fs.writeFileSync(path.join(ROOT, 'release', 'collection-logo.svg'), logoSvg + '\n');

  const transfer = await execute(vm, {
    caller: treasury, to: contractAddress,
    data: callData(iface, 'transferFrom', [treasury.toString(), transferTarget, 702])
  });
  assertSuccess(transfer, 'standard ERC-721 transfer');
  assert.equal(await ownerOf(702), transferTarget.toLowerCase());

  const finalize = await execute(vm, { caller: treasury, to: contractAddress, data: callData(iface, 'finalizeDistribution') });
  assertSuccess(finalize, 'distribution finalization');
  assert.equal((await constant('distributionFinalized')), true);
  const lateMint = await execute(vm, { caller: treasury, to: contractAddress, data: callData(iface, 'mintReserveBatch', [1]) });
  assertRevert(lateMint, 'post-finalization mint check');

  const gasSummary = {
    renderer_deploy_gas: gas.rendererDeploy.toString(),
    collection_deploy_gas: gas.collectionDeploy.toString(),
    airdrop_batch_gas: gas.airdropBatches.map(x => x.toString()),
    reserve_batch_gas: gas.reserveBatches.map(x => x.toString()),
    token_uri_1_gas: uri1Call.execResult.executionGasUsed.toString(),
    token_uri_1_of_1_gas: specialCall.execResult.executionGasUsed.toString(),
    test_chain: 'EthereumJS VM, Paris-compatible bytecode; indicative only, not a Cronos gas quote'
  };
  fs.writeFileSync(path.join(ROOT, 'release', 'local-test-results.json'), JSON.stringify({
    status: 'passed',
    contract: mainArtifact.contractName,
    renderer: rendererArtifact.contractName,
    total_supply: 5212,
    airdrop_recipient_count: 701,
    airdrop_merkle_root: airdropProofs.merkle_root,
    reserve_count: 4511,
    transferability_check: 'passed',
    royalty_check: '5% ERC-2981',
    metadata_check: 'embedded JSON and Base64 SVG decoded successfully',
    gas: gasSummary
  }, null, 2) + '\n');
  console.log('ULTRA CAT tests passed: deployment, protected distribution, 5,212 supply, standard transfer, on-chain SVG/JSON, 5% ERC-2981, and finalization.');
  console.log(`Local EVM gas: deploy renderer=${gas.rendererDeploy}; collection=${gas.collectionDeploy}; tokenURI(1)=${uri1Call.execResult.executionGasUsed}.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
