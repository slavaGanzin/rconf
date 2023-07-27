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
ws.on('log', console.log)
