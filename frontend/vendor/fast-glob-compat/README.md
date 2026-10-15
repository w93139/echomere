# EchoMere glob compatibility adapter

This is an original, narrow adapter over **tinyglobby 0.2.17**. It replaces the
implementation behind two synchronous fast-glob consumers, rather than renaming
or suppressing the vulnerable braces package. No fast-glob, micromatch or braces
source is included. The package retains its own name in the lockfile.

Consumers are Next ESLint's `globSync(rootDir, { onlyDirectories: true })` and
vite-plugin-dynamic-import's `sync(patterns, { cwd })`, used by Vinext's CommonJS
transform and Next config loading. The dependency versions and their call sites
must be checked when upgrading these tools.

The contract covers relative/absolute paths, leading `./` and `../`, directory
matching, comma-list braces, extglobs, escapes, negative patterns, `ignore`, `dot`,
`onlyFiles`, `onlyDirectories`, `absolute` and `cwd`. Directory expansion is off.
Unknown options throw. Range braces (numeric/alphabetical/stepped) throw instead
of silently changing matches; neither current consumer generates them. Async,
stream, task generation and filesystem adapter APIs are not provided.

Patterns and ignores are scanned without recursion before matching. Inputs over
10000 characters or over 64 nested brace/parenthesis levels are rejected with a
controlled SyntaxError. Depth is counted conservatively even in character
classes, so a malformed unclosed class cannot bypass the guard. Regression tests exercise the stack-overflow input,
normal patterns and the actual ESLint/CommonJS consumers; audit alone is not the
security proof. This does not promise safety for every possible hostile regex.

## Packaging and maintenance

`npm overrides` directory links resolve inconsistently between npm versions.
The reviewed source here is therefore packed into a local, versioned tarball;
the lockfile records its SHA-512 integrity. It contains only these source files,
not a prebuilt third-party fork. A test compares installed code and metadata to
this directory to prevent a stale artifact from passing verification.

After changing this source:

1. Bump the version here and tarball path in the root package.json together.
2. Run `npm run vendor:glob`, then `npm install --package-lock-only`.
3. Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, and `npm audit`.
4. Verify both npm consumers, dev/start and the documented browser smoke flows.

Keep this adapter until those dependencies support a maintained replacement or
a genuinely patched braces release. Remove the adapter, local artifact and
override together after revalidating the consumers. Do not bypass audit.

References: https://superchupu.dev/tinyglobby/migration and
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
