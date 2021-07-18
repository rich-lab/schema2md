const path = require('path')
const merge = require('lodash.merge')
const yaml = require('js-yaml')
const { ensureDirSync, existsSync, writeFile, readFile } = require('fs-extra')
const { DEFAULT_DOC_CONFIG } = require('./config')
const escapeHTML = (str) =>
  str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }[tag])
  )

/**
 * Get a simple i18n function.
 *
 * @param {object} jsonschema
 * @return {Function}
 */

function getI18nFn(jsonSchema) {
  return (path) => {
    if (!path) {
      return jsonSchema
    }

    const paths = path.split('.')
    let result = jsonSchema
    try {
      while (paths.length) {
        result = result[paths.shift()]
      }
    } catch (error) {
      return `i18n_${path}`
    }

    return result
  }
}

/**
 * Parse merge content and get a object with
 * heading as key and following content as content
 *
 * @param {string} md
 * @return {object}
 */

function parseSchemaMarkdown(md) {
  if (!md) {
    return {}
  }

  const HEADING_REG = /^#+\s+(.*)/
  let currentKey = ''

  return md.split('\n').reduce((memo, line) => {
    const matched = line.match(HEADING_REG)
    if (matched) {
      currentKey = matched[1].trim()
    } else if (currentKey) {
      line = line.trim()
      if (memo[currentKey]) {
        memo[currentKey] += `\n${line}`
      } else {
        memo[currentKey] = line
      }
    }

    return memo
  }, {})
}

/**
 * Resolve the path of merged markdown.
 *
 * @param {string|undefine} schemaMarkdown
 * @param {string} abSchemaPath
 * @return {string|undefine}
 */

function resolveSchemaMarkdownPath(schemaMarkdown, abSchemaPath) {
  if (!schemaMarkdown) {
    schemaMarkdown = abSchemaPath.replace(/.json$/, '.md')
  }
  return schemaMarkdown
}

/**
 * Resolve content of merged markdown
 *
 * @param {object} schemaTask
 * @return {Promise<string>}
 */

function resolveSchemaMarkdown(schemaMarkdown, abSchemaPath) {
  schemaMarkdown = resolveSchemaMarkdownPath(schemaMarkdown, abSchemaPath)
  if (existsSync(schemaMarkdown)) {
    return readFile(schemaMarkdown, 'utf-8')
  }
  return ''
}

/**
 * Trim a string safely
 *
 * @param {any} str
 * @return {string}
 */
function safeTrim(str) {
  return (str && str.trim()) || ''
}

/**
 * Normalize a pth to a absolute path.
 *
 * @param {string} cwd
 * @param {string} apath
 */

function normalizePath(cwd, apath) {
  return path.isAbsolute(apath) ? apath : path.join(cwd, apath)
}

/**
 * Batch transform
 *
 * @param {string} cwd
 * @param {string} locale
 * @param {boolean} write
 * @param {object} configs
 * @return {Promise<Array<string>>}
 */

async function batchTransform({
  cwd = process.cwd(),
  locale,
  write = true,
  configs = [],
}) {
  return Promise.all(
    configs.map((config) => {
      return transform({
        cwd,
        write,
        locale,
        ...config,
      })
    })
  )
}

/**
 * Transform JSON Schema to markdown.
 *
 * @param {string} cwd
 * @param {array|object} src
 * @return {Promise<void>}
 */

async function transform({
  cwd = process.cwd(),
  schemaPath,
  locale = 'en-US',
  schemaMarkdown,
  frontmatter = '',
  heading = '',
  outputPath,
  write = true,
}) {
  const abSchemaPath = normalizePath(cwd, schemaPath)
  delete require.cache[abSchemaPath]
  const schemaJson = require(abSchemaPath)

  const { title, description, properties, doc = {} } = schemaJson

  let docConfig = { ...DEFAULT_DOC_CONFIG }
  docConfig = merge(docConfig, doc)

  const $$ = getI18nFn(docConfig.locales[locale])

  const schemaMarkdownContent = await resolveSchemaMarkdown(
    schemaMarkdown,
    abSchemaPath
  )
  const mergedContentObject = parseSchemaMarkdown(schemaMarkdownContent)

  frontmatter = safeTrim(frontmatter)
  if (frontmatter) {
    frontmatter = '\n\n' + frontmatter
  }

  heading = safeTrim(heading)
  if (heading) {
    heading = '\n\n' + heading
  }
  const markdown = `${frontmatter ? `${frontmatter}\n\n` : ''}# ${title}
 
${description}
${heading ? `${heading}\n` : ''}
${Object.keys(properties)
  .map((key) => {
    return getPropertyContent({
      key,
      property: properties[key],
      $i18n: $$,
      extraContent: mergedContentObject[key],
    })
  })
  .join('\n\n')}
    `.trim()

  if (write && outputPath) {
    const abOutputPath = normalizePath(cwd, outputPath)
    console.log(`generate doc for ${schemaPath}`)
    ensureDirSync(path.dirname(abOutputPath))
    await writeFile(abOutputPath, markdown, 'utf-8')
  }
  return markdown
}

/**
 * Check if a property is a object.
 *
 * @param property
 * @return {boolean}
 */

function isObjectProperty(property) {
  return Boolean(property.type === 'object' || property.properties)
}

/**
 * Get property content
 *
 * @param {string} key
 * @param {object} property
 * @param {function} $i18n
 * @return {string}
 */

function getPropertyContent({ key, property, $i18n, extraContent = '' }) {
  const { doc = {} } = property
  const { props = {} } = doc
  const extraPropsContent = Object.keys(props)
    .reduce((memo, propKey) => {
      memo.push(`- ${$i18n(`props.${propKey}`)}: ${escapeHTML(props[propKey])}`)
      return memo
    }, [])
    .join('\n')

  /**
   * Inject extra property description for object-typed property.
   */
  if (isObjectProperty(property) && property.properties) {
    console.log(property.properties)
    extraContent =
      `
${$i18n('objectFieldsDesc')}：

${Object.keys(property.properties)
  .map((key) => {
    return `- \`${key}\`: ${escapeHTML(property.properties[key].description)}`
  })
  .join('-')}
    ` + extraContent
  }

  let propertyValueFormat = ''
  if (property.format) {
    propertyValueFormat = `- ${$i18n(`props.format`)}: ${property.format}`
  }

  return `
## ${key}

- ${$i18n(`props.type`)}: \`${resolveTypeText(property)}\`
- ${$i18n(`props.description`)}: ${escapeHTML(property.description)}
${propertyValueFormat}
${extraPropsContent}
${getPropertyExamples(property, $i18n)}
${extraContent}
  `.trim()
}

/**
 * Get examples text for property
 *
 * @param {object} property
 * @param {format} "yaml" | "json"
 * @return {string}
 */
function getPropertyExamples(property, $i18n) {
  if (property.examples) {
    // check if this is an object and display in code block. otherwise, display inline
    let examplesMarkdown = ''
    if (typeof property.examples[0] == 'object') {
      examplesMarkdown = property.examples
        .map((example) => '``` yaml\n' + yaml.dump(example) + '\n```\n')
        .join('\n')
    } else {
      // not an object. render as tags
      examplesMarkdown = property.examples
        .map((example) => '`' + example + '`')
        .join(' ')
    }

    return `
- ${$i18n(`props.examples`)}:
${examplesMarkdown}    
    `
  }
}
/**
 * Get display text for type.
 *
 * @param {object} property
 * @param {boolean} wrap
 * @return {*}
 */

function resolveTypeText(property, wrap = false) {
  let type = property.type || property.typeof
  if (Array.isArray(type)) {
    type = type.join(' | ')
  }
  if (property.enum) {
    type = property.enum.map((v) => `"${v}"`).join(' | ')
  }

  if (isObjectProperty(property) && property.properties) {
    type = `{ ${Object.keys(property.properties)
      .map(
        (propKey) =>
          `${propKey}: ${resolveTypeText(property.properties[propKey])}`
      )
      .join(`, ${wrap ? '\n' : ''}`)} }`
  }

  return type
}

module.exports = {
  transform,
  batchTransform,
  normalizePath,
  resolveSchemaMarkdownPath,
}
