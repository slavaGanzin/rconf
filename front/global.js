import * as R from 'ramda'
import idbKvStore from 'idb-kv-store'

for (const f of Object.keys(R))
  window[f] = R[f]

window.idb = idbKvStore('rconf')
window.pp = tap((x, color = 'none') => console.log(`%c${JSON.stringify(x, null, ' ')}`, `color: ${color}`))
window.pe = x => console.error(JSON.stringify(x, null, ' '))
