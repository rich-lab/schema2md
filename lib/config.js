const DEFAULT_DOC_CONFIG = {
  locales: {
    'zh-CN': {
      objectFieldsDesc: '其中，各个字段的含义如下：',
      props: {
        type: '类型',
        format: 'Format',
        description: '描述',
        level: '级别',
        examples: 'Examples',
      },
    },
    'en-US': {
      objectFieldsDesc: 'The meaning of each field is as follows:',
      props: {
        type: 'Type',
        format: 'Format',
        description: 'Description',
        level: 'level',
        examples: 'Examples',
      },
    },
  },
}

module.exports = {
  DEFAULT_DOC_CONFIG,
}
