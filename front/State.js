import {Observable} from './observable'

window.State = Observable({})

State.files = {}
ws.emit('file:list')
ws.on('file:list', f => {
  State.files = f
  State.selectedFile = f[0]
})

ws.on('file:save', () => {})

State.log = []
ws.on('log', log => State.log.push(log))
ws.on('log:today', logs => {
  State.log = uniqBy(x => x.message+x.time, concat(logs, State.log))
})
ws.emit('log:today')

State.nodes = {}
ws.on('node', n => {
  State.nodes[n.id] = mergeLeft(n, State.nodes[n.id] || {})
})
