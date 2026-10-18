import { resource, type Texture } from '@kurot/core';

await resource.loadConfig('resource.json', 'assets/');
await resource.loadGroup('preload');
const texture = resource.get<Texture>('bg.png');

export {};
