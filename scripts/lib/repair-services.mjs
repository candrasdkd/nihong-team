import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as firestore from 'firebase/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const nativeRequire = createRequire(import.meta.url);

// Use the very same SDK instance that created db. The SDK's CommonJS and ESM
// entrypoints have different class identities and cannot share a Firestore db.
export function createRepairModuleLoader({ db, auth }) {
  const cache = new Map();
  const load = file => {
    const absolute = resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const source = ts.transpileModule(readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = name => {
      if (name === 'firebase/firestore') return firestore;
      if (name.endsWith('/lib/firebase')) return { db, auth };
      if (name.startsWith('.')) return load(resolve(dirname(absolute), `${name}.ts`));
      return nativeRequire(name);
    };
    // Repository code runs in Node's realm so its plain objects also pass
    // Firestore's serializer checks. A new VM realm breaks write validation.
    const execute = runInThisContext(`(function(exports, require) {\n${source}\n})`, { filename: absolute });
    execute(exports, require);
    return exports;
  };
  return load;
}
