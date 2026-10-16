#!/usr/bin/env node
/**
 * Automated Executable E2E Test Runner for NOVA 1.0
 * 
 * Usage:
 *   node tests/e2e/runner.mjs
 *   node tests/e2e/runner.mjs --tier=1
 *   node tests/e2e/runner.mjs --tier=2
 *   node tests/e2e/runner.mjs --tier=3
 *   node tests/e2e/runner.mjs --tier=4
 * 
 * Exit Code Semantics:
 *   0: All tests passed cleanly
 *   1: One or more test assertions failed
 *   2: Runner execution error
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
let targetPattern = 'tests/e2e';

for (const arg of args) {
  if (arg === '--tier=1') {
    targetPattern = 'tests/e2e/tier1_features';
  } else if (arg === '--tier=2') {
    targetPattern = 'tests/e2e/tier2_boundaries';
  } else if (arg === '--tier=3') {
    targetPattern = 'tests/e2e/tier3_combinations';
  } else if (arg === '--tier=4') {
    targetPattern = 'tests/e2e/tier4_scenarios';
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
NOVA 1.0 E2E Test Suite Runner

Usage:
  node tests/e2e/runner.mjs [options]

Options:
  --tier=1    Run Tier 1 Feature Coverage (45 tests: R1-R9)
  --tier=2    Run Tier 2 Boundary & Corner Cases (45 tests: R1-R9)
  --tier=3    Run Tier 3 Cross-Feature Pairwise Interactions (10 tests)
  --tier=4    Run Tier 4 Real-World Application Scenarios (5 scenarios)
  --help      Show this help documentation
`);
    process.exit(0);
  }
}

console.log('================================================================================');
console.log('                 NOVA 1.0 E2E TEST SUITE RUNNER                                ');
console.log('================================================================================');
console.log(`Working Directory : ${projectRoot}`);
console.log(`Target Suite      : ${targetPattern}`);
console.log(`Execution Mode    : Opaque-Box, Requirement-Driven`);
console.log('--------------------------------------------------------------------------------\n');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vitestArgs = ['vitest', 'run', targetPattern, '--reporter=verbose'];

const startTime = Date.now();
const child = spawn(npxCmd, vitestArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
});

child.on('error', (err) => {
  console.error('\n[ERROR] Failed to start test runner:', err);
  process.exit(2);
});

child.on('close', (code) => {
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n--------------------------------------------------------------------------------');
  if (code === 0) {
    console.log(`[PASS] NOVA 1.0 E2E Test Suite passed successfully in ${durationSec}s.`);
    console.log('VERDICT: TEST_READY (Exit code 0)');
    process.exit(0);
  } else {
    console.error(`[FAIL] NOVA 1.0 E2E Test Suite failed with exit code ${code} in ${durationSec}s.`);
    console.error('VERDICT: DEFECT_DETECTED (Exit code 1)');
    process.exit(1);
  }
});
