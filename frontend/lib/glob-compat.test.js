import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const glob = require('fast-glob');
const sorted = values => values.sort();

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'echomere-glob-')));
  const cwd = path.join(root, 'project');
  const files = ['a.js', 'b.ts', 'nested/route.ts', 'nested/route.tsx', '.hidden.js', 'space dir/a.js', '[id]/route.ts', 'values/one.js', 'values/two/index.js'];
  for (const file of files) {
    const full = path.join(cwd, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, file.startsWith('values/') ? `exports.label = ${JSON.stringify(file)};` : '');
  }
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return cwd;
}

test('installed adapter matches reviewed source and vulnerable implementations are absent', () => {
  assert.equal(require('fast-glob/package.json').name, '@echomere/fast-glob-compat');
  assert.equal(readFileSync(require.resolve('fast-glob'), 'utf8'), readFileSync(new URL('../vendor/fast-glob-compat/index.cjs', import.meta.url), 'utf8'));
  assert.deepEqual(require('fast-glob/package.json'), require('../vendor/fast-glob-compat/package.json'));
  const packages = require('../package-lock.json').packages;
  assert.equal(Object.keys(packages).some(key => /node_modules\/(?:braces|micromatch)$/.test(key)), false);
  for (const consumer of ['@next/eslint-plugin-next', 'vite-plugin-dynamic-import', 'vite-plugin-commonjs']) {
    const fromConsumer = createRequire(require.resolve(consumer));
    assert.equal(fromConsumer.resolve('fast-glob'), require.resolve('fast-glob'));
  }
});

test('extension lists, negatives, escaping, spaces, dotfiles and extglobs retain their matches', t => {
  const cwd = fixture(t);
  assert.deepEqual(sorted(glob.sync('*.{js,ts}', { cwd })), ['a.js', 'b.ts']);
  assert.deepEqual(sorted(glob.sync('nested/route.{ts,tsx}', { cwd })), ['nested/route.ts', 'nested/route.tsx']);
  assert.deepEqual(glob.sync(['*.{js,ts}', '!b.ts'], { cwd }), ['a.js']);
  assert.deepEqual(glob.sync('*.{js,ts}', { cwd, ignore: ['b.ts'] }), ['a.js']);
  assert.deepEqual(sorted(glob.sync('*.js', { cwd, dot: true })), ['.hidden.js', 'a.js']);
  assert.deepEqual(glob.sync('\\[id\\]/route.ts', { cwd }), ['[id]/route.ts']);
  assert.deepEqual(glob.sync('space dir/*.js', { cwd }), ['space dir/a.js']);
  assert.deepEqual(sorted(glob.sync('+(a|b).+(js|ts)', { cwd })), ['a.js', 'b.ts']);
  assert.deepEqual(glob.sync([], { cwd }), []);
  assert.deepEqual(glob.sync(['!*.js'], { cwd }), []);
});

test('directory matching does not expand and keeps absolute, ./ and ../ result formats', t => {
  const cwd = fixture(t);
  assert.deepEqual(glob.globSync('nested', { cwd, onlyDirectories: true }), ['nested']);
  assert.deepEqual(glob.globSync('nested/', { cwd, onlyDirectories: true }), ['nested/']);
  assert.deepEqual(glob.globSync('nested', { cwd }), []);
  assert.deepEqual(glob.sync('nested/*/', { cwd }), []);
  assert.deepEqual(glob.sync('values/*/', { cwd, onlyDirectories: true }), ['values/two']);
  assert.deepEqual(glob.sync('./values/*.js', { cwd }), ['./values/one.js']);
  assert.deepEqual(glob.sync('../project/values/*.js', { cwd }), ['../project/values/one.js']);
  assert.deepEqual(glob.sync('./../project/values/*.js', { cwd }), ['./../project/values/one.js']);
  const absolute = path.join(cwd, 'nested').split(path.sep).join('/');
  assert.deepEqual(glob.globSync(absolute, { cwd, onlyDirectories: true }), [absolute]);
  assert.deepEqual(glob.globSync('nested', { cwd, onlyDirectories: true, absolute: true }), [absolute]);
  assert.deepEqual(glob.globSync('.', { cwd, onlyDirectories: true }), ['.']);
});

test('unsafe nesting is rejected before recursion, including negative and ignore patterns', () => {
  const deep = '{'.repeat(4900) + 'x' + '}'.repeat(4900); // 9801 chars: overflowed both old walkers with Node's default stack.
  for (const input of [deep, '[' + deep, ['*.js', '!' + deep], ['*.js', '![' + deep]]) {
    assert.throws(() => glob.sync(input), { name: 'SyntaxError', code: 'ERR_GLOB_DEPTH' });
  }
  assert.throws(() => glob.sync('*.js', { ignore: [deep] }), { code: 'ERR_GLOB_DEPTH' });
  assert.throws(() => glob.sync('*.js', { ignore: ['[' + deep] }), { code: 'ERR_GLOB_DEPTH' });
  assert.throws(() => glob.sync('('.repeat(65) + 'x' + ')'.repeat(65)), { code: 'ERR_GLOB_DEPTH' });
  assert.throws(() => glob.sync('[' + '('.repeat(65) + 'x' + ')'.repeat(65)), { code: 'ERR_GLOB_DEPTH' });
  const result = spawnSync(process.execPath, ['--stack-size=512', '-e', `const g=require('fast-glob');try{g.sync('{'.repeat(4000)+'x'+'}'.repeat(4000));process.exit(1)}catch(e){if(e.code!=='ERR_GLOB_DEPTH')throw e;console.log('bounded rejection')}`], { cwd: new URL('..', import.meta.url), timeout: 2000, encoding: 'utf8' });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /bounded rejection/);
});

test('unsupported semantics fail explicitly instead of silently changing results', () => {
  for (const range of ['{1..12}', '{01..03}', '{1..5..2}', '{a..z}']) {
    assert.throws(() => glob.sync(range), { code: 'ERR_GLOB_RANGE' });
    assert.throws(() => glob.sync('[' + range), { code: 'ERR_GLOB_RANGE' });
  }
  assert.throws(() => glob.sync('x'.repeat(10_001)), { code: 'ERR_GLOB_LENGTH' });
  assert.throws(() => glob.sync('*.js', { objectMode: true }), /Unsupported glob option/);
  assert.throws(() => glob.sync(''), TypeError);
  assert.throws(() => glob.sync([123]), TypeError);
});

test('Next ESLint rootDir uses the adapter for relative and absolute directory globs', t => {
  const cwd = fixture(t);
  const entry = require.resolve('@next/eslint-plugin-next');
  const { getRootDirs } = require(path.join(path.dirname(entry), 'utils/get-root-dirs.js'));
  const absolute = path.join(cwd, 'nested').split(path.sep).join('/');
  // The real consumer uses process.cwd() when no glob cwd option is supplied.
  assert.deepEqual(getRootDirs({ cwd, settings: { next: { rootDir: `${absolute}*` } } }), [absolute]);
  const relative = path.relative(process.cwd(), cwd).split(path.sep).join('/') + '/nested';
  assert.deepEqual(getRootDirs({ cwd, settings: { next: { rootDir: relative } } }), [relative]);
  assert.deepEqual(getRootDirs({ cwd, settings: {} }), [cwd]);
});

test('actual Vite CommonJS dynamic require transform preserves extensions, index, parent paths and aliases', async t => {
  const cwd = fixture(t);
  for (const [name, prefix] of Object.entries({ relative: './values/', parent: '../project/values/', alias: '@values/' })) {
    writeFileSync(path.join(cwd, `${name}.js`), `exports.load = name => require(${JSON.stringify(prefix)} + name);\n`);
  }
  writeFileSync(path.join(cwd, 'main.js'), "import relative from './relative.js'; import parent from './parent.js'; import alias from './alias.js'; export default {relative:relative.load,parent:parent.load,alias:alias.load};\n");
  const { build } = await import('vite');
  const { default: commonjs } = await import('vite-plugin-commonjs');
  const outDir = path.join(cwd, 'output');
  await build({
    configFile: false,
    root: cwd,
    logLevel: 'error',
    resolve: { alias: { '@values': path.join(cwd, 'values') } },
    plugins: [{ ...commonjs({ filter: id => id.startsWith(cwd) }), enforce: 'pre' }],
    build: { ssr: path.join(cwd, 'main.js'), outDir, minify: false, rollupOptions: { output: { format: 'es', entryFileNames: 'main.mjs' } } },
  });
  const { default: load } = await import(pathToFileURL(path.join(outDir, 'main.mjs')).href);
  for (const method of ['relative', 'parent', 'alias']) {
    assert.equal(load[method]('one').label, 'values/one.js', method);
    assert.equal(load[method]('one.js').label, 'values/one.js', method);
    assert.equal(load[method]('two').label, 'values/two/index.js', method);
  }
});
