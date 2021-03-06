(function () {

    // Establish the root object, `window` (`self`) in the browser.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self;

    // Transformation helper functions
    var isString = function (arg) {
            return typeof arg === 'string';
        },
        isNumber = function (arg) {
            return typeof arg === 'number';
        },
        isFunction = function (arg) {
            return typeof arg === 'function';
        },
        isArray = function (arg) {
            return Array.isArray ? Array.isArray(arg) : Object.prototype.toString.call(arg) === '[object Array]';
        },
        stringIsRegExp = function (string) {
            return /^\/(?:\S|\s)*\/[gimy]{0,4}$/.test(string);
        },
        toRegExp = function (pattern) {
            var patternParts = pattern.split('/');
            var flagPart = patternParts[patternParts.length - 1];
            var patternPart = pattern.slice(1, (flagPart.length + 1) * -1);
            return new RegExp(patternPart, flagPart);
        },
        mapObject = function (object, func) {
            var key, newObject = {};
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    newObject[key] = func(key, object[key]);
                }
            }
            return newObject;
        },
        filterObject = function (object, func) {
            var key, newObject = {};
            for (key in object) {
                if (object.hasOwnProperty(key) && func(key, object[key])) {
                    newObject[key] = object[key];
                }
            }
            return newObject;
        },
        // FIXME: cachedQueryFactory should not use DOM nodes as keys to the cache.
        cachedQueryFactory = function (cacheKey) {
            return function (selector) {
                var _this = this;
                if (!_this.hasOwnProperty('cache')) {
                    _this.cache = {};
                }
                if (!_this.cache.hasOwnProperty(cacheKey)) {
                    _this.cache[cacheKey] = {};
                }
                return function (node) {
                    if (!node) {
                        return null;
                    }
                    if (!_this.cache[cacheKey].hasOwnProperty(node)) {
                        _this.cache[cacheKey][node] = {};
                    }
                    if (!_this.cache[cacheKey][node].hasOwnProperty(selector)) {
                        _this.cache[cacheKey][node][selector] = node[cacheKey](selector);
                    }
                    return _this.cache[cacheKey][node][selector];
                };
            };
        };

    // Composable transformations
    var transformations = {
        // Global object getters
        window: function () {
            return root;
        },
        document: function () {
            return root.document;
        },

        // DOM node transformations
        querySelectorAll: function (selector) {
            return function (node) {
                return node ? node.querySelectorAll(selector) : null;
            };
        },
        querySelector: function (selector) {
            return function (node) {
                return node ? node.querySelector(selector) : null;
            };
        },
        innerHTML: function (node) {
            return node ? node.innerHTML : null;
        },
        innerText: function (node) {
            return node ? node.innerText || node.textContent : null;
        },
        value: function (node) {
            return node ? node.value : null;
        },
        getAttribute: function (attr) {
            return function (node) {
                return node && node.getAttribute ? node.getAttribute(attr) : null;
            };
        },

        // Number transformations
        toInt: function (item) {
            return isString(item) || isNumber(item) ? parseInt(item, 10) : null;
        },
        toFloat: function (item) {
            return isString(item) || isNumber(item) ? parseFloat(item) : null;
        },
        round: function (item) {
            return isNumber(item) ? Math.round(item) : null;
        },
        multiplyBy: function (factor) {
            return function (number) {
                return isNumber(number) ? factor * number : null;
            };
        },

        // String transformations
        htmlToText: function (html) {
            var div = root.document.createElement('div');
            div.innerHTML = html;
            return div.firstChild.nodeValue + String();
        },
        toString: function (item) {
            return item ? item + String() : null;
        },
        trim: function (text) {
            return isString(text) ? text.trim() : null;
        },
        split: function (delimeter, limit) {
            var args = [delimeter];
            if (typeof limit !== 'undefined') {
                args.push(parseInt(limit, 10));
            }
            return function (text) {
                return isString(text) && text.split.apply(text, args);
            };
        },
        replace: function (pattern, replacement) {
            pattern = isString(pattern) && stringIsRegExp(pattern) ? toRegExp(pattern) : pattern;
            return function (text) {
                return isString(text) && text.replace(pattern, replacement);
            };
        },
        match: function (pattern) {
            pattern = isString(pattern) && stringIsRegExp(pattern) ? toRegExp(pattern) : pattern;
            return function (text) {
                return isString(text) && text.match(pattern);
            };
        },

        // Array transformations
        getIndex: function (index) {
            index = parseInt(index, 10);
            return function (array) {
                return isArray(array) && array.length > index ? array[index] : null;
            };
        },
        slice: function (start, stop) {
            var args = [parseInt(start, 10)];
            if (typeof stop !== 'undefined') {
                args.push(parseInt(stop, 10));
            }
            return function (array) {
                // Slice needs to work on NodeList instances
                return array ? Array.prototype.slice.apply(array, args) : null;
            };
        },

        // Object transformations
        getProperty: function (property) {
            return function (object) {
                return object ? object[property] : null;
            };
        },
        getProperties: function (propertyString) {
            return function (object) {
                if (!object) {
                    return null;
                }
                var properties = propertyString.split('.'),
                    property;
                while (properties.length) {
                    property = properties.shift();
                    object = object ? object[property] : null;
                }
                return object;
            };
        }
    };

    var arrayTransformations = {
        map: function (method) {
            return function (array) {
                return Array.prototype.map.call(array, method);
            };
        }
    };

    // Allow usage as a function without `new` operator
    var Composable = function (config) {
        if (!(this instanceof Composable)) {
            return new Composable(config);
        }
        return this.extract(config);
    };

    var objectMerge = function () {
        var extractedProperties = {};
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'object') {
                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) {
                        extractedProperties[key] = arguments[i][key];
                    }
                }
            }
        }
        return extractedProperties;
    };

    // Put transformations on Composable object for global referencing without `new` operator
    Composable.prototype.T = Composable.T = objectMerge(transformations, arrayTransformations);

    // Extract and format data from the DOM based on config
    Composable.prototype.extract = function (config) {
        var _this = this;

        var filteredConfig = filterObject(config, function (key, spec) {
            return isArray(spec);
        });

        return mapObject(filteredConfig, function (key, spec) {
            var i, item = null;
            for (i = 0; i < spec.length; i += 1) {
                item = _this.applyTransformation(item, spec[i]);
            }
            return item;
        });
    };

    // Apply each transformation to the item, in series
    Composable.prototype.applyTransformation = function (item, transformationInput) {
        var xform = this.getTransformation(transformationInput);
        if (!xform) {
            throw 'Transformation "' + transformationInput + '" invalid';
        }
        return xform(item);
    };

    Composable.prototype.getTransformation = function (transformationInput) {
        if (isFunction(transformationInput)) {
            return transformationInput;
        } else if (!isString(transformationInput)) {
            throw 'Invalid Input Type: ' + typeof transformationInput;
        }

        if (!transformationInput) {
            // either command string is empty or no sub command given in recursion
            return null;
        } else if (this.T.hasOwnProperty(transformationInput)) {
            return this.T[transformationInput];
        }

        var transformationArray = transformationInput.split(':');
        var command = transformationArray.shift();
        var commandArgString = transformationArray.join(':');

        var subCommand;
        if (arrayTransformations.hasOwnProperty(command)) {
            subCommand = this.getTransformation(commandArgString);
        } else if (!this.T.hasOwnProperty(command)) {
            return null;
        }

        var args = subCommand ? [subCommand] : extractArgs(commandArgString);
        return this.T[command].apply(this, args);
    };

    var extractArgs = function (string) {
        string = string || '';
        var args = string.match(/^(\/(?:\S|\s)*\/[gimy]{0,4})(?:,([^,]*))*$/i);
        if (args && args.length) {
            args.shift();
        } else {
            args = string.split(',');
        }
        return args;
    };

    Composable.VERSION = '0.4.0';

    // Make the object globally accessible
    root.Composable = Composable;

    // Define it for AMD
    if (typeof define === 'function' && define.amd) {
        define('composable', [], function () {
            return Composable;
        });
    }

}());
