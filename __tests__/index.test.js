const { transform, batchTransform } = require('../lib')

const DEFAULT_CONFIG = {
  cwd: __dirname,
  write: false,
}

it('simple', async () => {
  const ret = await transform({
    ...DEFAULT_CONFIG,
    schemaPath: 'fixtures/simple.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})

it('doc & i18n', async () => {
  const ret = await transform({
    ...DEFAULT_CONFIG,
    locale: 'zh-CN',
    schemaPath: 'fixtures/doc.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})

it('merge md', async () => {
  const ret = await transform({
    ...DEFAULT_CONFIG,
    locale: 'zh-CN',
    schemaPath: 'fixtures/merge-md.json',
    outputPath: 'docs/config/README.md',
  })

  expect(ret).toMatchSnapshot()
})

it('batchTransform', async () => {
  const configs = [
    {
      schemaPath: 'fixtures/simple.json',
      outputPath: 'docs/config/README.md',
    },
    {
      locale: 'zh-CN',
      schemaPath: 'fixtures/doc.json',
      outputPath: 'docs/config/README.md',
    }
  ]


  const ret = await batchTransform({
    ...DEFAULT_CONFIG,
    configs,
  })

  const ret1 = await transform({
    ...DEFAULT_CONFIG,
    ...configs[0]
  })

  const ret2 = await transform({
    ...DEFAULT_CONFIG,
    ...configs[1]
  })

  expect(ret[0]).toEqual(ret1)
  expect(ret[1]).toEqual(ret2)
})
