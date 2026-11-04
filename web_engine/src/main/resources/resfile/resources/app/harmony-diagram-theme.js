(function () {
	if (window.__ohvDiagramTheme) {
		return 'already-installed';
	}
	if (!document.body) {
		return 'no body';
	}
	window.__ohvDiagramTheme = true;

	function out(message) {
		try { console.log('[HMOS-THEME] ' + message); } catch (e) {}
	}

	function parseColor(value) {
		const text = (value || '').trim();
		if (!text) {
			return null;
		}
		let m = text.match(/^#([0-9a-f]{3,8})$/i);
		if (m) {
			let h = m[1];
			if (h.length === 3 || h.length === 4) {
				h = h.split('').map(function (c) { return c + c; }).join('');
			}
			return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
				h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
		}
		m = text.match(/rgba?\(([^)]+)\)/i);
		if (m) {
			const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
			if (p.length >= 3 && !isNaN(p[0])) {
				return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 && !isNaN(p[3]) ? p[3] : 1];
			}
		}
		return null;
	}

	function luminance(rgb) {
		if (!rgb || rgb[3] === 0) {
			return null;
		}
		const f = function (v) {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
	}

	function contrast(a, b) {
		const l1 = luminance(a);
		const l2 = luminance(b);
		if (l1 === null || l2 === null) {
			return 21;
		}
		const hi = Math.max(l1, l2);
		const lo = Math.min(l1, l2);
		return (hi + 0.05) / (lo + 0.05);
	}

	function toHex(rgb) {
		const part = function (v) {
			const s = Math.max(0, Math.min(255, v | 0)).toString(16);
			return s.length < 2 ? '0' + s : s;
		};
		return '#' + part(rgb[0]) + part(rgb[1]) + part(rgb[2]);
	}

	function pageBackground(el) {
		let node = el;
		while (node && node !== document.documentElement) {
			const c = parseColor(getComputedStyle(node).backgroundColor);
			if (c && c[3] > 0.05) {
				return c;
			}
			node = node.parentElement;
		}
		return parseColor(getComputedStyle(document.body).backgroundColor) || [0, 0, 0, 1];
	}

	// The backdrop of a node label is the node shape itself; edge labels sit
	// on the page background.
	function backdropOf(text, svg) {
		const group = text.closest ? text.closest('g.pele-node') : null;
		if (group) {
			const shape = group.querySelector('rect, path, polygon, circle, ellipse');
			if (shape) {
				const f = parseColor(getComputedStyle(shape).fill);
				if (f && f[3] > 0.05) {
					return f;
				}
			}
		}
		return pageBackground(svg);
	}

	function themeTextColor() {
		const cs = getComputedStyle(document.body);
		const direct = parseColor(cs.getPropertyValue('--text-normal'));
		if (direct) {
			return direct;
		}
		const base = parseColor(cs.getPropertyValue('--color-base-100'));
		if (base) {
			return base;
		}
		return null;
	}

	function themeMutedColor() {
		const cs = getComputedStyle(document.body);
		const direct = parseColor(cs.getPropertyValue('--text-muted'));
		return direct;
	}

	function isDark() {
		if (document.body.classList.contains('theme-dark')) {
			return true;
		}
		if (document.body.classList.contains('theme-light')) {
			return false;
		}
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function styleElement() {
		let st = document.getElementById('ohv-diagram-theme');
		if (!st) {
			st = document.createElement('style');
			st.id = 'ohv-diagram-theme';
			(document.head || document.body).appendChild(st);
		}
		return st;
	}

	// Pelé resolves the label colour through --pele-fg, which Obsidian defines
	// as var(--mermaid-text-color) -> var(--text-normal). A theme or snippet
	// that redefines any link of that chain leaves the label on Pelé's inline
	// fallback (#1f1f1f), which is unreadable on a dark background. Writing the
	// theme's own text colour as a literal, with !important, severs the chain.
	function applyThemeVars() {
		const theme = themeTextColor();
		const dark = isDark();
		const base = theme || (dark ? [218, 218, 218] : [34, 34, 34]);
		const muted = themeMutedColor() || base;
		const st = styleElement();
		const css =
			'html body.theme-dark .mermaid,html body.theme-dark .mermaid svg.pele{--pele-fg:' + toHex(base) + ' !important;}' +
			'html body.theme-light .mermaid,html body.theme-light .mermaid svg.pele{--pele-fg:' + toHex(base) + ' !important;}' +
			'html body.theme-dark .mermaid,html body.theme-dark .mermaid svg.pele{--pele-muted:' + toHex(muted) + ' !important;}' +
			'html body.theme-light .mermaid,html body.theme-light .mermaid svg.pele{--pele-muted:' + toHex(muted) + ' !important;}';
		if (st.textContent !== css) {
			st.textContent = css;
		}
		return base;
	}

	function pickForeground(backdrop) {
		const theme = themeTextColor();
		if (theme && contrast(theme, backdrop) >= 4.5) {
			return theme;
		}
		const candidates = [theme, [218, 218, 218], [34, 34, 34], [255, 255, 255], [0, 0, 0]];
		let best = null;
		let bestRatio = -1;
		for (const c of candidates) {
			if (!c) {
				continue;
			}
			const ratio = contrast(c, backdrop);
			if (ratio > bestRatio) {
				bestRatio = ratio;
				best = c;
			}
		}
		return best;
	}

	// Only labels that actually fail a contrast check are repainted, so a
	// diagram that themes its own colours keeps them.
	function repair() {
		const svgs = document.querySelectorAll('.mermaid svg');
		let repaired = 0;
		let checked = 0;
		for (const svg of svgs) {
			const texts = svg.querySelectorAll('text.pele-label, g.pele-edge-label text, text.pele-title, text.pele-cluster-label');
			for (const text of texts) {
				const current = parseColor(getComputedStyle(text).fill);
				if (!current) {
					continue;
				}
				checked++;
				const backdrop = backdropOf(text, svg);
				if (contrast(current, backdrop) >= 3) {
					continue;
				}
				const fg = pickForeground(backdrop);
				if (!fg) {
					continue;
				}
				text.style.setProperty('fill', toHex(fg), 'important');
				repaired++;
				out('label repainted: "' + (text.textContent || '').slice(0, 20) + '" ' +
					toHex(current) + ' -> ' + toHex(fg));
			}
		}
		return {checked: checked, repaired: repaired};
	}

	let timer = null;
	function schedule() {
		if (timer) {
			return;
		}
		timer = setTimeout(function () {
			timer = null;
			try {
				applyThemeVars();
				const r = repair();
				if (r.repaired > 0) {
					out('repaired ' + r.repaired + '/' + r.checked + ' labels');
				}
			} catch (e) {
				out('repair failed: ' + (e && e.message ? e.message : e));
			}
		}, 200);
	}

	schedule();

	const observer = new MutationObserver(schedule);
	observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});

	out('installed');
	return 'installed';
})();
