function generateJsdocFromJsonschema(json, lineLength = 100) {
  function generate(schema, rootName = 'msg', ignoreObject) {
    schema.description = schema.description || 'n/a';
    schema.description = schema.example ? `<strong>(EXAMPLE=${schema.example})</strong> ${schema.description}` : schema.description;
    schema.description = schema.required ? `<strong>(REQUIRED)</strong> ${schema.description}` : schema.description;

    if (schema.type === 'object') {
      let line;

      if (!ignoreObject) {
        line = `@param {Object} ${rootName} - ${schema.description}\n`;
      }

      return Object.entries(schema.properties).reduce((str, [key, value]) => {
        return str + generate(value, `${rootName}.${key}`);
      }, line || '');
    }

    if (['number', 'integer'].includes(schema.type)) {
        return `@param {number} ${rootName} - ${schema.description}\n`;
    }

    if (schema.type === 'string') {
        return `@param {string} ${rootName} - ${schema.description}\n`;
    }

    if (schema.type === 'boolean') {
        return `@param {boolean} ${rootName} - ${schema.description}\n`;
    }

    if (schema.type === 'any') {
        return `@param {*} ${rootName} - ${schema.description}\n`;
    }

    if (schema.type === 'array') {
      const arrayItemType = schema.items.type;

      if (arrayItemType === 'object') {
        return `@param {Object[]} ${rootName} - ${schema.description}\n` + generate(schema.items, `${rootName}[]`, true);
      }

      if (arrayItemType === 'array') {
        return `@param {Array[]} ${rootName} - ${schema.description}\n` + generate(schema.items, `${rootName}[]`, true);
      }

      return `@param {${arrayItemType}[]} ${rootName} - ${schema.description}\n`;
    }

    console.log('schema', schema);
    throw 'schema is not valid';
  }

  const generated = generate(json);

  return `/**\n${generated.split('\n').slice(0, -1).map(i => ' * ' + i).join('\n')}\n*/`
    .split('\n')
    .map(line => {
      if (line.length > lineLength) {
        const numOfLines = (line.length - (line.length % lineLength)) / lineLength + 1;
        return Array(numOfLines).join('.').split('.').reduce((str, _, index) => {
          return str + line.slice(index * lineLength, index * lineLength + lineLength) + (numOfLines - 1 === index ? '' : '\n');
        }, '').replace(/\n\n/, '');
      }

      return line;
    })
    .join('\n');
}

module.exports = generateJsdocFromJsonschema;
