
export const Log = () => {
  useObservable('log')

  return <div id='log'>
    <div id='logHeader'>Logs</div>
    <div id='logList'>
      {reverse(State.log).map(x =>
        <details className='fadeIn'>
          <summary>{x.time} {x.ip} {x.service}: {x.message}</summary>
          <div>{values(mapObjIndexed((v,k) => <><div>{k}</div><pre>{v}</pre></>, x.json))}</div>
        </details>)}
    </div>
  </div>
}
