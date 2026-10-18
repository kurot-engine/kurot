# loadConfig

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
loadConfig(url: string, folder: string): Promise<void>;
```

Load and parse a resource configuration file.

**Parameter url:** URL of the resource.json file

**Parameter folder:** Base URL prefix for resource files (default: '')
Resource URLs are prefixed with folder, independently of the config URL.
Network and JSON/config errors reject the returned promise.

**Default folder:** `''`
