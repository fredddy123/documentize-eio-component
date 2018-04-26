#!/usr/bin/env node

const fs = require('fs');
const { resolve } = require('path');
const util = require('util');
const ncp = require('ncp');
const rimraf = require('rimraf');
const exec = util.promisify(require('child_process').exec);
const generateJsdocFromJsonschema = require('./jsonschema-to-jsdoc.js');

(async () => {
  const { stderr: rmRfApiDocs } = await exec('rm -rf ./api_docs');

  if (rmRfApiDocs) {
    throw rmRfApiDocs;
  }

  // const { stderr: copyErr } = await exec('cp -r ./lib/actions ./actions_copy');
  //
  // if (copyErr) {
  //   throw copyErr;
  // }

  await new Promise((resolve, reject) => {
    ncp('./lib/actions', './actions_copy', err => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  })

  const actions = fs.readdirSync('./actions_copy').filter(i => i !== 'index.js')

  for (const actionName of actions) {
    const pathToAction = `./actions_copy/${actionName}`;
    const fileContent = fs.readFileSync(pathToAction).toString();

    if (!fileContent.includes('// @documentize')) {
      continue;
    }

    const path = resolve(process.cwd(), `./lib/schemas/${actionName.replace('js', 'in.json')}`);

    const jsonSchema = require(path);

    const jsdoc = generateJsdocFromJsonschema(jsonSchema);

    const fileContentWithJSDoc = fileContent.replace('// @documentize', jsdoc);
    fs.writeFileSync(pathToAction, fileContentWithJSDoc);
  }


  const { stderr: jsdocErr } = await exec('./node_modules/.bin/jsdoc ./actions_copy');

  if (jsdocErr) {
    throw jsdocErr;
  }

  fs.renameSync('./out', './api_docs');

  // const { stdout, stderr: mvDocsErr } = await exec('mv ./out ./api_docs');
  //
  // if (mvDocsErr) {
  //   throw mvDocsErr;
  // }

  rimraf.sync('./actions_copy');

  // const { stderr: rmRfErr } = await exec('rm -rf ./actions_copy');
  //
  // if (rmRfErr) {
  //   throw rmRfErr;
  // }
})().then(process.exit, async err => {
  console.error('err', err);
  rimraf.sync('./actions_copy');
});
