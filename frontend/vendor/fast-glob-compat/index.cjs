'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- The pinned consumers require a CommonJS API. */

const path = require('node:path');
const { globSync: tinyGlobSync, isDynamicPattern } = require('tinyglobby');

const supportedOptions = new Set(['cwd', 'onlyDirectories', 'onlyFiles', 'dot', 'ignore', 'absolute']);

function invalidPattern(message, code) {
  const error = new SyntaxError(message);
  error.code = code;
  return error;
}

// Bound work before the matcher sees the pattern. This loop never recurses.
function validate(pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    throw new TypeError('Glob patterns must be nonempty strings');
  }
  if (pattern.length > 10_000) {
    throw invalidPattern('Glob pattern exceeds 10000 characters', 'ERR_GLOB_LENGTH');
  }
  let braces = 0;
  let parentheses = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\') { i++; continue; }
    // Count conservatively even inside character classes. An unmatched '[' can
    // become a literal in the matcher, so it must not hide the remaining depth.
    if (char === '{') braces++;
    if (char === '}') braces = Math.max(0, braces - 1);
    if (char === '(') parentheses++;
    if (char === ')') parentheses = Math.max(0, parentheses - 1);
    if (braces > 64 || parentheses > 64) {
      throw invalidPattern('Glob nesting exceeds 64 levels', 'ERR_GLOB_DEPTH');
    }
    // tinyglobby and fast-glob differ on range braces. Neither consumer uses them.
    if (braces && char === '.' && pattern[i + 1] === '.') {
      throw invalidPattern('Range braces are outside the supported glob contract', 'ERR_GLOB_RANGE');
    }
  }
}

function globSync(input, options = {}) {
  for (const key of Object.keys(options)) {
    if (!supportedOptions.has(key)) throw new TypeError(`Unsupported glob option: ${key}`);
  }
  const patterns = Array.isArray(input) ? input : [input];
  const ignore = options.ignore === undefined ? [] : [].concat(options.ignore);
  [...patterns, ...ignore].forEach(validate);
  const negative = patterns.filter(pattern => pattern[0] === '!' && pattern[1] !== '(');
  const positive = patterns.filter(pattern => !negative.includes(pattern));
  const cwd = path.resolve(options.cwd || '.');
  const results = new Set();
  for (const pattern of positive) {
    // fast-glob treats a trailing slash as a directory-only pattern.
    const trailingSlash = pattern.endsWith('/');
    if (trailingSlash && options.onlyDirectories !== true && options.onlyFiles !== false) continue;
    const matches = tinyGlobSync([pattern, ...negative], {
      ...options,
      cwd,
      expandDirectories: false,
      absolute: true,
      ...(trailingSlash ? { onlyDirectories: true } : {}),
    });
    // Preserve ./ and ../ prefixes: Vite turns these paths into require() cases.
    const prefix = pattern.match(/^(?:(?:\.{1,2})\/)+/)?.[0] || '';
    for (const match of matches) {
      const absolute = path.resolve(match);
      let result = options.absolute || path.isAbsolute(pattern)
        ? absolute.split(path.sep).join('/')
        : prefix + path.relative(path.resolve(cwd, prefix), absolute).split(path.sep).join('/');
      if (!result) result = '.';
      if (trailingSlash && !isDynamicPattern(pattern) && !result.endsWith('/')) result += '/';
      results.add(result);
    }
  }
  return [...results];
}

// These are the only APIs used by the pinned consumers; not a full fast-glob fork.
module.exports = { sync: globSync, globSync };
