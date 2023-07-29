## front
```bash
set -x
find front | entr bun build front/index.js --outfile public/index.js
```

## release
```bash
rm -rf bin
mkdir bin
version=`fx package.json .version`
# targets=("node18-linux-x64" "node18-macos-x64" "node18-win-x64")
gh release delete v${version} --yes
targets=("linux-x64")
for target in "${targets[@]}"; do
  f=rconf_${version}_${target}
  pkg -t "node18-$target" . --output bin/$f
  cd bin
  tar czf $f.tgz $f
  cd -
done

gh release create v${version} ./bin/*.tgz --title "rconf $version" --generate-notes --latest
```
