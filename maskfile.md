## front
```bash
set -x
find front | entr bun build front/index.js --outfile public/index.js
```

## bin
```bash
pkg --target node18-linux-x64,node18-macos-x64,node18-win-x64 .
```
