import React from "react";

import { DiCss3, DiJavascript, DiNpm } from "react-icons/di";
import {AiOutlineFile} from "react-icons/ai"
import { SiYaml, SiDocker } from "react-icons/si";
import { GrConfigure  } from "react-icons/gr";
import { FaList, FaRegFolder, FaRegFolderOpen } from "react-icons/fa";
import TreeView, { flattenTree } from "react-accessible-treeview";

function DirectoryTreeView({onClick}) {
  const [data, setData] = React.useState(flattenTree({}))

  React.useEffect(() => {
    fetch(window.location.href+'files')
      .then(response => response.json())
      .then(data => {
        setActiveFile(data.children[0])
        console.log(data)
        setData(flattenTree(data))
      })
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div>
      <div className="directory">
        <TreeView
          data={data}
          aria-label="directory tree"
          nodeRenderer={({
            element,
            isBranch,
            isExpanded,
            getNodeProps,
            handleSelect,
            level,
          }) => (
            <div {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) }}>
              {isBranch
                ? <><FolderIcon isOpen={isExpanded} />{element.name}</>
                : <span className='file' onClick={x => onClick(element)}><FileIcon lang={element.metadata.language} filename={element.name} />{element.name}</span>}
            </div>
          )}
        />
      </div>
    </div>
  );
}

const FolderIcon = ({ isOpen }) =>
  isOpen ? (
    <FaRegFolderOpen color="e8a87c" className="icon" />
  ) : (
    <FaRegFolder color="e8a87c" className="icon" />
  );

const langs = {
  'default': AiOutlineFile,
  'dockerfile': SiDocker,
  'yaml': SiYaml,
  'conf': GrConfigure,
  'javascript': DiJavascript,
  'json': FaList,
  'css': DiCss3,
  'npmignore': DiNpm,
}
const FileIcon = ({ lang }) => {
  const Icon = langs[lang[0]] || langs['default']
  return Icon({color: lang[1], className: 'icon'})
};

export default DirectoryTreeView;
