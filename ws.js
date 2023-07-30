const { map, mapObjIndexed } = require('ramda')
const WS = require('ws')
const decode = JSON.parse
const encode = JSON.stringify

const connect = (host, events) => {
  console.log({connect: host})

  let ws = new WS(host, { rejectUnauthorized: false })
  ws.on('error', error => {
    console.error(error)
    ws.onclose()
  })

  ws.connected = () => ws.readyState < 2

  const emit = x => ws.send(encode(x))

  // const pingInterval = setInterval(() => ws.readyState == WS.OPEN && emit({status: new Date()}), 1000)

  ws.onclose = once(() => {
    // clearInterval(pingInterval)
    // clearInterval(updateTimeout.timeout)
    console.log(`disconnected ${host}`)
    events.disconnect && events.disconnect(emit)
    setTimeout(() => connect(host, events), 1000)
  })

  // const updateTimeout = time => {
  //   updateTimeout.timeout && clearTimeout(updateTimeout.timeout)
  //   return updateTimeout.timeout = setTimeout(ws.onclose, time)
  // }
  // // updateTimeout.timeout = updateTimeout(60000)

  ws.on('open', function open() {
    console.log(`connected ${host}`)
    events.connect && events.connect(emit)
    // updateTimeout(10000)
  })

  ws.on('message', function message(data) {
    // updateTimeout(10000)
    data = decode(data)
    console.log(data)
    for (const k of Object.keys(data)) {
      if (!events[k]) console.error(`no handler for ${k}`)
      events[k](emit, data[k])
    }
  })
  return ws
}

const initWSServer = app => {
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
}


module.exports = {connect, initWSServer}
