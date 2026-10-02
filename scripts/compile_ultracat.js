const fs = require('node:fs');
const path = require('node:path');
const solc = require('solc');

const ROOT = path.resolve(__dirname, '..');
const contractsDir = path.join(ROOT, 'contracts');
const sourceNames = ['UltraCat5212.sol', 'UltraCatArt.sol', 'UltraCatRenderer.sol', 'Base64.sol'];
const sources = {};
for (const name of sourceNames) {
  const key = `contracts/${name}`;
  sources[key] = { content: fs.readFileSync(path.join(contractsDir, name), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    evmVersion: 'paris',
    outputSelection: {
      '*': { '*': ['abi', 'metadata', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.gasEstimates'] }
    }
  }
};
function findImports(importPath) {
  const nodeModules = path.join(ROOT, 'node_modules');
  const resolved = path.join(nodeModules, importPath);
  if (!resolved.startsWith(nodeModules + path.sep) || !fs.existsSync(resolved)) {
    return { error: `Import not found: ${importPath}` };
  }
  return { contents: fs.readFileSync(resolved, 'utf8') };
}
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors || []).filter(x => x.severity === 'error');
for (const e of output.errors || []) {
  const where = e.sourceLocation ? `${e.sourceLocation.file}:${e.sourceLocation.start}` : 'solc';
  console.log(`${e.severity.toUpperCase()} ${where}: ${e.formattedMessage}`);
}
if (errors.length) process.exit(1);

function makeArtifact(sourceName, contractName) {
  const contract = output.contracts[sourceName][contractName];
  const bytecode = contract.evm.bytecode.object;
  const deployedBytecode = contract.evm.deployedBytecode.object;
  const runtimeBytes = deployedBytecode.length / 2;
  const initBytes = bytecode.length / 2;
  if (runtimeBytes > 24576) throw new Error(`${contractName} runtime exceeds EIP-170: ${runtimeBytes} bytes`);
  if (initBytes > 49152) throw new Error(`${contractName} init bytecode exceeds EIP-3860: ${initBytes} bytes`);
  return {
    contractName,
    sourceName,
    compiler: solc.version(),
    settings: input.settings,
    abi: contract.abi,
    bytecode: `0x${bytecode}`,
    deployedBytecode: `0x${deployedBytecode}`,
    runtimeBytes,
    initBytes,
    gasEstimates: contract.evm.gasEstimates
  };
}

const artifacts = [
  makeArtifact('contracts/UltraCat5212.sol', 'UltraCat5212'),
  makeArtifact('contracts/UltraCatRenderer.sol', 'UltraCatRenderer')
];
const releaseDir = path.join(ROOT, 'release');
fs.mkdirSync(releaseDir, { recursive: true });
for (const artifact of artifacts) {
  const out = path.join(releaseDir, `${artifact.contractName}.json`);
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`Compiled ${artifact.contractName} with ${solc.version()}. Runtime ${artifact.runtimeBytes} bytes; creation ${artifact.initBytes} bytes.`);
  console.log(`Wrote ${path.relative(ROOT, out)}.`);
}
