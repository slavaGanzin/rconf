#!/usr/bin/env node-dev

const os = require('os')
const hostname = os.hostname()
const yaml = require('yaml')
const fs = require('fs')
const needle = require('needle')
const crypto = require('crypto')
const mkdirp = require('mkdirp')
const {dirname} = require('path')
const { exec } = require('child_process')
const which = require('which')
const platform = [os.hostname(), os.arch(), os.platform(), os.release(), os.version()].join('-').replace(/#/gim,'')
const coerceArray = x => unless(is(Array), of, x)
const decode = JSON.parse
const encode = JSON.stringify

for (const f in require('ramda'))
  global[f] = require('ramda')[f]
const every = (ms, fn) => {
 fn()
 return setInterval(fn, ms)
}

const languages = reject(isNil, values(mapObjIndexed((v,name) => {
  const m = concat(v.extensions || [], v.filenames || [])
  if (isEmpty(m)) return
  return [name.toLowerCase(), v.color, new RegExp(m.map(x => x.replace('.', '\\.').replace(/\+/gim, '\\+')).join('$|')+'$' || 'dont match anything', 'gim')]
}, require('./languages.json'))))

const detectLanguage = file => {
  return (languages.find(x => x[2].test(file)) || ['yaml', 'orange'])
}

console.log(`Match this node:\n  ${platform}\n`)

const joinPath = require('path').join

const APPNAME = 'rconf'
global.DATADIR = {
  'win32': joinPath(process.env.APPDATA || '', APPNAME),
  'darwin': joinPath(os.homedir(), 'Library', 'Application Support', APPNAME),
  'linux': joinPath(os.homedir(), '.'+APPNAME)
}[os.platform()]

const run = (command) => new Promise((r,j) => exec(command, (error, stdout, stderr) => {
  if (error) return j({stdout, stderr, error})
  r({stdout, stderr})
}))

function calculateHash(obj) {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(obj))
  return hash.digest('hex')
}

let conf = null

const queryUrl = process.argv[2]

if (queryUrl) {
  const URL = new (require('url').URL)(queryUrl)
  const [_,token, tags] = split('/', URL.pathname)
  console.log(URL)
  require('./wsclient')('ws://'+URL.host+'/Sync', {
    connect: emit => {
      emit({config: {platform, token, tags, hash: calculateHash(conf)}})
    },
    config: (emit, update) => {
      const prevConf = clone(conf)
      conf = update

      const log = (service, message, json) => {
        console.log({service, message, json})
        emit({log: {message, service, json}})
      }

      mapObjIndexed(async (s, service) => {
        if (calculateHash(propOr({}, service, prevConf)) == calculateHash(s)) return

        log(service, 'changed', {})
        for (const f of values(s.files)) {
          mkdirp.sync(dirname(f.path))

          if (tryCatch(fs.statSync, () => false)(f.path) && calculateHash(fs.readFileSync(f.path,'utf8')) == calculateHash(f.content)) continue
          fs.writeFileSync(f.path, f.content)
          log(service, 'file:updated', {path: f.path})
        }

        await Promise.all(values(mapObjIndexed((install, check) => which(check).catch(() => {
          run(install).then(x => log(service, 'install', x))
        }), s.install || {})))

        if (s.command) {
          run(s.command).then(x => log(service, 'command', x))
        }

      }, conf)
    }
  })
  return

  // setInterval(() => {
  //   const hash = calculateHash(conf)
  //   needle('get', queryUrl+`?platform=${platform}&hash=${hash}`).then(({body, statusCode}) => {
  //     console.log(statusCode)
  //     if (statusCode == 200) {
  //       const prevConf = clone(conf)
  //       conf = body
  //
  //       mapObjIndexed((s, service) => {
  //         if (calculateHash(propOr({}, service, prevConf)) == calculateHash(s)) return
  //         console.log(`${service}: changed`)
  //         for (const f of values(s.files)) {
  //           mkdirp.sync(dirname(f.path))
  //
  //           if (tryCatch(fs.statSync, () => false)(f.path) && calculateHash(fs.readFileSync(f.path,'utf8')) == calculateHash(f.content)) continue
  //           fs.writeFileSync(f.path, f.content)
  //           console.log(`${service}: ${f.path} updated`)
  //         }
  //
  //         Promise.all(values(mapObjIndexed((install, check) => which(check).catch(() => {
  //           console.log(`${service}: install ${install}`)
  //           run(install)
  //         }), s.install || {})))
  //
  //         if (s.command) {
  //           console.log(`${service}: run ${s.command}`)
  //           run(s.command)
  //         }
  //
  //       }, conf)
  //     }
  //   })
  // }, 1000)
  //
  // return
}

const confFile = joinPath(DATADIR, 'rconf.yaml')

try {
  fs.statSync(confFile)
} catch (e) {
  mkdirp(dirname(confFile))
  fs.writeFileSync(confFile, `token: ${calculateHash(Math.random())}
auth:
  admin: admin

services: {}
`)
}

const updateConfig = () => {
  const c = yaml.parse(fs.readFileSync(confFile, 'utf-8'))

  mapObjIndexed((v, k) => {
     v.name = v.name || k
     v.tag = coerceArray(v.tag || ['any'])
     v.platform = coerceArray(v.platform || ['.*'])
     v.files = mapObjIndexed((f, name) => {
       if (is(String, f)) f = {path: f}
       f.content = fs.readFileSync(joinPath(DATADIR, name), 'utf-8')
       return f
     }, v.files)
  }, c.services)

  conf = c
}

every(1000, updateConfig)

const express = require('express')
const app = express()
const basicAuth = require('express-basic-auth')
//
// app.get('/:token/:tags', (req, res) => {
//   const {token, tags} = req.params
//   const {platform='.*', hash=''} = req.query
//   console.log({token, tags})
//
//   const ip = req.ip.replace(/.*:(.*)/, '$1')
//
//   if (conf.token != token) {
//     console.error(`${ip} unathorized token:${token}`)
//     return res.status(401).end()
//   }
//
//   const hasTag = tag => tags == 'any' ? true : test(new RegExp(tags), tag.join(','))
//
//   const c = clone(conf.services)
//   mapObjIndexed(({tag, platform}, service) => {
//     if (!new RegExp(join('|', platform), 'gim').test(platform) || !hasTag(tag)) delete c[service]
//   }, c)
//
//   if (calculateHash(c) == hash) return res.status(304).end()
//   console.error(`${ip} updated tags:${tags}`)
//   res.json(c)
// })



if (conf?.auth) {
  app.use([
    // basicAuth({ users: conf.auth, challenge: true, }),
    express.static(joinPath(__dirname, 'public'))
  ])
}

// app.use(express.json())

const expressWs = require("express-ws")(app)
for (const name of ['Sync', 'Server']) {
  global[name] = {
    sockets: [],
    events:  {},
    on: (e, f) => {
      const [event, ...options] = e.split(' ')
      const silent = includes('silent', options)
      const permissions = without('silent', options)

      global[name].events[event] = concat(defaultTo([], global[name].events[event]), [
        (ws, ...args) => {
          // for (const p of permissions)
          //   if (!includes(p, dotPath('user.permissions', ws)))
          //     return console.log('no permission', p, dotPath('user.permissions', ws))

          if (!silent) console.log({[event]: args})

          return f(ws, ...args)
        }
      ])
    },
    onMessage: ws => x => {
      const message = decode(x)

      for (const event of Object.keys(message)) {
        if (!global[name].events[event])
          return console.error(`No ws handler for  ${event}`)

        for (const f of global[name].events[event]) {
          Promise.resolve(f(ws, message[event]))
            .then(data => {
              if (!isNil(data)) ws._emit(event, data)
            })
            .catch(error => {
              ws._emit(`${event}:error`, error)
              console.error(event, error)
            })
        }
      }
    },
    broadcast: (event, data) => {
//TODO: check permissions!


      console.log(event, data, pluck('user', global[name].sockets))
      global[name].sockets.map(socket => socket._emit(event, data))
    }
  }

  app.ws('/'+name, function(ws, req) {
    ws._emit = (event, data) => {
      try {
        ws.send(encode({[event]: data}))
      }catch (e) {
        if (/Unrecognized object/.test(String(e)))
          console.log(data)
        else
          console.log(e, {[event]: data})
      }
    }

    ws.on('message', global[name].onMessage(ws))
    global[name].sockets.push(ws)
    console.log(name, 'connected')
  });

  global[name].on('browser:error', (_, x) => console.error(x))
}


Server.on('file:save', (ws, {file, value}) => {
  fs.writeFileSync(joinPath(DATADIR, file), value)
  updateConfig()
  Sync.broadcast('connect', {})
  return {'status': 'saved'}
})

Server.on('file:list', ws =>
  sortBy(x => x.name == 'rconf.yaml' ? 'A' : x.name[0], map(name => ({name, metadata: {
    language: detectLanguage(name),
    value: fs.readFileSync(joinPath(DATADIR, name), 'utf8')
  }}), fs.readdirSync(DATADIR)))
)

Sync.on('log', (ws, message) => {
  message.ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  message.time = new Date()
  console.log(JSON.stringify(message, null, ' '))
  Server.broadcast('log', message)
})


Sync.on('config', (ws, {token, tags, platform, hash}) => {
  console.log(token, tags, hash)
  const ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  // app.get('/:token/:tags', (req, res) => {
  //   const {token, tags} = req.params
  //   const {platform='.*', hash=''} = req.query
  //   console.log({token, tags})
  //
  //   const ip = req.ip
  //
  if (conf.token != token) {
    // log(`unathorized token:${token}`, ip)
    return {unathorized: token}
  }

  const hasTag = tag => tags == 'any' ? true : test(new RegExp(tags), tag.join(','))

  const c = clone(conf.services)
  mapObjIndexed(({tag, platform}, service) => {
    if (!new RegExp(join('|', platform), 'gim').test(platform) || !hasTag(tag)) delete c[service]
  }, c)

  if (calculateHash(c) == hash) return
  return c
})


app.listen(14141, () => {
  mapObjIndexed((interfaces, name) => {
    const interface = find(x => x.family == 'IPv4' && !x.internal, interfaces)
    if (!interface) return
    console.log(`"${name}" network:\n  GUI:\n    http://${interface.address}:14141  \n  sync config command:\n    sudo rconf http://${interface.address}:14141/${conf.token}/any\n`)
  }, os.networkInterfaces())
})
