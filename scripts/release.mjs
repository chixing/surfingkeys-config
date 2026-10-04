import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [command, directory = 'release'] = process.argv.slice(2);
const files = ['surfingkeys.js', 'surfingkeys.js.map'];
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

function verify(path) {
  const manifest = JSON.parse(readFileSync(join(path, 'manifest.json'), 'utf8'));
  requireValue(manifest.repository === 'chixing/surfingkeys-config', 'Unexpected repository');
  requireValue(/^[0-9a-f]{40}$/.test(manifest.source_sha), 'Invalid source SHA');
  requireValue(/^\d+\.\d+\.\d+$/.test(manifest.version), 'Invalid release version');
  requireValue(manifest.dirty === false, 'Release must come from a clean checkout');
  if (process.env.EXPECTED_SOURCE_SHA) {
    requireValue(manifest.source_sha === process.env.EXPECTED_SOURCE_SHA, 'Artifact source differs from the successful build');
  }
  for (const file of files) {
    requireValue(manifest.files?.[file] === hash(join(path, file)), `Checksum mismatch: ${file}`);
  }
  const banner = readFileSync(join(path, 'surfingkeys.js'), 'utf8');
  requireValue(banner.includes(`Version: ${manifest.version}\n`), 'Bundle version differs from manifest');
  requireValue(banner.includes(`Source: ${manifest.source_sha}\n`), 'Bundle source differs from manifest');
  return manifest;
}

if (command === 'pack') {
  requireValue(git('status', '--porcelain') === '', 'Commit changes before creating a release package');
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const sha = git('rev-parse', 'HEAD');
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    requireValue(process.env.GITHUB_REF_NAME === `v${version}`, 'Tag and package version differ');
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main']);
  }
  requireValue(files.every((file) => existsSync(join('dist', file))), 'Build the bundle before packaging');
  mkdirSync(directory, { recursive: true });
  for (const file of files) copyFileSync(join('dist', file), join(directory, file));
  const manifest = {
    repository: 'chixing/surfingkeys-config',
    version,
    source_sha: sha,
    dirty: false,
    files: Object.fromEntries(files.map((file) => [file, hash(join(directory, file))])),
  };
  writeFileSync(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(directory, 'SHA256SUMS'), [...files, 'manifest.json'].map((file) => `${hash(join(directory, file))}  ${file}`).join('\n') + '\n');
  verify(directory);
  console.log(`Packaged ${version} from ${sha} in ${resolve(directory)}`);
} else if (command === 'verify' || command === 'deploy') {
  const manifest = verify(directory);
  if (command === 'deploy') {
    execFileSync('git', ['merge-base', '--is-ancestor', manifest.source_sha, 'origin/main']);
    execFileSync('gh', ['gist', 'edit', '82767d49380294ad7b298554e2c0e59b', join(directory, 'surfingkeys.js')], { stdio: 'inherit' });
  }
  console.log(`${command === 'deploy' ? 'Promoted' : 'Verified'} ${manifest.version} from ${manifest.source_sha}`);
} else {
  throw new Error('Usage: node scripts/release.mjs pack|verify|deploy [directory]');
}
