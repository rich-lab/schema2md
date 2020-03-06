const DEFAULT_DOC_CONFIG = {
  locales: {
    'zh-CN': {
      objectFieldsDesc: '其中，各个字段的含义如下：',
      props: {
        type: '类型',
        description: '描述',
        level: '级别'
      }
    },
    'en-US': {
      objectFieldsDesc: 'The meaning of each field is as follows:',
      props: {
        type: 'Type',
        description: 'Description',
        level: 'level'
      }
    }
  }
}

module.exports = {
  DEFAULT_DOC_CONFIG
}
