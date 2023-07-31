# rconf

rconf is configuration server with web UI that will sync service configuration to remote machines instantly.

<!-- toc -->
- [Quick start](#quick-start)
- [Cookbook](#cookbook)
  * [join all devices in single vpn network using zerotier](#join-all-devices-in-single-vpn-network-using-zerotier)
<!-- tocstop -->
![](./docs/ui.png)


### Quick start
**install rconf on server machine**
```bash
curl https://i.jpillora.com/slavaGanzin/rconf! | bash
```

**run rconf and configure your server by answering a list of questions**
```bash
$ rconf                                                                                                                               

? Select networks will share your config:
 wlp0s20f3 [192.168.1.85/24]
? Web GUI username: admin
? Web GUI password: admin
? Remote sync token: ea9b50e5de7e17e0ff38f0b7808917acbbe87ca6ce46ee831d5c009bf87a2049
? Daemonize with systemd? No
To install on remote machine:
  curl https://i.jpillora.com/slavaGanzin/rconf! | bash

wlp0s20f3:
  Web UI:
    http://192.168.1.85:14141  
  sync config command:
    rconf http://192.168.1.85:14141/ea9b50e5de7e17e0ff38f0b7808917acbbe87ca6ce46ee831d5c009bf87a2049
```

**open web UI**
```bash
# this is my internal ip, look for your url in your own cli
chromium http://192.168.1.85:14141
```

**edit rconf.yaml in web UI**
uncomment services key: select commented lines and press CTRL+/

```yaml
services:
  #service name
  hello:
    #will work only on machines that selected tag "test" for syncronization
    tag: test
    #will work only on linux machines
    platform: linux
    files:
      #local file hello.sh will be copied to /usr/local/bin/hello.sh on remote machine
      hello.sh: /usr/local/bin/hello.sh
    install:
      #if running \`which hello.sh\` will fail on remote machine - apply \`chmod\`
      hello.sh: chmod +x /usr/local/bin/hello.sh
    #command that will rerun on every update of configuration files
    command: hello.sh world
```
*Press CTLR+S to save!*

**edit hello.sh in Web ui**
```bash
#!/usr/bin/env bash

echo "Hello $1!"
```
*Press CTLR+S to save!*

**copy sync config command from server console and run it**
```bash
$ rconf "http://192.168.1.85:14141/ea9b50e5de7e17e0ff38f0b7808917acbbe87ca6ce46ee831d5c009bf87a2049"

? Node id: node1
? Select tags to sync:
 test
? Daemonize with systemd? No
✔ run: hello.sh world
Hello world!
```

### Cookbook

#### join all devices in single vpn network using zerotier
```yaml
services:
  zerotier-linux:
    tag: zerotier-network1
    platform: linux
    install:
      zerotier-cli: curl -s https://install.zerotier.com | sudo bash
    command: zerotier-cli join network1
```
