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
const platform = [os.hostname(), os.arch(), os.platform(), os.release(), os.version()].join('-').replace(/#/gim,'')
const coerceArray = x => unless(is(Array), of, x)

console.log(`Match this node platform: ${platform}`)

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
    needle('get', queryUrl+`?platform=${platform}&hash=${hash}`).then(({body, statusCode}) => {
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
      v.tag = coerceArray(v.tag || ['any'])
      v.platform = coerceArray(v.platform || ['.*'])
      v.files = mapObjIndexed((v,k) => {
        v.content = fs.readFileSync(joinPath(DATADIR, k), 'utf-8')
        return v
      }, v.files)
  }, c.services)

  conf = c
})

const express = require('express')
const app = express()

const path = require('path')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())

app.post('/save', (res, req) => {
  fs.writeFileSync(joinPath(DATADIR, res.body.file), res.body.value)
  req.json({'status': 'saved'})
})

app.get('/files', (res, req) => {
  req.json({name: '', children: map(name => ({name, metadata: {
    language: 'yaml',
    value: fs.readFileSync(joinPath(DATADIR, name), 'utf8')
  }}), fs.readdirSync(DATADIR))})
})

app.get('/:token/:tags', (req, res) => {
  const {token, tags} = req.params
  const {platform='.*', hash=''} = req.query

  const ip = req.ip.replace(/.*:(.*)/, '$1')

  if (conf.token != token) {
    console.error(`${ip} unathorized token:${token}`)
    return res.status(401).end()
  }

  const hasTag = tag => test(new RegExp(tags), tag.join(','))

  const c = clone(conf.services)
  mapObjIndexed(({tag, platform}, service) => {
    if (!new RegExp(join('|', platform), 'gim').test(platform) || !hasTag(tag)) delete c[service]
  }, c)

  if (calculateHash(c) == hash) return res.status(304).end()
  console.error(`${ip} updated tags:${tags}`)
  res.json(c)
})


app.listen(14141, () => {
  mapObjIndexed((interfaces, name) => {
    const interface = find(x => x.family == 'IPv4', interfaces)
    console.log(`GUI: http://${interface.address}:14141\nTo sync config run on remote machine in "${name}" network:\nsudo rconf http://${interface.address}:14141/${conf.token}/any\n`)
  }, os.networkInterfaces())
})
