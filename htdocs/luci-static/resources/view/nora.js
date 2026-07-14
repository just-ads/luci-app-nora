'use strict';
'require view';
'require form';
'require rpc';
'require uci';
'require ui';

var callStatus = rpc.declare({
	object: 'luci.nora',
	method: 'status',
	expect: { '': {} }
});

var callInstall = rpc.declare({
	object: 'luci.nora',
	method: 'install',
	params: [ 'version' ],
	expect: { '': {} }
});

var callUpgrade = rpc.declare({ object: 'luci.nora', method: 'upgrade', expect: { '': {} } });
var callRenderConfig = rpc.declare({ object: 'luci.nora', method: 'render_config', expect: { '': {} } });
var callStart = rpc.declare({ object: 'luci.nora', method: 'start', expect: { '': {} } });
var callStop = rpc.declare({ object: 'luci.nora', method: 'stop', expect: { '': {} } });
var callRestart = rpc.declare({ object: 'luci.nora', method: 'restart', expect: { '': {} } });
var callSetHtpasswd = rpc.declare({
	object: 'luci.nora',
	method: 'set_htpasswd',
	params: [ 'line' ],
	expect: { '': {} }
});
var callFirewallApply = rpc.declare({ object: 'luci.nora', method: 'firewall_apply', expect: { '': {} } });

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('nora'),
			L.resolveDefault(callStatus(), {})
		]);
	},

	ensureStyle: function() {
		if (document.getElementById('nora-ui-style'))
			return;

		document.head.appendChild(E('style', { 'id': 'nora-ui-style' }, [
			'.nora-tabs{display:flex;gap:.5rem;overflow-x:auto;padding-bottom:.25rem;margin:0 0 1rem 0;scrollbar-width:thin;}',
			'.nora-subtabs{display:flex;gap:.5rem;overflow-x:auto;padding-bottom:.25rem;margin:0 0 .75rem 0;scrollbar-width:thin;}',
			'.nora-tab-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.625rem 1rem;border:1px solid var(--border-color-medium,#c9d0d6);border-radius:6px;background:var(--background-color-primary,#fff);color:inherit;cursor:pointer;white-space:nowrap;text-decoration:none;}',
			'.nora-tab-btn:hover{border-color:var(--primary,#4a90e2);}',
			'.nora-tab-btn:focus,.nora-tab-btn:focus-visible{outline:2px solid var(--primary,#4a90e2);outline-offset:2px;}',
			'.nora-tab-btn[aria-selected="true"]{border-color:var(--primary,#4a90e2);font-weight:600;}',
			'.nora-panel[hidden]{display:none !important;}',
			'.nora-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;}',
			'.nora-card{border:1px solid var(--border-color-medium,#c9d0d6);border-radius:8px;background:var(--background-color-primary,#fff);padding:1rem;}',
			'.nora-card h3,.nora-card h4{margin:0 0 .5rem 0;}',
			'.nora-value{font-size:1.125rem;font-weight:600;word-break:break-word;}',
			'.nora-meta{color:var(--text-color-secondary,#666);margin-top:.375rem;}',
			'.nora-status-ok{color:#2d7d46;}',
			'.nora-status-warn{color:#b06a00;}',
			'.nora-status-stop{color:#b03030;}',
			'.nora-actions{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;}',
			'.nora-actions .btn{min-height:44px;}',
			'.nora-note{margin:.5rem 0 1rem 0;color:var(--text-color-secondary,#666);}',
			'.nora-inline-field{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end;}',
			'.nora-inline-field .cbi-input-text{min-height:44px;min-width:min(100%,28rem);}',
			'.nora-section-stack{display:grid;gap:1rem;}',
			'.nora-map-footer{margin-top:1rem;}',
			'@media (max-width: 640px){.nora-inline-field{align-items:stretch;}.nora-inline-field .cbi-input-text,.nora-inline-field .btn{width:100%;}}'
		]));
	},

	boolText: function(value, onText, offText) {
		return value ? (onText || _('Enabled')) : (offText || _('Disabled'));
	},

	statusClass: function(kind) {
		if (kind === 'ok')
			return 'nora-status-ok';
		if (kind === 'warn')
			return 'nora-status-warn';
		return 'nora-status-stop';
	},

	showResult: function(res, fallback) {
		var text = (res && (res.message || res.error || res.detected_version || res.version || fallback)) || fallback;
		ui.addNotification(null, E('p', text || _('Operation completed')));
	},

	handleAction: function(executor, fallback) {
		var self = this;
		return Promise.resolve(executor()).then(function(res) {
			self.showResult(res, fallback);
			return self.refreshStatus();
		}).catch(function(err) {
			ui.addNotification(null, E('p', String(err)), 'danger');
		});
	},

	setButtonBusy: function(button, busy, busyText) {
		if (!button)
			return;

		if (busy) {
			button.disabled = true;
			button.setAttribute('data-nora-label', button.textContent);
			button.textContent = busyText || _('Loading...');
		}
		else {
			button.disabled = false;
			button.textContent = button.getAttribute('data-nora-label') || button.textContent;
			button.removeAttribute('data-nora-label');
		}
	},

	makeActionButton: function(title, executor, style, busyText) {
		var self = this;
		var button = E('button', {
			'class': 'btn cbi-button ' + (style || 'cbi-button-action'),
			'type': 'button'
		}, [ title ]);

		button.addEventListener('click', function(ev) {
			ev.preventDefault();
			if (button.disabled)
				return;

			self.setButtonBusy(button, true, busyText);
			self.handleAction(executor, title).finally(function() {
				self.setButtonBusy(button, false);
			});
		});

		return button;
	},

	getConfiguredVersion: function() {
		var field = document.querySelector('[name="cbid.nora.config.version"]');
		return field && field.value ? field.value : 'latest';
	},

	refreshStatus: function() {
		var self = this;
		return L.resolveDefault(callStatus(), {}).then(function(status) {
			self.currentStatus = status || {};
			self.syncStatusUI();
			return status;
		});
	},

	renderCard: function(title, valueNode, metaNode) {
		return E('div', { 'class': 'nora-card' }, [
			E('h3', title),
			E('div', { 'class': 'nora-value' }, valueNode),
			metaNode ? E('div', { 'class': 'nora-meta' }, metaNode) : ''
		]);
	},

	buildStatusPanel: function() {
		this.statusCardsNode = E('div', { 'class': 'nora-grid' });
		this.statusActionsNode = E('div', { 'class': 'nora-card' }, [
			E('h3', _('Service actions')),
			E('p', { 'class': 'nora-note' }, _('Use these runtime controls after saving any related configuration changes.')),
			E('div', { 'class': 'nora-actions' })
		]);

		return E('div', { 'class': 'nora-section-stack' }, [
			this.statusCardsNode,
			this.statusActionsNode
		]);
	},

	buildVersionPanel: function(settingsNode) {
		this.versionSummaryNode = E('div', { 'class': 'nora-grid' });
		this.versionActionsNode = E('div', { 'class': 'nora-card' });

		return E('div', { 'class': 'nora-section-stack' }, [
			settingsNode,
			this.versionSummaryNode,
			this.versionActionsNode
		]);
	},

	buildTabShell: function(tabs, prefix) {
		var tabButtons = [];
		var panels = [];
		var shell = E('div');
		var tablist = E('div', { 'class': prefix === 'nora-plugin' ? 'nora-subtabs' : 'nora-tabs', 'role': 'tablist' });
		var activate = function(index) {
			tabButtons.forEach(function(btn, i) {
				var selected = i === index;
				btn.setAttribute('aria-selected', selected ? 'true' : 'false');
				btn.setAttribute('tabindex', selected ? '0' : '-1');
				panels[i].hidden = !selected;
			});
		};

		tabs.forEach(function(tab, index) {
			var panelId = prefix + '-panel-' + index;
			var buttonId = prefix + '-tab-' + index;
			var button = E('button', {
				'class': 'nora-tab-btn',
				'id': buttonId,
				'type': 'button',
				'role': 'tab',
				'aria-controls': panelId,
				'aria-selected': index === 0 ? 'true' : 'false',
				'tabindex': index === 0 ? '0' : '-1'
			}, [ tab.label ]);
			var panel = E('div', {
				'class': 'nora-panel',
				'id': panelId,
				'role': 'tabpanel',
				'aria-labelledby': buttonId,
				hidden: index !== 0
			}, tab.children || []);

			button.addEventListener('click', function() { activate(index); });
			button.addEventListener('keydown', function(ev) {
				var next = index;
				if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown')
					next = (index + 1) % tabButtons.length;
				else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp')
					next = (index + tabButtons.length - 1) % tabButtons.length;
				else if (ev.key === 'Home')
					next = 0;
				else if (ev.key === 'End')
					next = tabButtons.length - 1;
				else
					return;

				ev.preventDefault();
				activate(next);
				tabButtons[next].focus();
			});

			tabButtons.push(button);
			panels.push(panel);
			tablist.appendChild(button);
			shell.appendChild(panel);
		});

		return E('div', {}, [ tablist, shell ]);
	},

	renderStatusCards: function() {
		var self = this;
		var status = this.currentStatus || {};
		var installed = !!status.installed;
		var running = !!status.running;
		var enabled = !!status.enabled;
		var authEnabled = !!status.auth_enabled;

		this.statusCardsNode.innerHTML = '';
		this.statusCardsNode.appendChild(this.renderCard(
			_('Service status'),
			E('span', { 'class': self.statusClass(running ? 'ok' : 'stop') }, running ? _('Running') : _('Stopped')),
			installed ? _('Runtime state detected from the existing Nora service.') : _('Install Nora before starting the service.')
		));

		this.statusCardsNode.appendChild(this.renderCard(
			_('Current version'),
			installed
				? (status.installed_version || _('Detected but version string is unavailable'))
				: this.makeActionButton(_('Install'), function() { return callInstall(self.getConfiguredVersion()); }, 'cbi-button-action', _('Installing...')),
			installed ? _('Detected from the installed Nora binary.') : _('Current version: Install')
		));

		this.statusCardsNode.appendChild(this.renderCard(
			_('Service enabled state'),
			E('span', { 'class': self.statusClass(enabled ? 'ok' : 'warn') }, this.boolText(enabled)),
			enabled ? _('The init service is configured to start automatically.') : _('The init service is not enabled at boot.')
		));

		this.statusCardsNode.appendChild(this.renderCard(
			_('Authentication state'),
			E('span', { 'class': self.statusClass(authEnabled ? (status.htpasswd_present ? 'ok' : 'warn') : 'warn') },
				authEnabled ? (status.htpasswd_present ? _('Enabled with htpasswd') : _('Enabled, waiting for htpasswd')) : _('Disabled')),
			authEnabled ? _('Anonymous read and token behavior are configured below.') : _('Clients can access the registry without authentication.')
		));
	},

	renderStatusActions: function() {
		var status = this.currentStatus || {};
		var installed = !!status.installed;
		var running = !!status.running;
		var actions = this.statusActionsNode.querySelector('.nora-actions');

		actions.innerHTML = '';
		actions.appendChild(this.makeActionButton(_('Refresh status'), function() { return callStatus(); }, 'cbi-button-neutral', _('Refreshing...')));

		if (installed && !running)
			actions.appendChild(this.makeActionButton(_('Start'), function() { return callStart(); }, 'cbi-button-action', _('Starting...')));

		if (installed && running) {
			actions.appendChild(this.makeActionButton(_('Stop'), function() { return callStop(); }, 'cbi-button-negative', _('Stopping...')));
			actions.appendChild(this.makeActionButton(_('Restart'), function() { return callRestart(); }, 'cbi-button-action', _('Restarting...')));
		}
	},

	renderVersionSummary: function() {
		var status = this.currentStatus || {};
		var installed = !!status.installed;
		this.versionSummaryNode.innerHTML = '';
		this.versionSummaryNode.appendChild(this.renderCard(_('Installed status'), E('span', {
			'class': this.statusClass(installed ? 'ok' : 'warn')
		}, installed ? _('Installed') : _('Not installed')), installed ? _('Nora binary detected in the configured install directory.') : _('Install Nora to create the binary in the configured install directory.')));
		this.versionSummaryNode.appendChild(this.renderCard(_('Current installed version'), status.installed_version || (installed ? _('Detected but version string is unavailable') : _('Not installed')), _('Reported by the existing Nora binary.')));
		this.versionSummaryNode.appendChild(this.renderCard(_('Target configured version'), status.version || 'latest', _('This value is used for install or upgrade actions.')));
		this.versionSummaryNode.appendChild(this.renderCard(_('Resolved architecture'), status.resolved_architecture || status.architecture || _('Unknown'), _('Resolved from the current device and configuration.')));
		this.versionSummaryNode.appendChild(this.renderCard(_('Binary path'), status.binary || _('Unavailable'), _('The previous binary is backed up before replacement during install or upgrade.')));
	},

	renderVersionActions: function() {
		var self = this;
		var status = this.currentStatus || {};
		var installed = !!status.installed;
		this.versionActionsNode.innerHTML = '';
		this.versionActionsNode.appendChild(E('h3', installed ? _('Upgrade Nora') : _('Install Nora')));
		this.versionActionsNode.appendChild(E('p', { 'class': 'nora-note' }, installed
			? _('Upgrade uses the target configured version and replaces the current binary after creating a backup of the previous one.')
			: _('Install downloads the target configured version and prepares the Nora binary for first use.')));

		var actions = E('div', { 'class': 'nora-actions' }, [
			this.makeActionButton(installed ? _('Upgrade') : _('Install'), function() {
				return installed ? callUpgrade() : callInstall(self.getConfiguredVersion());
			}, 'cbi-button-action', installed ? _('Upgrading...') : _('Installing...')),
			this.makeActionButton(_('Refresh status'), function() { return callStatus(); }, 'cbi-button-neutral', _('Refreshing...'))
		]);

		this.versionActionsNode.appendChild(actions);
	},

	syncStatusUI: function() {
		if (this.statusCardsNode)
			this.renderStatusCards();
		if (this.statusActionsNode)
			this.renderStatusActions();
		if (this.versionSummaryNode)
			this.renderVersionSummary();
		if (this.versionActionsNode)
			this.renderVersionActions();
	},

	setupHtpasswdCard: function() {
		var self = this;
		var input = E('input', {
			'id': 'nora-htpasswd-line',
			'class': 'cbi-input-text',
			'type': 'password',
			'autocomplete': 'new-password',
			'placeholder': 'user:$2b$12$...'
		});
		var button = this.makeActionButton(_('Upload htpasswd'), function() {
			return callSetHtpasswd(input.value || '').then(function(res) {
				input.value = '';
				return res;
			});
		}, 'cbi-button-action', _('Uploading...'));

		return E('div', { 'class': 'nora-card' }, [
			E('h3', _('Secure htpasswd upload')),
			E('p', { 'class': 'nora-note' }, _('This temporary bcrypt htpasswd input is sent directly to the existing RPC action, never stored in UCI, and is cleared after a successful upload.')),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title', 'for': 'nora-htpasswd-line' }, _('bcrypt htpasswd line')),
				E('div', { 'class': 'cbi-value-field nora-inline-field' }, [ input, button ])
			]),
			E('div', { 'class': 'nora-meta' }, _('Only a single bcrypt htpasswd line is accepted. Plaintext and APR1 are rejected.'))
		]);
	},

	setupConfigActionCards: function() {
		return [
			E('div', { 'class': 'nora-card' }, [
				E('h3', _('Render configuration')),
				E('p', { 'class': 'nora-note' }, _('Render the Nora configuration after saving updated settings when you want to refresh the generated config file immediately.')),
				E('div', { 'class': 'nora-actions' }, [
					this.makeActionButton(_('Render config'), function() { return callRenderConfig(); }, 'cbi-button-neutral', _('Rendering...'))
				])
			]),
			E('div', { 'class': 'nora-card' }, [
				E('h3', _('Firewall actions')),
				E('p', { 'class': 'nora-note' }, _('Apply the firewall rule after saving any firewall-related changes below.')),
				E('div', { 'class': 'nora-actions' }, [
					this.makeActionButton(_('Apply firewall'), function() { return callFirewallApply(); }, 'cbi-button-action', _('Applying...'))
				])
			])
		];
	},

	moveSectionNodes: function(mapNode, groups) {
		var sections = mapNode.querySelectorAll('.cbi-section');
		groups.forEach(function(group, index) {
			if (sections[index])
				group.appendChild(sections[index]);
		});
	},

	render: function(data) {
		var self = this;
		var m, s, o;

		this.currentStatus = data[1] || {};
		this.ensureStyle();

		m = new form.Map('nora', _('Nora'), _('Manage the Nora private npm registry on OpenWrt.'));

		s = m.section(form.NamedSection, 'config', 'main', _('Global service settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable service'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'install_dir', _('Install directory'));
		o.datatype = 'string';
		o.rmempty = false;

		o = s.option(form.Value, 'host', _('Host'));
		o.rmempty = false;

		o = s.option(form.Value, 'port', _('Port'));
		o.datatype = 'port';
		o.rmempty = false;

		o = s.option(form.Value, 'public_url', _('Public URL'));
		o.datatype = 'string';
		o.placeholder = 'https://registry.example.com';
		o.description = _('Leave empty is allowed, but when host is 0.0.0.0 clients may receive unreachable URLs.');

		s = m.section(form.NamedSection, 'config', 'main', _('Authentication settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'auth_enabled', _('Enable authentication'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'anonymous_read', _('Allow anonymous read'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'htpasswd_file', _('htpasswd file'));
		o.rmempty = false;

		o = s.option(form.Value, 'token_storage', _('Token storage'));
		o.rmempty = false;

		s = m.section(form.NamedSection, 'config', 'main', _('npm registry settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'npm_enabled', _('Enable npm registry'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Value, 'npm_proxy', _('Upstream proxy'));
		o.placeholder = 'https://registry.npmjs.org';
		o.description = _('Leave this empty for private packages only.');

		o = s.option(form.Value, 'npm_proxy_timeout', _('Proxy timeout (seconds)'));
		o.datatype = 'uinteger';
		o.rmempty = false;

		o = s.option(form.Value, 'npm_metadata_ttl', _('Metadata TTL (seconds)'));
		o.datatype = 'uinteger';
		o.rmempty = false;

		o = s.option(form.Value, 'storage_path', _('Storage path'));
		o.rmempty = false;

		s = m.section(form.NamedSection, 'config', 'main', _('Firewall settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'firewall_enabled', _('Manage firewall rule'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'firewall_src', _('Source zone'));
		o.description = _('Default is lan. When disabled, only the named firewall section nora is removed.');
		o.rmempty = false;

		s = m.section(form.NamedSection, 'config', 'main', _('Version settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Value, 'version', _('Target version'));
		o.description = _('Use latest or a release such as v0.5.0.');
		o.rmempty = false;

		o = s.option(form.ListValue, 'architecture', _('Architecture'));
		o.value('auto', _('Auto detect'));
		o.value('amd64', 'amd64');
		o.value('arm64', 'arm64');
		o.value('armv7', 'armv7');
		o.rmempty = false;

		return m.render().then(function(mapNode) {
			var formNode = mapNode.querySelector('form') || mapNode;
			var actionsNode = mapNode.querySelector('.cbi-page-actions');
			var configActionCards = self.setupConfigActionCards();
			var pluginSection = E('div', { 'class': 'nora-card' }, [
				E('p', { 'class': 'nora-note' }, _('Save & Apply keeps the npm registry settings in UCI. This phase only exposes npm while leaving room for additional registries later.'))
			]);
			var globalSection = E('div', { 'class': 'nora-card' }, [
				E('p', { 'class': 'nora-note' }, _('Save & Apply after editing service, authentication, or firewall settings.'))
			]);
			var authSection = E('div', { 'class': 'nora-card' });
			var firewallSection = E('div', { 'class': 'nora-card' });
			var versionSettingsSection = E('div', { 'class': 'nora-card' }, [
				E('p', { 'class': 'nora-note' }, _('Save & Apply the target version and architecture before upgrading.'))
			]);
			var pluginTabs = self.buildTabShell([
				{ label: _('npm'), children: [ pluginSection ] }
			], 'nora-plugin');
			var statusPanel = self.buildStatusPanel();
			var configPanel = E('div', { 'class': 'nora-section-stack' }, [
				globalSection,
				authSection,
				firewallSection,
				configActionCards[0],
				self.setupHtpasswdCard(),
				configActionCards[1]
			]);
			var versionPanel = self.buildVersionPanel(versionSettingsSection);

			self.moveSectionNodes(mapNode, [ globalSection, authSection, pluginSection, firewallSection, versionSettingsSection ]);
			var mainTabs = self.buildTabShell([
				{ label: _('Running Status'), children: [ statusPanel ] },
				{ label: _('Plugin Settings'), children: [ pluginTabs ] },
				{ label: _('Configuration Management'), children: [ configPanel ] },
				{ label: _('Version Update'), children: [ versionPanel ] }
			], 'nora-main');

			if (actionsNode)
				formNode.insertBefore(mainTabs, actionsNode);
			else
				formNode.appendChild(mainTabs);

			self.syncStatusUI();

			return mapNode;
		});
	}
});
