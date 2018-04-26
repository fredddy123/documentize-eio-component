#!/usr/bin/env node

const fs = require('fs');
const { resolve } = require('path');
const util = require('util');
const ncp = require('ncp');
const rimraf = require('rimraf');
const exec = util.promisify(require('child_process').exec);
const generateJsdocFromJsonschema = require('./jsonschema-to-jsdoc.js');

(async () => {
  // const { stderr: rmRfApiDocs } = await exec('rm -rf ./api_docs');
  //
  // if (rmRfApiDocs) {
  //   throw rmRfApiDocs;
  // }

  rimraf.sync(resolve(process.cwd(), './api_docs'));

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

  const actions = fs.readdirSync(resolve(process.cwd(), './actions_copy')).filter(i => i !== 'index.js')

  for (const actionName of actions) {
    const pathToAction = resolve(process.cwd(), `./actions_copy/${actionName}`);
    const fileContent = fs.readFileSync(pathToAction).toString();

    if (!fileContent.includes('// @documentize')) {
      continue;
    }

    const path = resolve(process.cwd(), `./lib/schemas/${actionName.replace('js', 'in.json')}`);

    const jsonSchema = require(path);

    const jsdoc = generateJsdocFromJsonschema(jsonSchema);

    const componentJSON = require(resolve(process.cwd(), './component.json'));

    const action = componentJSON.actions[actionName.replace('.js', '')];

    if (!action) {
      throw {
        message: `action "${actionName.replace('.js', '')}" does not exist in component.json`
      };
    }

    const actionDescription = action.description;

    const jsdocLines = jsdoc.split('\n');
    jsdocLines.splice(1, 0, ` * ${actionDescription}`);

    const resultJSDoc = jsdocLines.join('\n');

    const fileContentWithJSDoc = fileContent.replace('// @documentize', resultJSDoc);
    fs.writeFileSync(pathToAction, fileContentWithJSDoc);
  }


  const { stderr: jsdocErr } = await exec(resolve(process.cwd(), './node_modules/.bin/jsdoc ./actions_copy'));

  if (jsdocErr) {
    throw jsdocErr;
  }

  fs.renameSync(resolve(process.cwd(), './out'), resolve(process.cwd(), './api_docs'));

  // const { stdout, stderr: mvDocsErr } = await exec('mv ./out ./api_docs');
  //
  // if (mvDocsErr) {
  //   throw mvDocsErr;
  // }

  rimraf.sync(resolve(process.cwd(), './actions_copy'));

  // const { stderr: rmRfErr } = await exec('rm -rf ./actions_copy');
  //
  // if (rmRfErr) {
  //   throw rmRfErr;
  // }
})().then(process.exit, async err => {
  console.error('err', err);
  rimraf.sync(resolve(process.cwd(), './actions_copy'));
});
