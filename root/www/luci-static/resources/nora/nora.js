/* global E */
'use strict';

(function(window) {
	function notify(ui, msg, level) {
		ui.addNotification(null, E('p', msg), level || 'info');
	}

	function collectSection(formId, keys) {
		var form = document.getElementById(formId);
		var obj = {};

		if (!form)
			return obj;

		keys.forEach(function(k) {
			var name = 'cbid.nora.config.' + k;
			var el = form.querySelector('[name="' + name + '"]');

			if (!el)
				return;

			obj[k] = el.type === 'checkbox' ? el.checked : el.value;
		});

		return obj;
	}

	window.Nora = window.Nora || {};
	window.Nora.notify = notify;
	window.Nora.collectSection = collectSection;
})(window);
