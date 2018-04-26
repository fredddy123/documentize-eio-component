#!/usr/bin/env node

const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const generateJsdocFromJsonschema = require('./jsonschema-to-jsdoc.js');

(async () => {
  const { stderr: rmRfApiDocs } = await exec('rm -rf ./api_docs');

  if (rmRfApiDocs) {
    throw rmRfApiDocs;
  }

  const { stderr: copyErr } = await exec('cp -r ./lib/actions ./actions_copy');

  if (copyErr) {
    throw copyErr;
  }

  const actions = fs.readdirSync('./actions_copy').filter(i => i !== 'index.js')

  for (const actionName of actions) {
    const pathToAction = `./actions_copy/${actionName}`;
    const fileContent = fs.readFileSync(pathToAction).toString();

    if (!fileContent.includes('// @documentize')) {
      continue;
    }

    const jsonSchema = require(`./lib/schemas/${actionName.replace('js', 'in.json')}`);

    const jsdoc = generateJsdocFromJsonschema(jsonSchema);

    const fileContentWithJSDoc = fileContent.replace('// @documentize', jsdoc);
    fs.writeFileSync(pathToAction, fileContentWithJSDoc);
  }


  const { stderr: jsdocErr } = await exec('./node_modules/.bin/jsdoc ./actions_copy');

  if (jsdocErr) {
    throw jsdocErr;
  }

  const { stdout, stderr: mvDocsErr } = await exec('mv ./out ./api_docs');

  if (mvDocsErr) {
    throw mvDocsErr;
  }

  const { stderr: rmRfErr } = await exec('rm -rf ./actions_copy');

  if (rmRfErr) {
    throw rmRfErr;
  }
})().then(process.exit, async err => {
  console.error('err', err);
  await exec('rm -rf ./actions_copy');
});
