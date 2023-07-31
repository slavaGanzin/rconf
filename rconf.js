#!/usr/bin/env node-dev

const decode = JSON.parse
const encode = JSON.stringify

for (const f in require('ramda'))
  global[f] = require('ramda')[f]

global.conf = null

const {getDiff, every, detectLanguage, joinPath, run, calculateHash, coerceArray, fs, os, getIPV4Interfaces} = require('./helpers')
const {updateConfig, hasConfig} = require('./config')

global.platform = [os.hostname(), os.arch(), os.platform(), os.release(), os.version()].join('-').replace(/#/gim,'')
// console.log(`platform:\n  ${platform}\n`)

if (process.argv[2]) return require('./client')(process.argv[2])


const express = require('express')
const app = express()
require('./ws').initWSServer(app)

const LOGFILE = joinPath(DATADIR, '.log', (new Date).toISOString().slice(0, 10)+'.json')
const log = (message, ws, broadcastNode = false) => {
  if (ws) message.ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  if (ws && !message.id) message.id=message.ip
  message.time = new Date()
  if (message?.json?.status) {
    message.status = message.json.status
    delete message.json.status
  }
  fs.promises.appendFile(LOGFILE, JSON.stringify(message)+'\r\n')
  console.log(JSON.stringify(message, null, ' '))
  Server.broadcast('log', message)
  if (broadcastNode) Server.broadcast('node', message)
}

for (const p of ['uncaughtException', 'unhandledRejection', 'warning']) {
  process.on(p, (error) => log({id: 'rconf', message: error.message, status: 'error'}))
}

Server.on('connect', ws => Sync.broadcast('config:ask', {}))
Sync.on('connect', ws => {
  ws._emit('tags', uniq(flatten(values(pluck('tag', conf.services)))))
  ws._emit('config:ask', {})
})
Sync.on('disconnect', ws => log({status: 'error', message: 'disconnected'}, ws, true))

Server.on('file:delete', (ws, {file}) => {
  fs.unlink(joinPath(DATADIR, file), console.log)
})

Server.on('file:rename', (ws, {file, to}) => {
  fs.rename(joinPath(DATADIR, file), joinPath(DATADIR, to), console.log)
})

Server.on('file:delete', (ws, {file}) => {
  fs.unlink(joinPath(DATADIR, file), console.log)
})

Server.on('file:save', (ws, {file, value}) => {
  fs.writeFileSync(joinPath(DATADIR, file), value)
  updateConfig()
  Sync.broadcast('config:ask', {})
  return {'status': 'saved'}
})

Server.on('file:list', ws =>
  sortBy(x => x.name == 'rconf.yaml' ? 'A' : x.name[0], map(name => ({name, metadata: {
    language: detectLanguage(name),
    value: fs.readFileSync(joinPath(DATADIR, name), 'utf8')
  }}), reject(x => x == '.log', fs.readdirSync(DATADIR))))
)

Server.on('log:today', (ws, message) =>
  reject(isEmpty, fs.readFileSync(LOGFILE, 'utf8').split(/$\n/gim)).map(x => JSON.parse(x.replace(/$\n/gim, '')))
)

Sync.on('log', (ws, message) => log(message, ws, false))

Sync.on('config', (ws, {id, token, tags, platform, hash}) => {
  const ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  const message = {platform, tags, id: id || ip, ip, status: 'ok', time: new Date(), message: 'connected'}

  if (conf.token != token) {
    message.message = 'unathorized'
    message.status = 'error'
    Server.broadcast('node', message)
    return Server.broadcast('log', message)
  }

  const hasTag = tag => intersection(tags, tag).length

  const c = clone(conf.services)
  mapObjIndexed(({tag, platform}, service) => {
    if (!new RegExp(join('|', platform), 'gim').test(platform) || !hasTag(tag)) delete c[service]
  }, c)

  message.config = c
  Server.broadcast('node', message)

  if (calculateHash(c) == hash) return
  return c
})

const launchServer = () => {
  if (conf?.auth) {
    const basicAuth = require('express-basic-auth')
    app.use([
      basicAuth({ users: conf.auth, challenge: true, }),
      express.static(joinPath(__dirname, 'public'))
    ])
  }
  values(getIPV4Interfaces('^'+conf.networks.join('$|^')+'$')).map(interface =>
    app.listen(14141, interface.address, () => {
      console.log(`${interface.name}:\n  GUI:\n    http://${interface.address}:14141  \n  sync config command:\n    sudo rconf http://${interface.address}:14141/${conf.token}\n`)
    })
  )
}

hasConfig().then(launchServer)
