'use strict';
'require view';
'require form';
'require uci';

return view.extend({
	load: function() {
		return uci.load('template');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('template', _('Template App'), _('A minimal LuCI application template.'));

		s = m.section(form.TypedSection, 'main', _('General Settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'name', _('Name'));
		o.placeholder = 'OpenWrt';
		o.datatype = 'uciname';
		o.rmempty = false;

		return m.render();
	}
});
