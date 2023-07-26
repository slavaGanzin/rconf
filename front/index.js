document.title = `rconf ${window.location.host}`
import React from 'react';
import ReactDOM from 'react-dom';
import {monokai} from './themes.js'

import {Editor as Monaco} from '@monaco-editor/react';
import Tree from './Tree.js'

window.Editor = {}
window.openFile = null

const onMount = (editor, monaco) => {
  Editor = editor
  monaco.editor.defineTheme('monokai', monokai)
  monaco.editor.setTheme('monokai');
  editor.addAction({
    id: "save",
    label: "Save",

    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    ],

    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1.5,

    run: function (ed) {
      fetch(window.location.href+'save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          value: ed.getModel().getValue(),
          file: openFile.name
        }),
      })
      .then(response => response.json())
      .then(console.log).catch(console.error)
    },
  });
}

function App() {
  const [file, setFile] = React.useState({});

  window.setActiveFile = setFile
  openFile = file

  return <>
      <Tree onClick={setFile}/>
      <Monaco
        height="100vh"
        theme="vs-dark"
        path={file.name}
        defaultLanguage={file?.metadata?.language[0]}
        defaultValue={file?.metadata?.value}
        onMount={onMount}
      />
  </>
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
