# luci-app-template

A minimal OpenWrt LuCI application template using the modern JavaScript view API.

## Files

- `Makefile`: OpenWrt/LuCI package metadata.
- `htdocs/luci-static/resources/view/template.js`: LuCI UI page.
- `root/etc/config/template`: default UCI config.
- `root/etc/init.d/template`: example init script.
- `root/usr/share/luci/menu.d/luci-app-template.json`: menu entry and ACL binding.
- `root/usr/share/rpcd/acl.d/luci-app-template.json`: read/write permissions.
- `Makefile` `prerm/postrm`: stop/disable service, remove related config/residual files, and refresh LuCI/rpcd state during uninstall.
- `po/zh_Hans/template.po`: Simplified Chinese translation sample.

## Build

Copy this directory into the OpenWrt source tree, for example:

```sh
package/luci-app-template
```

Then enable it:

```sh
make menuconfig
# LuCI -> Applications -> luci-app-template
make package/luci-app-template/compile V=s
```

## CI

This template includes a manually triggered GitHub Actions workflow at `.github/workflows/build.yml`.
Run it from the GitHub Actions page with `workflow_dispatch`. It downloads the OpenWrt SDK, copies only this package source into the SDK, builds only `luci-app-template`, and uploads only this package's generated `.ipk` as an artifact.

The default CI target is OpenWrt `23.05.5` for `x86/64`. Adjust `OPENWRT_VERSION` and the matrix target in the workflow if you need other releases or architectures.

## Customize

Rename `template` and `luci-app-template` to your real app name in all files, then extend the UCI options and LuCI form fields as needed.
