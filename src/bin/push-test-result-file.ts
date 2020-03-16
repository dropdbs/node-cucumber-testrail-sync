#!/usr/bin/env node
import * as program from 'commander'
import * as path from 'path'
import { ResultSynchronizer, readConfig, CucumberReportParser } from '../index'

let parser = new CucumberReportParser()

program
  .option('--file <String>', 'filename in results directory')
  .parse(process.argv)

const error = (s: string): void => {
  program.outputHelp()
  console.log()
  console.log('Error: ' + s)
  process.exit(1)
}

if (!(<any>program).file || [0, NaN].indexOf((<any>program).file) !== -1) {
  error('<testcase file> is required and must be a string')
}
let config = readConfig()
config.pushResults = true

const resultFile = String((<any>program).file)
let results
try {
  results = require(path.resolve(config.resultsDir, resultFile))
} catch (e) {
  error(
    `<testcase file> error reading file[${path.resolve(
      config.resultsDir,
      resultFile
    )}] exception[${e}]`
  )
}

if (!Array.isArray(results)) {
  error(
    `<testcase file> wrong cucumber format result file ${path.resolve(
      config.resultsDir,
      resultFile
    )}`
  )
}

const scenarios = parser.parseReport(results)

const sync = new ResultSynchronizer(config)
const savePromises = []
for (const scenario of scenarios) {
  savePromises.push(sync.saveTestResult(scenario))
}
Promise.all(savePromises)
  .then(() =>
    sync.readRemoteTestRuns().then(() =>
      sync.pushTestResults().then(function() {
        console.log(`sync done`)
      })
    )
  )
  .catch(e => error(e))
