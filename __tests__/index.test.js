const { jsonschema2md } = require('../lib')

it('simple', async () => {
  const src = {
    schemaPath: 'fixtures/simple.json',
    outputPath: 'docs/config/README.md',
  }

  const ret = await jsonschema2md({
    src,
    write: false,
    cwd: __dirname
  })

  expect(ret).toMatchSnapshot()
})

it('doc & i18n', async () => {
  const src = {
    locale: 'zh-CN',
    schemaPath: 'fixtures/doc.json',
    outputPath: 'docs/config/README.md',
  }

  const ret = await jsonschema2md({
    src,
    write: false,
    cwd: __dirname
  })

  expect(ret).toMatchSnapshot()
})

it('merge md', async () => {
  const src = {
    locale: 'zh-CN',
    schemaPath: 'fixtures/merge-md.json',
    outputPath: 'docs/config/README.md',
  }

  const ret = await jsonschema2md({
    src,
    write: false,
    cwd: __dirname
  })

  expect(ret).toMatchSnapshot()
})
