# API documentation verification

Run from the repository root after building the SDK declarations:

```sh
pnpm --dir tools/api-docs verify
```

The command checks the documentation contract:

- Public root exports and public/protected members have matching generated pages.
- Generated contents, API links and package versions agree with the source.
- Coverage reports distinguish missing references from behavioral-comment gaps;
  newly undocumented entries fail the baseline check.
- TypeScript code fences compile as complete modules with strict checking.
- Real local tarballs include the generated API files and public declarations.
- The same examples compile in an isolated consumer without engine source.

Generation does not install or update SDK dependencies. Package verification
packs offline with lifecycle scripts disabled and writes disposable evidence
outside the source tree. Browser gameplay/visual acceptance belongs to the host
project and is separate from declaration and documentation checks.

See [tool commands and coverage](README.md) for setup and individual checks.
