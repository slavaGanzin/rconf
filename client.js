const {getDiff, every, detectLanguage, joinPath, run, calculateHash, coerceArray, which, mkdirp, dirname, fs} = require('./helpers')
const {generateClientConfig} = require('./config')

module.exports = queryUrl => {
  const URL = new (require('url').URL)(queryUrl)
  let [_,token] = split('/', URL.pathname)
  let tags = null
  let id = null

  require('./ws').connect('ws://'+URL.host+'/Sync', {
    connect: emit => {},
    'config:ask': emit => {
      if (tags) emit({config: {id, platform, token, tags, hash: calculateHash(conf)}})
    },
    tags: async (emit, tags) => {
      if (!tags) await generateClientConfig(tags).then(x => {
        tags = x.tags
        id = x.id
      })
      emit({config: {id, platform, token, tags, hash: calculateHash(conf)}})
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
}
