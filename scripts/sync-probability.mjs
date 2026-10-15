import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const checkout = path.resolve(process.argv[2] || '');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(checkout, 'dist');
const destination = path.join(root, 'v4/public/probability');
if (!process.argv[2] || !existsSync(path.join(source, 'source/230anotes.pdf')))
  throw new Error('Usage: node scripts/sync-probability.mjs /path/to/probability-companion');
if (
  execFileSync('git', ['status', '--porcelain', '--', 'dist'], {
    cwd: checkout,
    encoding: 'utf8',
  }).trim()
)
  throw new Error('Commit and verify the canonical reader before copying its runtime.');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: checkout,
  encoding: 'utf8',
}).trim();

// Only the reviewed runtime ships. Never copy repository metadata, credentials,
// annotations, research extracts, or other files outside canonical dist/.
function filesIn(directory, prefix = '') {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const filename = path.join(directory, name);
      const relative = path.posix.join(prefix, name);
      if (lstatSync(filename).isSymbolicLink() || name.startsWith('.'))
        throw new Error(`Unexpected hidden file or symlink in runtime: ${relative}`);
      return lstatSync(filename).isDirectory() ? filesIn(filename, relative) : [relative];
    });
}
const files = filesIn(source).map((file) => ({
  file,
  sha256: createHash('sha256')
    .update(readFileSync(path.join(source, file)))
    .digest('hex'),
}));
rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
writeFileSync(
  path.join(root, 'docs/probability-snapshot.json'),
  JSON.stringify(
    {
      sourceCommit: commit,
      url: 'https://josephrbailey.com/probability/',
      files,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Copied ${files.length} reader assets from ${commit} to /probability/.`);
