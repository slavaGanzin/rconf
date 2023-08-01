# rconf

rconf is configuration server with web UI that will sync service configuration to remote machines instantly.

<!-- toc -->

- [Why?](#why)
- [Quick start](#quick-start)
- [Code execution](#code-execution)
- [Cookbook](#cookbook)
  * [join all devices in single vpn network using zerotier](#join-all-devices-in-single-vpn-network-using-zerotier)

<!-- tocstop -->

![](./docs/ui.png)

### Why?

Puppet, salt, ansible all invent their own languages for configuration. You need to google how to do simpliest things. Why should you, if you can use same commands you are used to?

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

**uncomment services key in rconf.yaml using web UI**
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
*Select commented lines and press CTRL+/*
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

### Code execution
If you need dynamic configuration, i.e. tailored for each host use `{{{return javascript code}}}` in any configuration file (except rconf.yaml). For example:

```
#nginx.conf
http {
    events {
        worker_connections {{{return parseInt(Math.random()*100)}}};
    }
    server {
        listen {{{return rconf.interfaces.eth0.address}}}:3001;
        server_name {{{
            if (rconf.env.HOSTNAME) return rconf.env.HOSTNAME
            return 'default.hostname'
          }};
    }
}
```
Is this secure? No. Use with caution

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
