include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nora
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for Nora private npm registry
LUCI_DESCRIPTION:=Manage Nora on OpenWrt with LuCI, rpcd and procd
LUCI_DEPENDS:=+rpcd +uci +ca-bundle

define Package/$(PKG_NAME)/postinst
#!/bin/sh

chmod 0755 "$${IPKG_INSTROOT}/etc/init.d/nora" >/dev/null 2>&1 || true
chmod 0755 "$${IPKG_INSTROOT}/usr/libexec/nora-control" >/dev/null 2>&1 || true
chmod 0755 "$${IPKG_INSTROOT}/usr/libexec/rpcd/luci.nora" >/dev/null 2>&1 || true

default_htpasswd="$${IPKG_INSTROOT}/opt/nora/config/users.htpasswd"
mkdir -p "$$(dirname "$${default_htpasswd}")" || exit 1
if [ ! -e "$${default_htpasswd}" ]; then
	umask 077
	printf '%s\n' 'admin:$2y$05$hSaqV85sGAQOXFRHx/CB0.wKjECPR/Yk70YdDVdw/g0LiEfPVmRSK' > "$${default_htpasswd}" || exit 1
fi
chmod 0600 "$${default_htpasswd}" >/dev/null 2>&1 || true

if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* >/dev/null 2>&1 || true
	/etc/init.d/rpcd restart >/dev/null 2>&1 || true
fi

exit 0
endef
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/prerm
#!/bin/sh

if [ "$${1:-remove}" != "upgrade" ] && [ -z "$${IPKG_INSTROOT}" ] && [ -x /etc/init.d/nora ]; then
	/etc/init.d/nora stop >/dev/null 2>&1 || true
	/etc/init.d/nora disable >/dev/null 2>&1 || true
fi

exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh

if [ "$${1:-remove}" != "upgrade" ]; then
	rm -f "$${IPKG_INSTROOT}/etc/config/nora" >/dev/null 2>&1 || true
	rm -f "$${IPKG_INSTROOT}"/etc/rc.d/*nora >/dev/null 2>&1 || true

	if [ -z "$${IPKG_INSTROOT}" ]; then
		rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* >/dev/null 2>&1 || true
		/etc/init.d/rpcd restart >/dev/null 2>&1 || true
	fi
fi

exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
