const { transform } = require('../lib')

it('simple', async () => {
  const ret = await transform({
    cwd: __dirname,
    schemaPath: 'fixtures/simple.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})

it('doc & i18n', async () => {
  const ret = await transform({
    cwd: __dirname,
    locale: 'zh-CN',
    schemaPath: 'fixtures/doc.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})

it('merge md', async () => {
  const ret = await transform({
    cwd: __dirname,
    locale: 'zh-CN',
    schemaPath: 'fixtures/merge-md.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})
