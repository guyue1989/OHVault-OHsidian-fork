(function () {
	if (window.__ohvDiag) {
		return 'already-installed';
	}
	window.__ohvDiag = true;

	function out(message) {
		try { console.log('[HMOS-DIAG] ' + message); } catch (e) {}
	}
	function bad(message) {
		try { console.error('[HMOS-DIAG] ' + message); } catch (e) {}
	}

	const VARS = [
		'--pele-fg', '--_fg', '--mermaid-text-color', '--text-normal', '--color-base-100',
		'--mermaid-line-color', '--pele-line', '--pele-border', '--pele-muted', '--text-muted'
	];

	function valuesAt(el) {
		const cs = getComputedStyle(el);
		const values = {};
		for (const name of VARS) {
			const value = cs.getPropertyValue(name).trim();
			if (value !== '') {
				values[name] = value;
			}
		}
		return values;
	}

	// Which stylesheet rules define the colours Pelé reads? A theme or snippet
	// that redefines one of them is what breaks the label colour, so the
	// selector and the value have to be reported, not just the resolved value.
	function colorRules() {
		const hits = [];
		for (const sheet of Array.from(document.styleSheets)) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch (e) {
				continue;
			}
			if (!rules) {
				continue;
			}
			const source = sheet.href ? sheet.href.split('/').pop() : 'inline';
			for (const rule of Array.from(rules)) {
				if (!rule.style || !rule.style.getPropertyValue) {
					continue;
				}
				for (const name of ['--pele-fg', '--mermaid-text-color', '--text-normal', '--mermaid-line-color']) {
					const value = rule.style.getPropertyValue(name);
					if (value !== '') {
						hits.push(source + ' | ' + rule.selectorText + ' | ' + name + ': ' + value.trim());
					}
				}
			}
		}
		return hits;
	}

	function report() {
		const svg = document.querySelector('.mermaid svg');
		if (!svg) {
			return 'no diagram';
		}
		const label = svg.querySelector('text.pele-label');
		const edge = svg.querySelector('g.pele-edge-label text');
		const theme = document.getElementById('ohv-diagram-theme');
		const lines = [];
		lines.push('bodyClass=' + document.body.className);
		lines.push('bodyBg=' + getComputedStyle(document.body).backgroundColor);
		lines.push('svgVars=' + JSON.stringify(valuesAt(svg)));
		lines.push('label=' + (label ?
			('fill=' + getComputedStyle(label).fill + ' inline=' + JSON.stringify(label.getAttribute('style') || '')) :
			'n/a'));
		lines.push('edgeLabel=' + (edge ? 'fill=' + getComputedStyle(edge).fill : 'n/a'));
		lines.push('portThemeStyle=' + (theme ? JSON.stringify(theme.textContent.slice(0, 160)) : 'absent'));
		lines.push('colorRules=' + JSON.stringify(colorRules()));
		return lines.join('\n');
	}

	let last = '';
	let ticks = 0;
	const timer = setInterval(function () {
		ticks++;
		let text;
		try {
			text = report();
		} catch (e) {
			bad('report failed: ' + (e && e.stack ? e.stack : e));
			return;
		}
		if (text === last) {
			if (ticks >= 60) {
				clearInterval(timer);
			}
			return;
		}
		last = text;
		out(text);
		if (ticks >= 60) {
			clearInterval(timer);
		}
	}, 5000);

	out('installed');
	return 'installed';
})();
