const { exec } = require('child_process')
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')
const mkdirp = require('mkdirp')
const which = require('which')
const {dirname} = require('path')
const diff = require('diff')
const yaml = require('yaml')
const ora = require('ora')

global.APPNAME = 'rconf'

const joinPath = require('path').join

global.DATADIR = {
  'win32': joinPath(process.env.APPDATA || '', APPNAME),
  'darwin': joinPath(os.homedir(), 'Library', 'Application Support', APPNAME),
  'linux': joinPath(os.homedir(), '.'+APPNAME)
}[os.platform()]

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

const run = async (commands, verbose=true) => {
  let last = Promise.resolve()

  for (const command of coerceArray(commands)) {
    const spinner = Spinner({text: 'run: '+command})
    if (verbose) spinner.start()
    last = await new Promise((r,j) => exec(command, (error, stdout, stderr) => {
      if (verbose) {
        spinner[error ? 'fail' : 'succeed']()
        console.log(stdout, stderr)
      }
      r({stdout, stderr, status: error ? 'error' : 'ok'})
    }))
  }

  return last
}

const calculateHash = (obj) => {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(obj))
  return hash.digest('hex')
}

const coerceArray = x => unless(is(Array), of, x)

const getIPV4Interfaces = (match = '.*') =>
  reject(isNil, mapObjIndexed((interfaces, name)=> {
    const interface = find(x => x.family == 'IPv4' && !x.internal && new RegExp(match).test(name), interfaces)
    if (!interface) return null
    interface.name = name
    return interface
  }, os.networkInterfaces()))

const pp = (x) => {
  console.log(yaml.stringify(x))
  return x
}

const Spinner = compose(ora, mergeRight({
  text: 'connecting',
  color: 'green',
  spinner: {interval: 380, frames: [ "⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷" ] }
}))


module.exports = {getDiff, every, detectLanguage, joinPath, run, calculateHash, coerceArray, which, mkdirp, dirname, fs, os, getIPV4Interfaces, pp, Spinner}
