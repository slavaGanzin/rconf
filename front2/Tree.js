import React from "react";





import { DiCss3, DiJavascript, DiNpm } from "react-icons/di";
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
                : <span className='file' onClick={x => onClick(element)}><FileIcon filename={element.name} />{element.name}</span>}
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

const FileIcon = ({ filename }) => {
  const extension = filename.slice(filename.lastIndexOf(".") + 1);
  switch (extension) {
    case "js":
      return <DiJavascript color="yellow" className="icon" />;
    case "css":
      return <DiCss3 color="turquoise" className="icon" />;
    case "json":
      return <FaList color="yellow" className="icon" />;
    case "yaml":
      return <SiYaml color="orange" className="icon" />;
    case "conf":
      return <GrConfigure color="white" className="icon" />;
    case "Dockerfile":
      return <SiDocker color="#0db7ed" className="icon" />;
    case "npmignore":
      return <DiNpm color="red" className="icon" />;
    default:
      return null;
  }
};

export default DirectoryTreeView;
