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
       const filename = joinPath(DATADIR, name)
       try { fs.statSync(filename) } catch(e) {
         fs.writeFileSync(filename, '')
         Server.broadcast('file:new', {name, metadata: {
          language: detectLanguage(name),
          value: ''
        }})
       }
       f.content = fs.readFileSync(filename, 'utf-8')
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
      {type: 'input', name: 'user', message: 'Web UI username:', default: 'admin'},
      {type: 'input', name: 'password', message: 'Web UI password:', default: 'admin'},
      {type: 'input', name: 'token', message: 'Remote sync token:', default: token},
      {type: 'confirm', name: 'daemonize', message: 'Daemonize with systemd?', default: true},
      // {type: 'confirm', name: 'openUI', message: 'Open UI?', default: true},
    ]).then(({networks, user, password, token, daemonize, openUI}) => {

      const networkNames = map(x => replace(/^(.*)\s+.*/, '$1', x), networks)

      fs.writeFileSync(confFile, `token: ${token}
networks:
  ${join('\n  ', map(x => `- ${x}`, networkNames))}
auth:
  ${user}: ${password}

#services:
#   #service name
#   hello:
#     #will work only on machines that selected tag "test" for syncronization
#     tag: test
#     #will work only on linux machines
#     platform: linux
#     files:
#       #local file hello.sh will be copied to /usr/local/bin/hello.sh on remote machine
#       hello.sh: /usr/local/bin/hello.sh
#     install:
#       #if running \`which hello.sh\` will fail on remote machine - apply \`chmod\`
#       hello.sh: chmod +x /usr/local/bin/hello.sh
#     #command that will rerun on every update of configuration files
#     command: hello.sh world
`)

  // if (openUI) runopen('http://'+head(values(getIPV4Interfaces('^'+networkNames.join('$|^')+'$'))).address+':14141')
  if (daemonize) return generateSystemdService()
})
}

const generateClientConfig = (tags, url) => {
  return inquirer
    .prompt([
      {type: 'input', name: 'id', message: 'Node id:', default: os.hostname()},
      {type: 'checkbox', name: 'tags', message: 'Select tags to sync:\n', choices: tags, validate: v => !isEmpty(v)},
      {type: 'confirm', name: 'daemonize', message: 'Daemonize with systemd?', default: true},
    ]).then(async x => {
      if (x.daemonize) await generateSystemdService(APPNAME, `${process.argv[0]} ${url} ${x.tags} ${x.id}`)
      return x
    })
}

const generateSystemdService = (name = APPNAME+'d', command=process.argv[0]) => {
  const SYSTEMD = process.env.USER == 'root'
    ? `/etc/systemd/system/${name}.service`
    : `/home/${process.env.USER}/.config/systemd/user/${name}.service`

  const u = process.env.USER == 'root' ? '' : '--user'
  mkdirp(dirname(SYSTEMD))

  fs.promises.writeFile(SYSTEMD, `
[Unit]
Description=${require('./package.json').description}

[Service]
Type=simple
ExecStart=${command}
LimitNOFILE=infinity
Restart=always
SyslogIdentifier=${name}

[Install]
WantedBy=default.target
  `).then(x => {
    run([
      `systemctl ${u} daemon-reload`,
      `systemctl enable ${u} --now ${name}`,
      `sleep 3`,
      `journalctl --output cat ${u} -u  ${name}.service --since '1 minute ago'`
    ], true).finally(() => process.exit())
  }).catch(console.error)
}


module.exports = {updateConfig, hasConfig, generateClientConfig}
