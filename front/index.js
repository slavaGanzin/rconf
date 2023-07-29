document.title = `rconf ${window.location.host}`
import React from 'react';
import ReactDOM from 'react-dom';
import {rconf} from './themes.js'
import './global.js'
import './WebSocket.js'
import './State.js'
import {Log} from './Log.js'
import {Editor as Monaco} from '@monaco-editor/react';
import FileTree from './FileTree.js'
import NodeTree from './NodeTree.js'

window.Editor = {}
window.openFile = null

const onMount = (editor, monaco) => {
  Editor = editor
  monaco.editor.defineTheme('theme', rconf)
  monaco.editor.setTheme('theme');
  editor.addAction({
    id: "Newfile",
    label: "New File",

    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM,
    ],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1.5,
    run: function (ed) {
      const file = prompt('Enter new filename')
      if (file) {
        ws.emit('file:save', { value: '', file })
        ws.emit('file:list', {})
        State.selectFile(file)
      }
    },
  });

  editor.addAction({
    id: "deletefile",
    label: "Delete File",
    run: function (ed) {
      ws.emit('file:delete', {file: State.selectedFile.name})
      ws.emit('file:list', {})
    },
  });

  editor.addAction({
    id: "rename file",
    label: "Rename File",
    run: function (ed) {
      const to = prompt('Enter new filename')
      if (to) {
        ws.emit('file:rename', {file: State.selectedFile.name, to})
        ws.emit('file:list', {})
        State.selectFile(to)
      }
    },
  });



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
    className='fadeIn'
    path={State.selectedFile?.name}
    defaultLanguage={State.selectedFile?.metadata?.language[0]}
    defaultValue={State.selectedFile?.metadata?.value}
    onMount={onMount}
  />
}
function App() {
  return <>
      <div>
        <FileTree onClick={x => State.selectedFile = x}/>
        <NodeTree  onClick={x => State.selectedNode = x}/>
      </div>
      <MonacoEditor/>
      <Log/>
  </>
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
