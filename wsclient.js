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

module.exports = connect
