const {getDiff, every, detectLanguage, joinPath, run, calculateHash, coerceArray, mkdirp, os, getIPV4Interfaces} = require('./helpers')
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
     v.tag = coerceArray(v.tag || ['default'])
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
    await generateServerConfig()
  }

  every(1000, updateConfig)
  return Promise.resolve()
}

const generateServerConfig = () => {
  const networks = map(x => {
    x.name = `${x.name} [${x.cidr}]`
    x.checked = true
    return x
  }, values(getIPV4Interfaces()))

  const token = calculateHash(Math.random())

  return inquirer
    .prompt([
      {type: 'checkbox', name: 'networks', message: 'Select networks will share your config:\n', choices: networks, validate: v => !isEmpty(v)},
      {type: 'input', name: 'user', message: 'Web GUI username:', default: 'admin'},
      {type: 'input', name: 'password', message: 'Web GUI password:', default: 'admin'},
      {type: 'input', name: 'token', message: 'Remote sync token:', default: token},
    ]).then(({networks, user, password, token}) => {

      fs.writeFileSync(confFile, `token: ${token}
networks:
  ${join('\n  ', map(x => replace(/^(.*)\s+.*/, '- $1', x), networks))}
auth:
  ${user}: ${password}

services: {}`)
})
}

const generateClientConfig = tags => {
  return inquirer
    .prompt([
      {type: 'input', name: 'id', message: 'Node id:', default: os.hostname()},
      {type: 'checkbox', name: 'tags', message: 'Select tags to sync:\n', choices: tags, validate: v => !isEmpty(v)},
    ])}


module.exports = {updateConfig, hasConfig, generateClientConfig}
