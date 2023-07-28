
export const Log = () => {
  useObservable('log')

  return <div id='log'>
    <div id='logList'>
      {reverse(State.log).map(x =>
        <>
        <div className='fadeIn logLine' onClick={x => x.currentTarget.toggleClass('expanded')}>
          <summary><div className={'fadeIn status-'+x.status}/> {x.time} {x.ip} {x.service}: {x.message}</summary>
          <div className='log fadeIn'>{values(mapObjIndexed((v,k) => <><div>{k}</div><pre>{v}</pre></>, x.json))}</div>
        </div>
      </>)}
    </div>
  </div>
}
