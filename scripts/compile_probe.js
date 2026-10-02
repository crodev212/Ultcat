const fs = require('node:fs');
const path = require('node:path');
const solc = require('solc');

const ROOT = path.resolve(__dirname, '..');
const probeSource = 'probe/UltraCatCompatProbe.sol';
const sources = {
  [probeSource]: { content: fs.readFileSync(path.join(ROOT, probeSource), 'utf8') },
  'contracts/UltraCatRenderer.sol': { content: fs.readFileSync(path.join(ROOT, 'contracts/UltraCatRenderer.sol'), 'utf8') },
  'contracts/UltraCatArt.sol': { content: fs.readFileSync(path.join(ROOT, 'contracts/UltraCatArt.sol'), 'utf8') },
  'contracts/Base64.sol': { content: fs.readFileSync(path.join(ROOT, 'contracts/Base64.sol'), 'utf8') }
};

const settings = {
  optimizer: { enabled: true, runs: 200 },
  viaIR: true,
  evmVersion: 'paris',
  outputSelection: { '*': { '*': ['abi', 'metadata', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.gasEstimates'] } }
};

function findImports(importPath) {
  const candidates = [
    path.resolve(ROOT, 'probe', importPath),
    path.resolve(ROOT, importPath),
    path.resolve(ROOT, 'node_modules', importPath)
  ];
  const file = candidates.find(candidate => candidate.startsWith(ROOT + path.sep) && fs.existsSync(candidate));
  return file ? { contents: fs.readFileSync(file, 'utf8') } : { error: `Import not found: ${importPath}` };
}

const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings }), { import: findImports }));
const errors = (output.errors || []).filter(error => error.severity === 'error');
for (const error of output.errors || []) console.log(`${error.severity.toUpperCase()}: ${error.formattedMessage}`);
if (errors.length) process.exit(1);

const contract = output.contracts[probeSource].UltraCatCompatProbe;
const artifact = {
  contractName: 'UltraCatCompatProbe',
  sourceName: probeSource,
  compiler: solc.version(),
  settings,
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
  deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
  initBytes: contract.evm.bytecode.object.length / 2,
  runtimeBytes: contract.evm.deployedBytecode.object.length / 2,
  gasEstimates: contract.evm.gasEstimates,
  warning: 'TEST ONLY. Do not list or sell this token. Deploy only with explicit owner approval.'
};
if (artifact.initBytes > 49152 || artifact.runtimeBytes > 24576) throw new Error('Probe exceeds EVM size limits');
const destination = path.join(ROOT, 'release', 'UltraCatCompatProbe.json');
fs.writeFileSync(destination, JSON.stringify(artifact, null, 2) + '\n');
console.log(`Compiled test-only probe with ${solc.version()}; runtime ${artifact.runtimeBytes} bytes, creation ${artifact.initBytes} bytes.`);
console.log(`Wrote ${path.relative(ROOT, destination)}.`);
