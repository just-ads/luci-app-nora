# luci-app-nora

在 OpenWrt 的 LuCI 中部署和管理 Nora，让路由器可以作为私有 Registries 使用。

## 主要功能

- **可视化安装与运行**：在 LuCI 页面安装 Nora，查看运行状态和当前版本，并执行启动、停止或重启。
- **局域网与外网访问**：自定义服务端口，页面会生成可直接访问的 Nora 地址；需要时可单独开放 WAN 访问。
- **版本更新**：检查并升级 Nora 核心和 LuCI 插件，也支持手动上传 Nora 二进制。
- **多架构支持**：可自动识别设备架构，支持 `amd64`、`arm64` 和 `armv7`。
- **配置管理**：通过表单保存设置，生成并查看 Nora 的最终配置文件。
- **日志查看**：分别查看 Nora 日志和插件操作日志，支持手动刷新、自动刷新和日志大小限制。

## 快速开始

1. 安装 `luci-app-nora` 软件包。
2. 打开 LuCI，进入“服务 → Nora”。
3. 在“版本更新”页面安装适合当前设备的 Nora。
4. 在“插件设置”和“npm Registry”页面完成端口、认证、存储及上游代理配置。
5. 返回“运行状态”页面启动 Nora，并通过页面显示的地址访问 Nora UI。

## 默认设置

- 安装目录：`/opt/nora`
- 访问端口：`4873`
- 默认账号：`admin`
- 默认密码：`admin`
- 登录认证默认开启，匿名读取默认关闭
- npm 上游代理默认为空，此时仅提供私有软件包服务
- WAN 访问默认关闭

首次登录后，请立即在“插件设置”中上传新的 bcrypt htpasswd，替换默认账号密码。

## 数据与卸载

Nora 的软件包、令牌和配置数据默认保存在 `/opt/nora`。卸载 LuCI 插件时会保留该目录，避免误删已有仓库数据；不再需要时可自行备份后清理。

## 编译

将本目录放入 OpenWrt 源码树或 SDK 的 `package/luci-app-nora`，然后执行：

```sh
make menuconfig
# LuCI -> Applications -> luci-app-nora
make package/luci-app-nora/compile V=s
```

## 参考文档

- Nora 配置说明：<https://getnora.dev/configuration/settings/>
- Nora 认证说明：<https://getnora.dev/configuration/authentication/>
- Nora 安装说明：<https://getnora.dev/getting-started/installation/>
