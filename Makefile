include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-template
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for Template App
LUCI_DESCRIPTION:=A minimal LuCI application template for OpenWrt
LUCI_DEPENDS:=+rpcd +uci
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/prerm
#!/bin/sh

if [ -z "$${IPKG_INSTROOT}" ] && [ -x /etc/init.d/template ]; then
	/etc/init.d/template stop >/dev/null 2>&1 || true
	/etc/init.d/template disable >/dev/null 2>&1 || true
fi

exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh

rm -f "$${IPKG_INSTROOT}/etc/config/template" >/dev/null 2>&1 || true
rm -f "$${IPKG_INSTROOT}"/etc/rc.d/*template >/dev/null 2>&1 || true

if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* >/dev/null 2>&1 || true
	/etc/init.d/rpcd restart >/dev/null 2>&1 || true
fi

exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
