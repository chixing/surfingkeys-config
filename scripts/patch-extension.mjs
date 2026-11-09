import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const [input, destination] = process.argv.slice(2);
if (!input || !destination) throw new Error('Usage: node scripts/patch-extension.mjs <installed-extension> <new-output-folder>');
const source = resolve(input);
const output = resolve(destination);
const overlap = relative(source, output);
if (!overlap || (overlap !== '..' && !overlap.startsWith(`..${sep}`) && !isAbsolute(overlap)))
  throw new Error('Output must be outside the installed extension.');
if (existsSync(output)) throw new Error('Choose a new output folder; existing files are never overwritten.');
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
if (manifest.name !== 'Surfingkeys' || manifest.manifest_version !== 3 || !manifest.background?.service_worker)
  throw new Error('Expected a Manifest V3 Surfingkeys installation.');
if (manifest.background.type === 'module') throw new Error('This patch requires a classic service worker.');
const originalWorker = manifest.background.service_worker;
// Match the dispatcher structurally, not by minified variable names. Let the
// owned dialog receive native input before Surfingkeys boots a mode in its frame.
const contentPath = manifest.content_scripts?.flatMap((entry) => entry.js ?? [])
  .find((path) => path === 'content.js');
if (!contentPath) throw new Error('Expected Surfingkeys content.js.');
const content = readFileSync(join(source, contentPath), 'utf8');
const tree = ts.createSourceFile(contentPath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const dispatchers = [];
const boots = [];
function inspect(node) {
  if (ts.isFunctionDeclaration(node) && node.parameters.length === 3 && node.body) {
    const text = node.body.getText(tree);
    if (text.includes('.eventListeners.hasOwnProperty(') && text.includes('.sk_suppressed'))
      dispatchers.push(node.body.getStart(tree) + 1);
  }
  if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'keydown' &&
      ts.isFunctionExpression(node.initializer) && node.initializer.body.getText(tree).includes('iframeBoot'))
    boots.push(node.initializer.body.getStart(tree) + 1);
  ts.forEachChild(node, inspect);
}
inspect(tree);
if (dispatchers.length !== 1 || boots.length !== 1)
  throw new Error('Unrecognized Surfingkeys input dispatcher; refusing to produce an unverified build.');
const guard = "if(document.querySelector('iframe[data-sk-tab-groups-dialog]')||window.frameElement?.hasAttribute('data-sk-tab-groups-dialog'))return;";
let guardedContent = content;
for (const index of [...dispatchers, ...boots].sort((a, b) => b - a))
  guardedContent = guardedContent.slice(0, index) + guard + guardedContent.slice(index);
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true, filter: (path) => basename(path) !== '_metadata' });
writeFileSync(join(output, contentPath), guardedContent);
const patch = fileURLToPath(new URL('../extension/batch-groups.js', import.meta.url));
cpSync(patch, join(output, 'batch-groups.js'));
writeFileSync(join(output, 'background-with-batch.js'),
  `importScripts('batch-groups.js', ${JSON.stringify(originalWorker)});\n`);
manifest.background.service_worker = 'background-with-batch.js';
manifest.version_name = `${manifest.version} + batch groups`;
// Preserve the public key/extension ID and its storage. This local build is
// maintained explicitly; never edit the signed Web Store installation in place.
delete manifest.update_url;
writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared Surfingkeys ${manifest.version_name} at ${output}`);
