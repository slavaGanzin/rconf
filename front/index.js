document.title = `rconf ${window.location.host}`
import React from 'react';
import ReactDOM from 'react-dom';
import {monokaiB} from './themes.js'
import './global.js'
import './WebSocket.js'
import './State.js'
import {Log} from './Log.js'

import {Editor as Monaco} from '@monaco-editor/react';
import Tree from './Tree.js'

window.Editor = {}
window.openFile = null

const onMount = (editor, monaco) => {
  Editor = editor
  monaco.editor.defineTheme('monokai', monokaiB)
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
      ws.emit('file:save', {
        value: ed.getModel().getValue(),
        file: State.selectedFile.name
      })
    },
  });
}

const MonacoEditor = () => {
  useObservable('selectedFile')

  return <Monaco
    height="100vh"
    theme="vs-dark"
    path={State.selectedFile?.name}
    defaultLanguage={State.selectedFile?.metadata?.language[0]}
    defaultValue={State.selectedFile?.metadata?.value}
    onMount={onMount}
  />
}
function App() {
  return <>
      <Tree onClick={x => State.selectedFile = x}/>
      <MonacoEditor/>
      <Log/>
  </>
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
