# json-schema-2-markdown

[![NPM version](https://badgen.net/npm/v/json-schema-2-markdown)](https://npmjs.com/package/json-schema-2-markdown) [![NPM downloads](https://badgen.net/npm/dm/json-schema-2-markdown)](https://npmjs.com/package/json-schema-2-markdown) [![CircleCI](https://badgen.net/circleci/github/ulivz/json-schema-2-markdown/master)](https://circleci.com/gh/ulivz/json-schema-2-markdown/tree/master)

## Install

```bash
tnpm install json-schema-2-markdown --save
```

## Usage

```js
const { jsonschema2md } = require('json-schema-2-markdown')

jsonschema2md({
  cwd: '...',
  src: [
    { schemaPath: 'foo.json', outputPath: 'foo.md' },
    { schemaPath: 'bar.json', outputPath: 'bar.md' },
  ],
  write: false
})
```

## Example

### Simple 

- Input:

```json
{
  "title": "foo.config.js",
  "description": "My Config File",
  "properties": {
    "type": {
      "description": "TYPE's description",
      "type": "string",
      "enum": [
        "foo",
        "bar"
      ]
    },
    "env": {
      "description": "ENV's description",
      "type": "string"
    }
  }
}
```

Output:

```md
"# foo.config.js
 
My Config File

## type

- Type: `"foo" | "bar"`
- Description: TYPE's description

## env

- Type: `string`
- Description: ENV's description"
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D


## Author

**json-schema-2-markdown** © [ULIVZ](https://github.com/ulivz), Released under the [MIT](./LICENSE) License.<br>


> [github.com/ulivz](https://github.com/ulivz) · GitHub [@ULIVZ](https://github.com/ulivz) · Twitter [@_ulivz](https://twitter.com/_ulivz)


