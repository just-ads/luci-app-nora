include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nora
PKG_VERSION:=1.0.6
PKG_RELEASE:=1
PKG_PO_VERSION:=$(PKG_VERSION)-r$(PKG_RELEASE)

LUCI_TITLE:=LuCI support for Nora private npm registry
LUCI_DESCRIPTION:=Manage Nora on OpenWrt with LuCI, rpcd and procd
LUCI_DEPENDS:=+rpcd +uci +ca-bundle

define Package/$(PKG_NAME)/preinst
#!/bin/sh

if [ -z "$${IPKG_INSTROOT}" ] && [ -f /etc/config/nora ]; then
	rm -rf /tmp/luci-app-nora.config.backup >/dev/null 2>&1 || true
	mkdir -p /tmp/luci-app-nora.config.backup >/dev/null 2>&1 || true
	cp -fp /etc/config/nora /tmp/luci-app-nora.config.backup/nora >/dev/null 2>&1 || true
	if [ -x /etc/init.d/nora ] && /etc/init.d/nora running >/dev/null 2>&1; then
		: > /tmp/luci-app-nora.was-running
	else
		rm -f /tmp/luci-app-nora.was-running >/dev/null 2>&1 || true
	fi
fi

exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh

merge_old_nora_config() {
	local backup_dir='/tmp/luci-app-nora.config.backup'
	local option value

	[ -f "$${backup_dir}/nora" ] || return 1
	command -v uci >/dev/null 2>&1 || return 1

	uci -q get nora.config >/dev/null 2>&1 || uci set nora.config=main >/dev/null 2>&1 || return 1
	uci -c "$${backup_dir}" show nora.config 2>/dev/null | sed -n "s/^nora\.config\.\([^=]*\)=.*/\1/p" | while IFS= read -r option; do
		[ -n "$${option}" ] || continue
		value="$$(uci -c "$${backup_dir}" get "nora.config.$${option}" 2>/dev/null)" || continue
		uci set "nora.config.$${option}=$${value}" >/dev/null 2>&1 || true
	done
	uci commit nora >/dev/null 2>&1 || return 1
}

chmod 0755 "$${IPKG_INSTROOT}/etc/init.d/nora" >/dev/null 2>&1 || true
chmod 0755 "$${IPKG_INSTROOT}/usr/libexec/nora-control" >/dev/null 2>&1 || true
chmod 0755 "$${IPKG_INSTROOT}/usr/libexec/nora-run" >/dev/null 2>&1 || true
chmod 0755 "$${IPKG_INSTROOT}/usr/libexec/rpcd/luci.nora" >/dev/null 2>&1 || true

default_htpasswd="$${IPKG_INSTROOT}/opt/nora/config/users.htpasswd"
mkdir -p "$$(dirname "$${default_htpasswd}")" || exit 1
if [ ! -e "$${default_htpasswd}" ]; then
	umask 077
	printf '%s\n' 'admin:$$2y$$05$$hSaqV85sGAQOXFRHx/CB0.wKjECPR/Yk70YdDVdw/g0LiEfPVmRSK' > "$${default_htpasswd}" || exit 1
fi
chmod 0600 "$${default_htpasswd}" >/dev/null 2>&1 || true

if [ -z "$${IPKG_INSTROOT}" ]; then
	if [ -f /tmp/luci-app-nora.config.backup/nora ]; then
		merge_old_nora_config || logger -t luci-app-nora "failed to merge existing Nora UCI config during postinst"
		rm -rf /tmp/luci-app-nora.config.backup >/dev/null 2>&1 || true
		if [ -x /usr/libexec/nora-control ]; then
			render_output="$$(/usr/libexec/nora-control render-nora-config 2>&1)" || logger -t luci-app-nora "failed to render Nora config during postinst: $${render_output}"
		fi
		if [ -f /tmp/luci-app-nora.was-running ] && [ -x /etc/init.d/nora ]; then
			/etc/init.d/nora restart >/dev/null 2>&1 || logger -t luci-app-nora "failed to restart Nora after package upgrade"
		fi
		rm -f /tmp/luci-app-nora.was-running >/dev/null 2>&1 || true
	elif [ -x /etc/init.d/nora ]; then
		/etc/init.d/nora enable >/dev/null 2>&1 || logger -t luci-app-nora "failed to enable Nora at boot during postinst"
	fi
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* >/dev/null 2>&1 || true
	/etc/init.d/rpcd reload >/dev/null 2>&1 || true
fi

exit 0
endef
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/prerm
#!/bin/sh

if [ "$${1:-remove}" != "upgrade" ] && [ -z "$${IPKG_INSTROOT}" ] && [ -x /etc/init.d/nora ]; then
	/etc/init.d/nora stop >/dev/null 2>&1 || true
	/etc/init.d/nora disable >/dev/null 2>&1 || true
	rm -f /etc/init.d/nora >/dev/null 2>&1 || true
	uci -q delete firewall.nora >/dev/null 2>&1 || true
	uci commit firewall >/dev/null 2>&1 || true
	/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1 || true
fi

exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh

if [ "$${1:-remove}" != "upgrade" ]; then
	rm -f "$${IPKG_INSTROOT}/etc/init.d/nora" >/dev/null 2>&1 || true
	rm -f "$${IPKG_INSTROOT}/etc/config/nora" >/dev/null 2>&1 || true
	rm -f "$${IPKG_INSTROOT}/usr/libexec/nora-run" >/dev/null 2>&1 || true
	rm -f "$${IPKG_INSTROOT}"/etc/rc.d/*nora >/dev/null 2>&1 || true

	if [ -z "$${IPKG_INSTROOT}" ]; then
		rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* >/dev/null 2>&1 || true
		/etc/init.d/rpcd reload >/dev/null 2>&1 || true
	fi
fi

exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
