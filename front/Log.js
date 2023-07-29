export const Log = () => {
  useObservable('log')

  return <div id='log'>
    <div id='logList'>
      {reverse(State.log).map(x => {
        let diff = []
        if (x?.json?.diff) {
          diff = x.json.diff.map(x => {
            return <div>{x.line} <span className={x.add?'ok':'error'}> {x.add ? '+' : '-'} {x.add || x.remove}</span></div>
          })
        }

        return <div key={x.time} className='fadeIn logLine' onClick={x => x.currentTarget.toggleClass('expanded')}>
          <summary><div className={'status-'+x.status}/> {x.ip || x.id} {x.service ? ` ${x.service}:` : ''}{x.message}</summary>
          <div className='log fadeIn'>{
            values(mapObjIndexed((v,k) => {
              if (k == 'diff') return
              return <><div>{k}</div><pre>{v}</pre></>
            }, x.json))
          }
          {diff ? <pre>{diff}</pre> : ''}
          </div>

        </div>
      })}
    </div>
  </div>
}
