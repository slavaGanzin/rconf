const {getDiff, every, detectLanguage, joinPath, run, calculateHash, coerceArray, mkdirp} = require('./helpers')
const {dirname} = require('path')
const fs = require('fs')
const yaml = require('yaml')

const inquirer = require('inquirer')

mkdirp(joinPath(DATADIR, '.log'))
const confFile = joinPath(DATADIR, 'rconf.yaml')


const updateConfig = () => {
  const c = yaml.parse(fs.readFileSync(confFile, 'utf-8'))

  mapObjIndexed((v, k) => {
     v.name = v.name || k
     v.tag = coerceArray(v.tag || ['any'])
     v.platform = coerceArray(v.platform || ['.*'])
     v.files = mapObjIndexed((f, name) => {
       if (is(String, f)) f = {path: f}
       try {
         f.content = fs.readFileSync(joinPath(DATADIR, name), 'utf-8')
       } catch (e) {
         Server.broadcast('log', {status:'error', time: new Date(), message: e.message})
         return
       }
       return f
     }, v.files)
  }, c.services)

  conf = c
}

const hasConfig = async () => {
  try {
    fs.statSync(confFile)
  } catch (e) {
    await generateConfig()
  }

  updateConfig()
  return Promise.resolve()
}

const generateConfig = async () => {
    fs.writeFileSync(confFile, `token: ${calculateHash(Math.random())}
  auth:
    admin: admin

  services: {}
  `)
}

module.exports = {updateConfig, hasConfig}
