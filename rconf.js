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

const joinPath = require('path').join

const APPNAME = 'rconf'
global.DATADIR = {
  'win32': joinPath(process.env.APPDATA || '', APPNAME),
  'darwin': joinPath(os.homedir(), 'Library', 'Application Support', APPNAME),
  'linux': joinPath(os.homedir(), '.'+APPNAME)
}[os.platform()]

const run = (command) => exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing the command: ${error.message}`);
    return;
  }

  if (stderr) {
    console.error(`Command execution produced an error: ${stderr}`);
    return;
  }

  console.log(stdout);
})

function calculateHash(obj) {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(obj))
  return hash.digest('hex')
}

for (const f in require('ramda'))
  global[f] = require('ramda')[f]

const every = (ms, fn) => {
 fn()
 return setInterval(fn, ms)
}

let conf = null


const queryUrl = process.argv[2]

if (queryUrl) {
  setInterval(() => {
    const hash = calculateHash(conf)
    needle('get', queryUrl+'/'+hash).then(({body, statusCode}) => {
      console.log(statusCode)
      if (statusCode == 200) {
        const prevConf = clone(conf)
        conf = body

        mapObjIndexed((s, service) => {
          if (calculateHash(propOr({}, service, prevConf)) == calculateHash(s)) return
          console.log(`${service}: changed`)
          for (const f of values(s.files)) {
            mkdirp.sync(dirname(f.path))

            if (tryCatch(fs.statSync, () => false)(f.path) && calculateHash(fs.readFileSync(f.path,'utf8')) == calculateHash(f.content)) continue
            fs.writeFileSync(f.path, f.content)
            console.log(`${service}: ${f.path} updated`)
          }

          console.log(`${service}: run ${s.restart}`)
          run(s.restart)

        }, conf)
      }
    })
  }, 1000)

  return
}

const confFile = joinPath(DATADIR, 'rconf.yaml')

try {
  fs.statSync(confFile)
} catch (e) {
  mkdirp(dirname(confFile))
  fs.writeFileSync(confFile, `token: ${calculateHash(Math.random())}
services: {}
`)
}
every(1000, () => {
  const c = yaml.parse(fs.readFileSync(confFile, 'utf-8'))

  mapObjIndexed((v, k) => {
      v.name = v.name || k
      v.tag = v.tag || ['any']
      v.files = mapObjIndexed((v,k) => {
        v.content = fs.readFileSync(joinPath(DATADIR, k), 'utf-8')
        return v
      }, v.files)
  }, c.services)

  conf = c
  // console.log(c.services.reticulum)
})

const express = require('express')
const app = express()

app.use(express.static('public'))

app.get('/:token/:tags?/:hash?', (req, res) => {
  const {token, tags, hash} = req.params
  const ip = req.ip.replace(/.*:(.*)/, '$1')

  if (conf.token != token) {
    console.error(`${ip} unathorized token:${token}`)
    return res.status(401).end()
  }

  const hasTag = tag => test(new RegExp(tags), tag.join(','))

  const c = clone(conf.services)
  mapObjIndexed(({tag}, service) => {
    if (!hasTag(tag)) delete c[service]
  }, c)

  if (calculateHash(c) == hash) return res.status(304).end()
  console.error(`${ip} updated tags:${tags}`)
  res.json(c)
})

app.listen(14141, () =>
  mapObjIndexed((interfaces, name) => {
    const interface = find(x => x.family == 'IPv4', interfaces)
    console.log(`sudo rconf http://${interface.address}:14141/${conf.token}/any #${name}\n`)
  }, os.networkInterfaces())
)
