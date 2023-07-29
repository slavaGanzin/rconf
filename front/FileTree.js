import React from "react";

import { DiCss3, DiJavascript, DiNpm, DiMarkdown } from "react-icons/di";
import {AiOutlineFile} from "react-icons/ai"
import { SiPowershell, SiYaml, SiDocker } from "react-icons/si";
import { GrConfigure  } from "react-icons/gr";
import { FaGear, FaList, FaRegFolder, FaRegFolderOpen } from "react-icons/fa6";
import TreeView, { flattenTree } from "react-accessible-treeview";

function FileTree({onClick}) {
  useObservable('files')
  return (
    <div className='vhalf' >
      <div className="directory">
        <TreeView
          data={flattenTree({name: '', children: State.files})}
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
  'markdown': DiMarkdown,
  'ini': FaGear,
  'shell':SiPowershell,
}
const FileIcon = ({ lang }) => {
  const Icon = langs[lang[0]] || langs['default']
  return Icon({color: lang[1], className: 'icon'})
};

export default FileTree;
