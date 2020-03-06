const { transform, batchTransform } = require('../lib')

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

  const defaultConfog = {
    cwd: __dirname,
    write: false,
  }

  const ret = await batchTransform({
    ...defaultConfog,
    configs,
  })

  const ret1 = await transform({
    ...defaultConfog,
    ...configs[0]
  })

  const ret2 = await transform({
    ...defaultConfog,
    ...configs[1]
  })

  expect(ret[0]).toEqual(ret1)
  expect(ret[1]).toEqual(ret2)
})
