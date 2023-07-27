import * as R from 'ramda'
import idbKvStore from 'idb-kv-store'

for (const f of Object.keys(R))
  window[f] = R[f]

window.idb = idbKvStore('rconf')
window.pp = tap((x, color = 'none') => console.log(`%c${JSON.stringify(x, null, ' ')}`, `color: ${color}`))
window.pe = x => console.error(JSON.stringify(x, null, ' '))

HTMLElement.prototype.toggleClass = function (c, on = !this.classList.contains(c)) {
  if (on == this.classList.contains(c)) return
  this.classList[on ? 'add' : 'remove'](c)
}
