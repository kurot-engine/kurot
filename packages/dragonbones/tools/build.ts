import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
await rm(resolve(packageDir, 'dist'), { recursive: true, force: true });
execFileSync(process.execPath, [resolve(packageDir, 'node_modules/typescript/bin/tsc'), '--project', resolve(packageDir, 'tsconfig.json')], { stdio: 'inherit' });
await mkdir(resolve(packageDir, 'dist/runtime'), { recursive: true });
await copyFile(resolve(packageDir, 'src/runtime/LICENSE'), resolve(packageDir, 'dist/runtime/LICENSE'));
