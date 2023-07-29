import React from "react"
import TreeView, { flattenTree } from "react-accessible-treeview"

function NodeTree({onClick}) {
  useObservable('nodes')
  return (
    <div className='vhalf'>
      <div className="directory">
        <TreeView
          data={flattenTree({name: '', children: values(map(x => ({name: x.id, metadata: x}), State.nodes))})}
          aria-label="directory tree"
          nodeRenderer={({
            element,
            isBranch,
            isExpanded,
            getNodeProps,
            handleSelect,
            level,
          }) => (
            <div key={element.id} {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) }}>
              <div className={'status-'+element.metadata.status}/>
              {console.log(element)}
              {element.name}
              {
                // isBranch
                // ? <>{element.name}</>
                // : <span className='file' onClick={x => onClick(element)}><FileIcon lang={element.metadata.language} filename={element.name} />{element.name}</span>
              }
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default NodeTree;