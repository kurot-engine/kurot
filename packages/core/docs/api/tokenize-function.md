# tokenize

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
tokenize(text: string): string[];
```

Split text into locale-aware word / space segments.

Returns plain strings — each string is either a word or a space.
Newlines are NOT included (the caller should split by newlines first).

- Latin: "hello world" → ["hello", " ", "world"]
- Thai:  "สวัสดีครับ"    → ["สวัสดี", "ครับ"]
