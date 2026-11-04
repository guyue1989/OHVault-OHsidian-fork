// Renderer-side shim that lets ES5-transpiled community plugins load against
// Obsidian 1.15.0.
//
// 1.15.0 replaced the plugin base classes with native ES6 classes
// (Plugin = class extends Component). A plugin built by TypeScript with an ES5
// target inherits from them through the __extends helper, whose constructor
// calls the base class as a function (_super.apply(this, arguments)). A native
// class refuses that with "Class constructor X cannot be invoked without 'new'",
// and Obsidian turns the rejection into a plugin-load failure message.
//
// The module handed to plugins is replaced by a copy whose classes are Proxies.
// `new`, `extends`, `instanceof` and the static members keep the native
// behaviour; only the call-without-new form is intercepted and turned into a
// construction whose own properties are copied onto the caller's object.
//
// Obsidian hands plugins their module in one of two ways, and both are covered:
//   - desktop: a <script> appended to the page calls
//     window.__obsidianPluginScript(scriptElement, pluginBody)
//   - fallback: the loader evaluates the plugin body with window.eval
(function () {
	if (window.__ohvEs5PluginCompat) {
		return 'already-installed';
	}
	window.__ohvEs5PluginCompat = true;

	function log(message) {
		try {
			console.log('[HMOS-ES5] ' + message);
		} catch (e) {
		}
	}

	function isClass(value) {
		if (typeof value !== 'function') {
			return false;
		}
		try {
			return /^\s*class[\s{]/.test(Function.prototype.toString.call(value));
		} catch (e) {
			return false;
		}
	}

	function adaptClass(K) {
		return new Proxy(K, {
			apply: function (target, thisArg, args) {
				var proto = Object.getPrototypeOf(thisArg) || target.prototype;
				var newTarget = function () {};
				newTarget.prototype = proto;
				var built = Reflect.construct(target, Array.prototype.slice.call(args), newTarget);
				Object.getOwnPropertyNames(built).forEach(function (key) {
					if (key === 'constructor') {
						return;
					}
					try {
						Object.defineProperty(thisArg, key, Object.getOwnPropertyDescriptor(built, key));
					} catch (e) {
					}
				});
				return thisArg;
			}
		});
	}

	var patchedModules = new WeakMap();

	function patchObsidianModule(real) {
		if (!real || typeof real !== 'object') {
			return real;
		}
		if (patchedModules.has(real)) {
			return patchedModules.get(real);
		}
		var copy = {};
		var adapted = [];
		for (var key in real) {
			var value;
			try {
				value = real[key];
			} catch (e) {
				continue;
			}
			if (isClass(value)) {
				copy[key] = adaptClass(value);
				adapted.push(key);
			} else {
				copy[key] = value;
			}
		}
		patchedModules.set(real, copy);
		log('obsidian module copied, adapted classes: ' + adapted.join(','));
		return copy;
	}

	function wrapRequire(original) {
		return function (id) {
			if (id === 'obsidian') {
				return patchObsidianModule(original(id));
			}
			return original(id);
		};
	}

	function wrapPluginBody(body) {
		return function (require, module, exports) {
			return body(wrapRequire(require), module, exports);
		};
	}

	// Obsidian installs its own handler for the script hook right before the
	// first plugin is fetched, so the handler is wrapped rather than replaced.
	// The getter must stay undefined until that handler exists, otherwise the
	// loader's own `window[key] ??= handler` would consider the slot filled and
	// never install it.
	var SCRIPT_KEY = '__obsidianPluginScript';
	var loaderHandler = null;
	var wrapper = null;

	function scriptWrapper() {
		if (!wrapper) {
			wrapper = function (element, body) {
				if (typeof body !== 'function') {
					return loaderHandler.apply(this, arguments);
				}
				return loaderHandler(element, wrapPluginBody(body));
			};
		}
		return wrapper;
	}

	var installedHandler = window[SCRIPT_KEY];
	if (typeof installedHandler === 'function') {
		loaderHandler = installedHandler;
	}
	Object.defineProperty(window, SCRIPT_KEY, {
		configurable: true,
		enumerable: false,
		get: function () {
			return loaderHandler ? scriptWrapper() : undefined;
		},
		set: function (value) {
			if (typeof value === 'function' && !loaderHandler) {
				loaderHandler = value;
				return;
			}
			loaderHandler = null;
			Object.defineProperty(window, SCRIPT_KEY, {
				configurable: true,
				enumerable: false,
				writable: true,
				value: value
			});
		}
	});

	var originalEval = window.eval;
	var PLUGIN_PREFIX = '(function anonymous(require,module,exports){';
	if (typeof originalEval === 'function') {
		window.eval = function (code) {
			if (typeof code === 'string' && code.indexOf(PLUGIN_PREFIX) === 0) {
				var body = originalEval.call(window, code);
				if (typeof body === 'function') {
					return wrapPluginBody(body);
				}
				return body;
			}
			return originalEval.apply(window, arguments);
		};
	}

	log('es5 plugin compatibility installed');
	return 'installed';
})();
