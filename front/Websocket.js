// import {decode, encode} from "@msgpack/msgpack"

const decode = JSON.parse
const encode = JSON.stringify

if (!window.ws) window.ws ={}
ws.URL = ws.URL || `${(window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.replace(/\/$/, '')}/${window.Connection || 'Server'}`
ws.socket = new WebSocket(ws.URL)
ws.inBuffer = []
ws.socket.onmessage = ws.inBuffer.push
window.ws.socket.binaryType = 'arraybuffer'
ws.events = {}
ws.outBuffer = []
ws.pingInterval = () => {}
ws.connected = () => path(['socket', 'readyState'], ws) == 1
ws.checkOffline = () => {
  // I.offline.toggle(!navigator.onLine || ws.socket.readyState !== 1)
  ws.connect()
  if (ws.socket.readyState < 2) return
  ws.socket.close()
  ws.connect()
}

if (navigator.connection) { //Doesnt' work in Safari
  navigator.connection.addEventListener('change', ws.checkOffline)
}

ws.reconnectionInterval = () => {}

ws.setReconnectInterval = () => {
  clearInterval(ws.reconnectionInterval)
  if (ws.noreconnection) return

  ws.checkOffline()
  ws.reconnectionInterval = setInterval(ws.checkOffline, 500)
}

ws.connect = () => {
  if (ws.socket.readyState > ws.socket.OPEN)
    ws.socket = new WebSocket(ws.URL)

  // ws.socket.binaryType = 'arraybuffer'

  ws.socket.onopen = () => {
    pp('connect', 'green')
    // clearInterval(ws.pingInterval)
    // ws.pingInterval = setInterval(() => ws.connected() && ws.socket.send(JSON.parse({ping: new Date()})), 10000)
    // ws.checkOffline()
    map(x => x(), ws.events.connect || [])
  }

  ws.socket.onmessage = message => {
    try {
      const data = decode(message.data)

      for (const event in data) {
        if (!ws.events[event]) {
          pe({error: `No handler for '${event}'`, data}, 'red')
          continue
        }

        for (let f of ws.events[event])
          f(data[event])
      }
    } catch (e) {
      console.error(e, message.data)
    }
  }

  setTimeout(() => map(ws.socket.onmessage, ws.inBuffer), 100)
  ws.sendOfflineBuffer()

  ws.socket.onclose = () => console.log('ws:closed')
  ws.socket.onerror = console.error.data
  return ws
}

ws.emit = (e, data = {}) => {
  const [event, ...options] = e.split(/\s+/)
  const silent = includes('silent', options)

  if (ws.connected()) {
    silent || pp({[event]: data}, '#ffcc00')
    ws.socket.send(encode({[event]: data}))
  } else {
    silent || pp({[`${event}: not send`]: data}, '#aa3300')
    ws.outBuffer.push([event, data])
    // idb.set('buffer', ws.outBuffer)
  }

  return ws
}

ws.on = (message, f) => {
  const [event, ...options] = message.split(/\s+/)
  const silent = includes('silent', options)

  ws.events[event] = concat(defaultTo([], ws.events[event]), [
    silent ? f : (...args) => {
      pp({[event]: args}, 'green')
      f(...args)
    },
  ])
  return ws
}

ws.off = (message, f) => {
  ws.events[message] = difference(ws.events[message], [f])
  return ws
}

ws.QA = (event, f) => {
  ws.on(event, composeP(ws.emit(event), f))
  return ws
}


ws.sendOfflineBuffer = () => {
  if (!ws.outBuffer.length || !ws.connected()) return

  // pp({outBuffer: ws.outBuffer})
  map(([event, data]) => ws.emit(event, data), ws.outBuffer)
  ws.outBuffer = []
  // idb.set('buffer', ws.outBuffer)
}

// idb.get('buffer')
  // .then((buffer = []) => ws.outBuffer = uniq(reject(isNil, concat(ws.outBuffer, buffer))))
  // .then(ws.sendOfflineBuffer)

window.addEventListener('error', ({colno, lineno, filename, error}) => {
  ws.emit('browser:error', `${filename}:${lineno} ${colno}\n${error}`)
  console.error(`${filename}:${lineno} ${colno}`, error)
})

window.addEventListener('unhandledrejection', e => {
  ws.emit('browser:error', `${JSON.stringify(e)}${e.reason}`)
  console.error(e)
})

ws.setReconnectInterval()
