/**
 * DEVELOPED BY
 * GIL LOPES BUENO
 * gilbueno.mail@gmail.com
 *
 * WORKS WITH:
 * IE 9+, FF 4+, SF 5+, WebKit, CH 7+, OP 12+, BESEN, Rhino 1.7+
 *
 * FORK:
 * https://github.com/wburningham/Watch.JS
 */

"use strict";
(function(factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        window.WatchJS = factory();
        window.watch = window.WatchJS.watch;
        window.unwatch = window.WatchJS.unwatch;
        window.callWatchers = window.WatchJS.callWatchers;
    }
}(function() {

    var WatchJS = {
        noMore: false
    },
        defineWatcher,
        unwatchOne,
        callWatchers;

    // addPropertyToDOMObject method taken from: http://johndyer.name/native-browser-get-set-properties-in-javascript/
    // Super amazing, cross browser property function, based on http://thewikies.com/

    var addPropertyToDOMObject = function(obj, name, onGet, onSet) {

        // wrapper functions
        var oldValue = obj[name],
            getFn = function() {
                return onGet.apply(obj, [oldValue]);
            },
            setFn = function(newValue) {
                return oldValue = onSet.apply(obj, [newValue]);
            };

        // Modern browsers, IE9+, and IE8 (must be a DOM object),

        var onPropertyChange = function(e) {

            if (event.propertyName == name) {
                // temporarily remove the event so it doesn't fire again and create a loop
                obj.detachEvent("onpropertychange", onPropertyChange);

                // get the changed value, run it through the set function
                var newValue = setFn(obj[name]);

                // restore the get function
                obj[name] = getFn;
                obj[name].toString = getFn;

                // restore the event
                if (typeof obj.attachEvent !== 'undefined') {
                    obj.attachEvent("onpropertychange", onPropertyChange);
                } else {
                    obj.addEventListener("onpropertychange", onPropertyChange);
                }
            }
        };

        obj[name] = getFn;
        obj[name].toString = getFn;

        if (typeof obj.attachEvent !== 'undefined') {
            obj.attachEvent("onpropertychange", onPropertyChange);
        } else {
            obj.addEventListener("onpropertychange", onPropertyChange);
        }
    };

    // isDOMElement method taken from http://stackoverflow.com/a/384380
    var isDOMElement = function(obj) {
        try {
            //Using W3 DOM2 (works for FF, Opera and Chrom)
            return obj instanceof HTMLElement;
        } catch (e) {
            //Browsers not supporting W3 DOM2 don't have HTMLElement and
            //an exception is thrown and we end up here. Testing some
            //properties that all elements have. (works on IE7)
            return (typeof obj === "object") &&
                (obj.nodeType === 1) && (typeof obj.style === "object") &&
                (typeof obj.ownerDocument === "object");
        }
    };


    var isFunction = function(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) == '[object Function]';
    };

    var isInt = function(x) {
        return x % 1 === 0;
    };

    var isArray = function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };

    var isModernBrowser = function() {
        return Object.defineProperty || Object.prototype.__defineGetter__;
    };

    var defineGetAndSet = function(obj, propName, getter, setter) {
        try {
            Object.defineProperty(obj, propName, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });
        } catch (error) {
            try {
                Object.prototype.__defineGetter__.call(obj, propName, getter);
                Object.prototype.__defineSetter__.call(obj, propName, setter);
            } catch (error2) {

                // TODO Check to see if this is a DOM object so we can fallback to onpropertychange enviroments
                if (isDOMElement(obj)) {
                    addPropertyToDOMObject(obj, propName, getter, setter);
                } else {
                    throw "watchJS error: browser not supported :/"
                }
            }
        }
    };

    var defineProp = function(obj, propName, value) {
        try {
            Object.defineProperty(obj, propName, {
                enumerable: false,
                configurable: true,
                writable: false,
                value: value
            });
        } catch (error) {
            obj[propName] = value;
        }
    };

    var watch = function() {

        if (isFunction(arguments[1])) {
            watchAll.apply(this, arguments);
        } else if (isArray(arguments[1])) {
            watchMany.apply(this, arguments);
        } else {
            watchOne.apply(this, arguments);
        }

    };


    var watchAll = function(obj, watcher, level) {

        if (obj instanceof String || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        var props = [];


        if (isArray(obj)) {
            for (var prop = 0; prop < obj.length; prop++) { //for each item if obj is an array
                props.push(prop); //put in the props
            }
        } else {
            for (var prop2 in obj) { //for each attribute if obj is an object
                if (hasOwnProperty.call(obj, prop2) && obj[prop2]) {
                    props.push(prop2); //put in the props
                }
            }
        }

        watchMany(obj, props, watcher, level); //watch all itens of the props
    };


    var watchMany = function(obj, props, watcher, level) {

        for (var prop in props) { //watch each attribute of "props" if is an object
            if (hasOwnProperty.call(props, prop) && props[prop]) {
                watchOne(obj, props[prop], watcher, level);
            }
        }

    };

    var watchOne = function(obj, prop, watcher, level) {

        if (isFunction(obj[prop])) { //dont watch if it is a function
            return;
        }

        if (obj[prop] != null && (level === undefined || level > 0)) {
            if (level !== undefined) {
                level--;
            }
            watchAll(obj[prop], watcher, level); //recursively watch all attributes of this
        }

        defineWatcher(obj, prop, watcher);

    };

    var unwatch = function() {

        if (isFunction(arguments[1])) {
            unwatchAll.apply(this, arguments);
        } else if (isArray(arguments[1])) {
            unwatchMany.apply(this, arguments);
        } else {
            unwatchOne.apply(this, arguments);
        }

    };

    var unwatchAll = function(obj, watcher) {

        if (obj instanceof String || (!(obj instanceof Object) && !isArray(obj))) { //accepts only objects and array (not string)
            return;
        }

        var props = [];


        if (isArray(obj)) {
            for (var prop = 0; prop < obj.length; prop++) { //for each item if obj is an array
                props.push(prop); //put in the props
            }
        } else {
            for (var prop2 in obj) { //for each attribute if obj is an object
                if (hasOwnProperty.call(obj, prop2) && obj[prop2]) {
                    props.push(prop2); //put in the props
                }
            }
        }

        unwatchMany(obj, props, watcher); //watch all itens of the props
    };


    var unwatchMany = function(obj, props, watcher) {

        for (var prop2 in props) { //watch each attribute of "props" if is an object
            if (hasOwnProperty.call(props, prop2) && props[prop2]) {
                unwatchOne(obj, props[prop2], watcher);
            }
        }
    };

    if (isModernBrowser()) {

        defineWatcher = function(obj, prop, watcher) {

            var val = obj[prop];

            watchFunctions(obj, prop);

            if (!obj.watchers) {
                defineProp(obj, "watchers", {});
            }

            if (!obj.watchers[prop]) {
                obj.watchers[prop] = [];
            }


            obj.watchers[prop].push(watcher); //add the new watcher in the watchers array


            var getter = function() {
                return val;
            };


            var setter = function(newval) {
                var oldval = val;
                val = newval;

                if (obj[prop]) {
                    watchAll(obj[prop], watcher);
                }

                watchFunctions(obj, prop);

                if (!WatchJS.noMore) {
                    if (JSON.stringify(oldval) !== JSON.stringify(newval)) {
                        callWatchers(obj, prop, "set", newval, oldval);
                        WatchJS.noMore = false;
                    }
                }
            };

            defineGetAndSet(obj, prop, getter, setter);

        };

        callWatchers = function(obj, prop, action, newval, oldval) {

            for (var wr in obj.watchers[prop]) {
                if (hasOwnProperty.call(obj.watchers[prop], wr) && obj.watchers[prop][wr]) {
                    if (isInt(wr)) {
                        obj.watchers[prop][wr].call(obj, prop, action, newval, oldval);
                    }
                }
            }
        };

        // @todo code related to "watchFunctions" is certainly buggy
        var methodNames = ['pop', 'push', 'reverse', 'shift', 'sort', 'slice', 'unshift'];
        var defineArrayMethodWatcher = function(obj, prop, original, methodName) {
            defineProp(obj[prop], methodName, function() {
                var response = original.apply(obj[prop], arguments);
                watchOne(obj, obj[prop]);
                if (methodName !== 'slice') {
                    callWatchers(obj, prop, methodName, arguments);
                }
                return response;
            });
        };

        var watchFunctions = function(obj, prop) {

            if ((!obj[prop]) || (obj[prop] instanceof String) || (!isArray(obj[prop]))) {
                return;
            }

            for (var i = methodNames.length, methodName; i--;) {
                methodName = methodNames[i];
                defineArrayMethodWatcher(obj, prop, obj[prop][methodName], methodName);
            }

        };

        unwatchOne = function(obj, prop, watcher) {
            for (var i in obj.watchers[prop]) {
                if (hasOwnProperty.call(obj.watchers[prop], i) && obj.watchers[prop][i]) {
                    var w = obj.watchers[prop][i];

                    if (w == watcher) {
                        obj.watchers[prop].splice(i, 1);
                    }
                }
            }
        };

    } else {
        //this implementation dont work because it cant handle the gap between "settings".
        //I mean, if you use a setter for an attribute after another setter of the same attribute it will only fire the second
        //but I think we could think something to fix it

        var subjects = [];

        defineWatcher = function(obj, prop, watcher) {

            subjects.push({
                obj: obj,
                prop: prop,
                serialized: JSON.stringify(obj[prop]),
                watcher: watcher
            });

        };

        unwatchOne = function(obj, prop, watcher) {

            for (var i in subjects) {
                if (hasOwnProperty.call(subjects, i) && subjects[i]) {
                    var subj = subjects[i];

                    if (subj.obj == obj && subj.prop == prop && subj.watcher == watcher) {
                        subjects.splice(i, 1);
                    }
                }

            }

        };

        callWatchers = function(obj, prop, action, value) {

            for (var i in subjects) {
                if (hasOwnProperty.call(subjects, i) && subjects[i]) {
                    var subj = subjects[i];

                    if (subj.obj == obj && subj.prop == prop) {
                        subj.watcher.call(obj, prop, action, value);
                    }
                }

            }

        };

        var loop = function() {

            for (var i in subjects) {
                if (hasOwnProperty.call(subjects, i) && subjects[i]) {

                    var subj = subjects[i];
                    var newSer = JSON.stringify(subj.obj[subj.prop]);
                    if (newSer != subj.serialized) {
                        subj.watcher.call(subj.obj, subj.prop, subj.obj[subj.prop], JSON.parse(subj.serialized));
                        subj.serialized = newSer;
                    }
                }

            }

        };

        setInterval(loop, 50);

    }

    WatchJS.watch = watch;
    WatchJS.unwatch = unwatch;
    WatchJS.callWatchers = callWatchers;

    return WatchJS;

}));
