# luci-app-nora

用于在 OpenWrt 上部署和管理 Nora 的 LuCI 应用。

## 功能特性

- 通过 `/etc/config/nora` 使用 UCI 管理 Nora 配置
- 通过 `/etc/init.d/nora` 使用 procd 管理服务
- 提供安装、升级、配置生成和外网访问控制功能
- 在 LuCI 的“服务”菜单中提供 Nora 管理页面
- 支持启停、重启和运行状态查看
- 支持配置监听地址、端口、公开 URL、存储路径和 npm 上游代理
- 可选允许外网访问，启用时仅维护专属的 `firewall.nora` WAN 放行规则
- 支持上传单用户 bcrypt htpasswd 行，认证信息不会写入 UCI
- 支持 `amd64`、`arm64` 和 `armv7`，也可自动识别设备架构

## 软件包结构

- `root/etc/config/nora`：默认 UCI 配置
- `root/etc/init.d/nora`：procd 服务脚本
- `root/usr/libexec/nora-control`：安装、升级、配置生成和外网访问控制脚本
- `root/usr/libexec/rpcd/luci.nora`：供 LuCI 调用的固定 rpcd 方法
- `root/usr/share/ucode/luci/template/nora/*.ut`：按页面拆分的 LuCI 模板视图
- `root/www/luci-static/resources/nora/css/nora.css`：Nora 管理页面样式
- `root/usr/share/luci/menu.d/luci-app-nora.json`：LuCI 菜单项
- `root/usr/share/rpcd/acl.d/luci-app-nora.json`：UCI `nora` 和 ubus `luci.nora` 的访问控制规则
- `po/zh_Hans/nora.po`：简体中文翻译

## 编译

将本目录复制到 OpenWrt 源码树或 SDK，例如：

```sh
package/luci-app-nora
```

然后选择并编译软件包：

```sh
make menuconfig
# LuCI -> Applications -> luci-app-nora
make package/luci-app-nora/compile V=s
```

## 使用说明

- 默认安装目录为 `/opt/nora`，默认监听端口为 `4873`。
- 默认启用认证且关闭匿名读取，初始用户名和密码为 `admin` / `admin`。首次登录后应立即上传新的 bcrypt htpasswd 以更换默认密码。
- npm 上游代理为空时，Nora 以纯私有 npm Registry 模式运行。
- 修改配置后，请先执行“保存并应用”，再生成配置或操作服务。
- 服务启动和前台调试均通过 `NORA_CONFIG_PATH` 指定配置文件，并直接运行 `nora` 二进制。
- 卸载软件包时会保留 `/opt/nora` 下的 Nora 数据。

## 参考文档

- Nora 配置说明：<https://getnora.dev/configuration/settings/>
- Nora 认证说明：<https://getnora.dev/configuration/authentication/>
- Nora 安装说明：<https://getnora.dev/getting-started/installation/>
