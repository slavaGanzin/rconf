## front
```bash
set -x
find front | entr bun build front/index.js --outfile public/index.js
```
