const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Interface, AbiCoder } = require('ethers');
const { createVM } = require('@ethereumjs/vm');
const { createAddressFromString, createAccount, bytesToHex, hexToBytes } = require('@ethereumjs/util');

const ROOT = path.resolve(__dirname, '..');
const probe = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCatCompatProbe.json'), 'utf8'));
const renderer = JSON.parse(fs.readFileSync(path.join(ROOT, 'release', 'UltraCatRenderer.json'), 'utf8'));
const treasury = createAddressFromString('0x2B0aEC2cb2063060ac44D85f0b7463102D7f18e2');
const coder = AbiCoder.defaultAbiCoder();
const iface = new Interface(probe.abi);

function asAddress(value) { return createAddressFromString(typeof value === 'string' ? value : value.toString()); }
async function execute(vm, { caller, to, data, gasLimit = 30_000_000n, staticCall = false }) {
  return vm.evm.runCall({ caller: asAddress(caller), to: to ? asAddress(to) : undefined, data: hexToBytes(data), gasLimit, isStatic: staticCall });
}
function deployData(artifact, values) {
  const args = coder.encode(['address', 'address', 'address'], values).slice(2);
  return artifact.bytecode + args;
}
function decode(method, result) { return iface.decodeFunctionResult(method, bytesToHex(result.execResult.returnValue)); }
function ok(result, label) { assert.equal(result.execResult.exceptionError, undefined, `${label} reverted: ${result.execResult.exceptionError?.error}`); }
function decodeDataUri(uri, prefix) {
  assert.ok(uri.startsWith(prefix), `expected ${prefix}`);
  return Buffer.from(uri.slice(prefix.length), 'base64').toString('utf8');
}

async function run() {
  const vm = await createVM();
  await vm.stateManager.putAccount(treasury, createAccount({ balance: 10n ** 23n }));
  const rendererDeploy = await execute(vm, { caller: treasury, data: renderer.bytecode });
  ok(rendererDeploy, 'local renderer deployment');
  const rendererAddress = rendererDeploy.createdAddress;
  const probeDeploy = await execute(vm, {
    caller: treasury,
    data: deployData(probe, [treasury.toString(), rendererAddress.toString(), treasury.toString()])
  });
  ok(probeDeploy, 'local probe deployment');
  const probeAddress = probeDeploy.createdAddress;
  const uriCall = await execute(vm, { caller: treasury, to: probeAddress, data: iface.encodeFunctionData('tokenURI', [1]), staticCall: true, gasLimit: 5_000_000n });
  ok(uriCall, 'probe tokenURI');
  const metadata = JSON.parse(decodeDataUri(decode('tokenURI', uriCall)[0], 'data:application/json;base64,'));
  assert.equal(metadata.name, 'ULTRA CAT COMPAT PROBE #1');
  assert.equal(metadata.attributes.length, 8);
  const svg = decodeDataUri(metadata.image, 'data:image/svg+xml;base64,');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes("width='512' height='512'"));

  const collectionCall = await execute(vm, { caller: treasury, to: probeAddress, data: iface.encodeFunctionData('contractURI'), staticCall: true });
  ok(collectionCall, 'probe contractURI');
  const collectionJson = JSON.parse(decodeDataUri(decode('contractURI', collectionCall)[0], 'data:application/json;base64,'));
  assert.equal(collectionJson.name, 'ULTRA CAT COMPAT PROBE');
  assert.equal(collectionJson.seller_fee_basis_points, 500);
  assert.equal(collectionJson.fee_recipient.toLowerCase(), treasury.toString().toLowerCase());
  const logo = decodeDataUri(collectionJson.image, 'data:image/svg+xml;base64,');
  assert.ok(logo.startsWith('<svg') && logo.includes("width='512' height='512'"));

  for (const interfaceId of ['0x01ffc9a7', '0x80ac58cd', '0x5b5e139f', '0x2a55205a']) {
    const result = await execute(vm, { caller: treasury, to: probeAddress, data: iface.encodeFunctionData('supportsInterface', [interfaceId]), staticCall: true });
    ok(result, `supportsInterface ${interfaceId}`);
    assert.equal(decode('supportsInterface', result)[0], true);
  }

  const report = {
    status: 'passed',
    test_only: true,
    local_contracts: ['UltraCatRenderer', 'UltraCatCompatProbe'],
    token_uri_json_decoded: true,
    token_svg_decoded: true,
    collection_uri_json_decoded: true,
    collection_logo_svg_decoded: true,
    svg_dimensions: '512x512',
    supports_erc721_and_metadata_and_erc2981: true,
    local_vm_gas: {
      renderer_deploy: rendererDeploy.execResult.executionGasUsed.toString(),
      probe_deploy: probeDeploy.execResult.executionGasUsed.toString(),
      token_uri: uriCall.execResult.executionGasUsed.toString()
    },
    note: 'Local VM only. This does not deploy anything or prove Ebisu’s Bay, any marketplace, or wallet will index/render the probe.'
  };
  fs.writeFileSync(path.join(ROOT, 'release', 'probe-local-test-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Local compatibility probe tests passed. Renderer deploy ${report.local_vm_gas.renderer_deploy} gas; probe deploy ${report.local_vm_gas.probe_deploy} gas; tokenURI ${report.local_vm_gas.token_uri} gas.`);
}

run().catch(error => { console.error(error); process.exit(1); });
