const path = require('path')
const merge = require('lodash.merge')
const {ensureDirSync, existsSync, writeFile, readFile} = require('fs-extra')
const {DEFAULT_DOC_CONFIG} = require('./config')

/**
 * Get a simple i18n function.
 *
 * @param {object} jsonschema
 * @return {Function}
 */

function getI18nFn(jsonSchema) {
  return path => {
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

function parseMergedMarkdown(md) {
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
 * Resolve content of merged markdown
 *
 * @param {object} schemaTask
 * @return {Promise<string>}
 */

function resolveMergedMarkdown(schemaMarkdown, abSchemaPath) {
  if (!schemaMarkdown) {
    schemaMarkdown = abSchemaPath.replace(/.json$/, '.md')
  }
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
  configs = []
}) {
  return Promise.all(
    configs.map(config => {
      return transform({
        cwd,
        write,
        locale,
        ...config
      })
    })
  )
}

/**
 * Transform JSON Schema to markdown.
 *
 * @param {string} cwd
 * @param {array|obkect} src
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
  write = true
}) {
  const abSchemaPath = normalizePath(cwd, schemaPath)
  delete require.cache[abSchemaPath]
  const schemaJson = require(abSchemaPath)

  const {title, description, properties, doc = {}} = schemaJson

  let docConfig = {...DEFAULT_DOC_CONFIG}
  docConfig = merge(docConfig, doc)

  const $$ = getI18nFn(docConfig.locales[locale])

  const mergedMarkdown = await resolveMergedMarkdown(
    schemaMarkdown,
    abSchemaPath
  )
  const mergedContent = parseMergedMarkdown(mergedMarkdown)

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
  .map(key => {
    return getPropertyContent({
      key,
      property: properties[key],
      $i18n: $$,
      extraContent: mergedContent[key]
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

function getPropertyContent({key, property, $i18n, extraContent = ''}) {
  const {doc = {}} = property
  const {props = {}} = doc
  const extraPropsContent = Object.keys(props)
    .reduce((memo, propKey) => {
      memo.push(`- ${$i18n(`props.${propKey}`)}: ${props[propKey]}`)
      return memo
    }, [])
    .join('\n')

  /**
   * Inject extra property description for object-typed property.
   */
  if (isObjectProperty(property)) {
    extraContent =
      `
${$i18n('objectFieldsDesc')}：

${Object.keys(property.properties)
  .map(key => {
    return `- \`${key}\`: ${property.properties[key].description}`
  })
  .join('-')}
    ` + extraContent
  }

  return `
## ${key}

- ${$i18n(`props.type`)}: \`${resolveTypeText(property)}\`
- ${$i18n(`props.description`)}: ${property.description}
${extraPropsContent}

${extraContent}
  `.trim()
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
    type = property.enum.map(v => `"${v}"`).join(' | ')
  }

  if (isObjectProperty(property)) {
    type = `{ ${Object.keys(property.properties)
      .map(
        propKey =>
          `${propKey}: ${resolveTypeText(property.properties[propKey])}`
      )
      .join(`, ${wrap ? '\n' : ''}`)} }`
  }

  return type
}

module.exports = {
  transform,
  batchTransform
}
