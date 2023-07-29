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
const diff = require('diff');

const getDiff = (f1, f2) => {
  const differences = diff.diffLines(f1, f2);
  let line = 1
  const changes = []
  differences.forEach(part => {
    if (part.added) {
      // const l = last(changes)
      // if (l.remove && l.line == line) {
      //   changes.push({modify: [l.remove, part.value], line})
      //   delete changes[changes.length-2]
      // } else
        changes.push({add: part.value, line})
      line += part.count
    }
    else if (part.removed) {
      changes.push({remove: part.value, line})
    }
    else {
      // console.log(`Unchanged: ${part.value}`);
      line += part.count
    }
  });
  return reject(isNil, changes)
}

// Print the differences to the console


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
  if (error) return r({stdout, stderr, status: 'error'})
  r({stdout, stderr, status: 'ok'})
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
  require('./wsclient')('ws://'+URL.host+'/Sync', {
    connect: emit => {
      emit({config: {platform, token, tags, hash: calculateHash(conf)}})
    },
    'config:ask': emit => {
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

        // log(service, 'changed', {status: 'inprogress'})
        for (const f of values(s.files)) {
          mkdirp.sync(dirname(f.path))

          const prev = tryCatch(fs.readFileSync, () => '')(f.path, 'utf8')

          if (calculateHash(prev) == calculateHash(f.content)) continue
          fs.writeFileSync(f.path, f.content)
          log(service, 'file:updated '+f.path, {status: 'inprogress', diff: getDiff(prev, f.content)})
        }

        await Promise.all(values(mapObjIndexed((install, check) => which(check).catch(() => {
          run(install).then(x => log(service, install, x))
        }), s.install || {})))

        if (s.command) {
          run(s.command).then(x => log(service, s.command, x))
        }

      }, conf)
    }
  })
  return
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

every(1000, updateConfig)

const express = require('express')
const app = express()
const basicAuth = require('express-basic-auth')


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
    events:  {
      connect: [],
      disconnect: []
    },
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


      // console.log(event, data, pluck('user', global[name].sockets))
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
    ws.on('close', () => global[name].events.disconnect.map(x => x(ws)))
    global[name].sockets.push(ws)
    global[name].events.connect.map(x => x(ws))
  });

  global[name].on('browser:error', (_, x) => console.error(x))
}


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

Sync.on('disconnect', ws => {
  const message = {id: ws._socket.remoteAddress.replace(/.*:(.*)/, '$1'), status: 'error', message: 'disconnected', time: new Date()}
  Server.broadcast('node', message)
  Server.broadcast('log', message)
})

mkdirp(joinPath(DATADIR, '.log'))
const LOGFILE = joinPath(DATADIR, '.log', (new Date).toISOString().slice(0, 10)+'.json')

Server.on('log:today', (ws, message) =>
  reject(isEmpty, fs.readFileSync(LOGFILE, 'utf8').split(/$\n/gim)).map(x => JSON.parse(x.replace(/$\n/gim, '')))
)

Sync.on('log', (ws, message) => {
  message.ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  message.time = new Date()
  if (message.json.status) {
    message.status = message.json.status
    delete message.json.status
  }
  fs.promises.appendFile(LOGFILE, JSON.stringify(message)+'\r\n')
  console.log(JSON.stringify(message, null, ' '))
  Server.broadcast('log', message)
})


Sync.on('config', (ws, {token, tags, platform, hash}) => {
  const ip = ws._socket.remoteAddress.replace(/.*:(.*)/, '$1')
  const message = {platform, tags, id: ip, status: 'ok', time: new Date(), message: 'connected'}

  if (conf.token != token) {
    message.message = 'unathorized'
    message.status = 'error'
    return Server.broadcast('log', message)
  }

  Server.broadcast('node', message)
  // Server.broadcast('log', message)

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
