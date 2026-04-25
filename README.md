# XS Switch

XS Switch 是一个部署在服务器本机的 Xray 订阅节点切换面板。它通过 Web 页面刷新订阅、解析节点、做 TCP 连通性检测，并把选中的节点写入服务器上的 Xray 配置文件。

## 功能

- 保存订阅链接
- 拉取并解析 `vmess`、`vless`、`trojan`、`ss` 节点
- 节点搜索、协议筛选、TCP 延迟检测
- 一键替换指定 Xray outbound
- 写配置前备份为 `config.json.bak`
- 切换后执行重启命令，默认 `systemctl restart xray`
- 可配置管理密码

## 本地开发

```bash
npm install
npm run dev
```

开发时打开：

```text
http://127.0.0.1:3000
```

## 服务器环境变量

```bash
export XSWITCH_ADMIN_PASSWORD='换成强密码'
export XSWITCH_DATA_DIR='/var/lib/xswitch'
export XSWITCH_XRAY_CONFIG='/usr/local/etc/xray/config.json'
export XSWITCH_OUTBOUND_TAG='proxy'
export XSWITCH_RESTART_COMMAND='systemctl restart xray'
```

说明：

- `XSWITCH_ADMIN_PASSWORD`：管理密码。不设置时 API 不鉴权，只建议本地开发使用。
- `XSWITCH_DATA_DIR`：保存订阅 URL 和节点缓存。
- `XSWITCH_XRAY_CONFIG`：要修改的 Xray 配置文件。
- `XSWITCH_OUTBOUND_TAG`：切换时替换的 outbound tag。你的 Xray 路由应指向这个 tag。
- `XSWITCH_RESTART_COMMAND`：切换后执行的重启命令。设置为空字符串可跳过重启。

## 构建和运行

```bash
npm run build
HOSTNAME=127.0.0.1 PORT=3000 npm run start
```

建议只监听服务器本机地址，然后通过 SSH 隧道访问：

```bash
ssh -L 3000:127.0.0.1:3000 root@你的服务器IP
```

本地浏览器打开：

```text
http://127.0.0.1:3000
```

## 权限

运行 XS Switch 的用户需要能够：

- 读取和写入 `XSWITCH_XRAY_CONFIG`
- 在同目录创建 `config.json.bak`
- 执行 `XSWITCH_RESTART_COMMAND`
- 写入 `XSWITCH_DATA_DIR`

如果不想用 root 运行，可以为固定命令配置 sudo，例如只允许执行：

```text
systemctl restart xray
```

然后把环境变量改成：

```bash
export XSWITCH_RESTART_COMMAND='sudo systemctl restart xray'
```

## 验证

```bash
npm run lint
npm run build
```
