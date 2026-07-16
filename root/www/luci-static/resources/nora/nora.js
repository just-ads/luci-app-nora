/* global E */
'use strict';

(function(window) {
	function notify(ui, msg, level) {
		ui.addNotification(null, E('p', msg), level || 'info');
	}

	function collectSection(formId, keys) {
		var form = document.getElementById(formId);
		var fd = new FormData(form);
		var obj = {};

		keys.forEach(function(k) {
			var name = 'cbid.nora.config.' + k;
			var el = form.querySelector('[name="' + name + '"]');
			obj[k] = el && el.type === 'checkbox' ? el.checked : fd.get(name) || '';
		});

		return obj;
	}

	window.Nora = window.Nora || {};
	window.Nora.notify = notify;
	window.Nora.collectSection = collectSection;
})(window);
