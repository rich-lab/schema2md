const merge = require('lodash.merge')
const path = require('path')
const fs = require('fs')
const { DEFAULT_DOC_CONFIG } = require('./config')

/**
 * Get a simple i18n function.
 *
 * @param {object} jsonschema
 * @return {Function}
 */

function getI18nFn(jsonSchema) {
  return path => {
    if (!path) {
      return jsonSchema;
    }

    const paths = path.split('.');
    let result = jsonSchema;
    try {
      while (paths.length) {
        // @ts-ignore
        result = result[paths.shift()];
      }
    } catch (e) {
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
      if (!memo[currentKey]) {
        memo[currentKey] = line
      } else {
        memo[currentKey] += `\n${line}`
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

function resolveMergedMarkdown(schemaTask) {
  let schemaMarkdown
  if (schemaTask.schemaMarkdown) {
    schemaMarkdown = schemaTask.schemaMarkdown
  } else {
    schemaMarkdown = schemaTask.abSchemaPath.replace(/.json$/, '.md')
  }
  if (fs.existsSync(schemaMarkdown)) {
    return fs.readFileSync(schemaMarkdown, 'utf-8')
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
  return str && str.trim() || ''
}

/**
 * Normalize a pth to a absolute path.
 *
 * @param {string} cwd
 * @param {string} apath
 */

function normalizePath(cwd, apath) {
  return path.isAbsolute(apath)
    ? apath
    : path.join(cwd, apath)
}

/**
 * Transform JSON Schema to markdown.
 *
 * @param {string} cwd
 * @param {array|obkect} src
 * @return {Promise<void>}
 */

async function jsonschema2md({
  cwd = process.cwd(),
  src: schemaTasks = [],
  write = true,
}) {
  schemaTasks = Array.isArray(schemaTasks)
    ? schemaTasks
    : [schemaTasks]

  const results = []

  for (const task of schemaTasks) {
    const abSchemaPath = normalizePath(cwd, task.schemaPath)
    const schemaTask = { abSchemaPath, ...task }

    console.log(`generate doc for ${schemaTask.schemaPath}`)

    delete require.cache[schemaTask.abSchemaPath]
    const schemaJson = require(schemaTask.abSchemaPath)

    const { title, description, properties, doc = {} } = schemaJson

    let docConfig = { ...DEFAULT_DOC_CONFIG }
    docConfig = merge(docConfig, doc)

    const { locale = 'en-US' } = schemaTask
    const $$ = getI18nFn(docConfig.locales[locale])

    const mergedMarkdown = resolveMergedMarkdown(schemaTask)
    console.log(mergedMarkdown)
    const mergedContent = parseMergedMarkdown(mergedMarkdown)

    let frontmatter = safeTrim(schemaTask.frontmatter)
    if (frontmatter) {
      frontmatter = '\n\n' + frontmatter
    }

    let heading = safeTrim(schemaTask.heading)
    if (heading) {
      heading = '\n\n' + heading
    }

    const md = `${frontmatter}# ${title}
 
${description}${heading}

${Object.keys(properties).map(key => {
      return getPropertyContent({
        key,
        property: properties[key],
        $i18n: $$,
        extraContent: mergedContent[key]
      })
    }).join('\n\n')
      }
    `.trim()


    if (write) {
      const outputPath = normalizePath(cwd, task.outputPath)

      await fs.writeFile(outputPath, md, 'utf-8')
      console.log(`✅ generate doc at ${task.outputPath}`)
    }

    results.push(md)
  }

  return results.length === 1 ? results[0] : results
}

/**
 * Check if a property is a object.
 *
 * @param property
 * @return {boolean}
 */

function isObjectProperty(property) {
  return !!(property.type === 'object' || property.properties)
}

/**
 * Get property content
 *
 * @param {string} key
 * @param {object} property
 * @param {function} $i18n
 * @return {string}
 */

function getPropertyContent({
  key,
  property,
  $i18n,
  extraContent = ''
}) {

  const { doc = {} } = property
  const { props = {} } = doc
  const extraPropsContent = Object.keys(props).reduce((memo, propKey) => {
    memo.push(`- ${$i18n(`props.${propKey}`)}: ${props[propKey]}`)
    return memo
  }, [])
    .join('\n')

  /**
   * Inject extra property description for object-typed property.
   */
  if (isObjectProperty(property)) {
    extraContent = `
${$i18n('objectFieldsDesc')}：

${Object.keys(property.properties).map(key => {
      return `- \`${key}\`: ${property.properties[key].description}`
    }).join('-')}
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
    type = `{ ${
      Object.keys(property.properties)
        .map(propKey => `${propKey}: ${resolveTypeText(property.properties[propKey])}`)
        .join(`, ${wrap ? '\n' : ''}`)
      } }`
  }

  return type
}

module.exports = {
  jsonschema2md
}
