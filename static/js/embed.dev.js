(function () {/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("components/almond/almond", function(){});

define('app/lib/ready',[],function() {

    

    var loaded = false;
    var once = function(callback) {
        if (! loaded) {
            loaded = true;
            callback();
        }
    };

    var domready = function(callback) {

        // HTML5 standard to listen for dom readiness
        document.addEventListener('DOMContentLoaded', function() {
            once(callback);
        });

        // if dom is already ready, just run callback
        if (document.readyState === "interactive" || document.readyState === "complete" ) {
            once(callback);
        }
    };

    return domready;

});
define('app/config',[],function() {
    

    var config = {
        "css": true,
        "lang": (navigator.language || navigator.userLanguage).split("-")[0],
        "reply-to-self": false,
        "max-comments-top": "inf",
        "max-comments-nested": 5,
        "reveal-on-click": 5,
        "avatar": true,
        "avatar-bg": "#f0f0f0",
        "avatar-fg": ["#9abf88", "#5698c4", "#e279a3", "#9163b6",
                      "#be5168", "#f19670", "#e4bf80", "#447c69"].join(" "),
        "vote": true
    };

    var js = document.getElementsByTagName("script");

    for (var i = 0; i < js.length; i++) {
        for (var j = 0; j < js[i].attributes.length; j++) {
            var attr = js[i].attributes[j];
            if (/^data-isso-/.test(attr.name)) {
                try {
                    config[attr.name.substring(10)] = JSON.parse(attr.value);
                } catch (ex) {
                    config[attr.name.substring(10)] = attr.value;
                }
            }
        }
    }

    // split avatar-fg on whitespace
    config["avatar-fg"] = config["avatar-fg"].split(" ");

    return config;

});

define('app/i18n/de',{
    "postbox-text": "Kommentar hier eintippen (mindestens 3 Zeichen)",
    "postbox-author": "Name (optional)",
    "postbox-email": "Email (optional)",
    "postbox-website": "Website (optional)",
    "postbox-submit": "Abschicken",
    "num-comments": "1 Kommentar\n{{ n }} Kommentare",
    "no-comments": "Keine Kommentare bis jetzt",
    "comment-reply": "Antworten",
    "comment-edit": "Bearbeiten",
    "comment-save": "Speichern",
    "comment-delete": "Löschen",
    "comment-confirm": "Bestätigen",
    "comment-close": "Schließen",
    "comment-cancel": "Abbrechen",
    "comment-deleted": "Kommentar gelöscht.",
    "comment-queued": "Kommentar muss noch freigeschaltet werden.",
    "comment-anonymous": "Anonym",
    "comment-hidden": "{{ n }} versteckt",
    "date-now": "eben jetzt",
    "date-minute": "vor einer Minute\nvor {{ n }} Minuten",
    "date-hour": "vor einer Stunde\nvor {{ n }} Stunden",
    "date-day": "Gestern\nvor {{ n }} Tagen",
    "date-week": "letzte Woche\nvor {{ n }} Wochen",
    "date-month": "letzten Monat\nvor {{ n }} Monaten",
    "date-year": "letztes Jahr\nvor {{ n }} Jahren"
});

define('app/i18n/en',{
    "postbox-text": "Type Comment Here (at least 3 chars)",
    "postbox-author": "Name (optional)",
    "postbox-email": "E-mail (optional)",
    "postbox-website": "Website (optional)",
    "postbox-submit": "Submit",

    "num-comments": "One Comment\n{{ n }} Comments",
    "no-comments": "No Comments Yet",

    "comment-reply": "Reply",
    "comment-edit": "Edit",
    "comment-save": "Save",
    "comment-delete": "Delete",
    "comment-confirm": "Confirm",
    "comment-close": "Close",
    "comment-cancel": "Cancel",
    "comment-deleted": "Comment deleted.",
    "comment-queued": "Comment in queue for moderation.",
    "comment-anonymous": "Anonymous",
    "comment-hidden": "{{ n }} Hidden",

    "date-now": "right now",
    "date-minute": "a minute ago\n{{ n }} minutes ago",
    "date-hour": "an hour ago\n{{ n }} hours ago",
    "date-day": "Yesterday\n{{ n }} days ago",
    "date-week": "last week\n{{ n }} weeks ago",
    "date-month": "last month\n{{ n }} months ago",
    "date-year": "last year\n{{ n }} years ago"
});

define('app/i18n/fr',{
    "postbox-text": "Insérez votre commentaire ici (au moins 3 lettres)",
    "postbox-author": "Nom (optionnel)",
    "postbox-email": "Courriel (optionnel)",
    "postbox-website": "Site web (optionnel)",
    "postbox-submit": "Soumettre",
    "num-comments": "{{ n }} commentaire\n{{ n }} commentaires",
    "no-comments": "Aucun commentaire pour l'instant",
    "comment-reply": "Répondre",
    "comment-edit": "Éditer",
    "comment-save": "Enregistrer",
    "comment-delete": "Supprimer",
    "comment-confirm": "Confirmer",
    "comment-close": "Fermer",
    "comment-cancel": "Annuler",
    "comment-deleted": "Commentaire supprimé.",
    "comment-queued": "Commentaire en attente de modération.",
    "comment-anonymous": "Anonyme",
    "comment-hidden": "1 caché\n{{ n }} cachés",
    "date-now": "À l'instant",
    "date-minute": "Il y a une minute\nIl y a {{ n }} minutes",
    "date-hour": "Il y a une heure\nIl y a {{ n }} heures ",
    "date-day": "Hier\nIl y a {{ n }} jours",
    "date-week": "Il y a une semaine\nIl y a {{ n }} semaines",
    "date-month": "Il y a un mois\nIl y a {{ n }} mois",
    "date-year": "Il y a un an\nIl y a {{ n }} ans"
});

define('app/i18n/ru',{
    "postbox-text": "Комментировать здесь  (миниум 3 символа)",
    "postbox-author": "Имя (необязательно)",
    "postbox-email": "Email (необязательно)",
    "postbox-submit": "Отправить",
    "num-comments": "1 Комментарий\n{{ n }} Комментарии",
    "no-comments": "Нет Комментарев",
    "comment-reply": "Ответить",
    "comment-edit": "Правка",
    "comment-save": "Сохранить",
    "comment-delete": "Удалить",
    "comment-confirm": "Подтвердить",
    "comment-close": "Закрыть",
    "comment-cancel": "Отменить",
    "comment-deleted": "Удалить комментарий",
    "comment-queued": "Комментарий должен быть разблокирован",
    "comment-anonymous": "Анонимный",
    "date-now": "Сейчас",
    "date-minute": "Минут назад\n{{ n }} минут",
    "date-hour": "Час назад\n{{ n }} часов",
    "date-day": "Вчера\n{{ n }} дней",
    "date-week": "на прошлой недели\n{{ n }} недель",
    "date-month": "в прошоим месяце\n{{ n }} месяцов",
    "date-year": "в прошлом году\n{{ n }} года\n{{ n }} лет"
});

define('app/i18n/it',{
    "postbox-text": "Scrivi un commento qui (minimo 3 caratteri)",
    "postbox-author": "Nome (opzionale)",
    "postbox-email": "E-mail (opzionale)",
    "postbox-submit": "Invia",
    "num-comments": "Un Commento\n{{ n }} Commenti",
    "no-comments": "Ancora Nessun Commento",
    "comment-reply": "Rispondi",
    "comment-edit": "Modifica",
    "comment-save": "Salva",
    "comment-delete": "Elimina",
    "comment-confirm": "Conferma",
    "comment-close": "Chiudi",
    "comment-cancel": "Cancella",
    "comment-deleted": "Commento eliminato.",
    "comment-queued": "Commento in coda per moderazione.",
    "comment-anonymous": "Anonimo",
    "date-now": "poco fa",
    "date-minute": "un minuto fa\n{{ n }} minuti fa",
    "date-hour": "un ora fa\n{{ n }} ore fa",
    "date-day": "Ieri\n{{ n }} giorni fa",
    "date-week": "questa settimana\n{{ n }} settimane fa",
    "date-month": "questo mese\n{{ n }} mesi fa",
    "date-year": "quest'anno\n{{ n }} anni fa"
});

define('app/i18n/eo',{
    "postbox-text": "Tajpu komenton ĉi-tie (almenaŭ 3 signoj)",
    "postbox-author": "Nomo (malnepra)",
    "postbox-email": "Retadreso (malnepra)",
    "postbox-website": "Retejo (malnepra)",
    "postbox-submit": "Sendu",
    "num-comments": "{{ n }} komento\n{{ n }} komentoj",
    "no-comments": "Neniu komento ankoraŭ",
    "comment-reply": "Respondu",
    "comment-edit": "Redaktu",
    "comment-save": "Savu",
    "comment-delete": "Forviŝu",
    "comment-confirm": "Konfirmu",
    "comment-close": "Fermu",
    "comment-cancel": "Malfaru",
    "comment-deleted": "Komento forviŝita",
    "comment-queued": "Komento en atendovico por kontrolo.",
    "comment-anonymous": "Sennoma",
    "comment-hidden": "{{ n }} kaŝitaj",
    "date-now": "ĵus nun",
    "date-minute": "antaŭ unu minuto\nantaŭ {{ n }} minutoj",
    "date-hour": "antaŭ unu horo\nantaŭ {{ n }} horoj",
    "date-day": "hieraŭ\nantaŭ {{ n }} tagoj",
    "date-week": "lasta semajno\nantaŭ {{ n }} semajnoj",
    "date-month": "lasta monato\nantaŭ {{ n }} monatoj",
    "date-year": "lasta jaro\nantaŭ {{ n }} jaroj"
});

define('app/i18n',["app/config", "app/i18n/de", "app/i18n/en", "app/i18n/fr", "app/i18n/ru", "app/i18n/it", "app/i18n/eo"], function(config, de, en, fr, ru, it, eo) {

    

    var pluralforms = function(lang) {
        switch (lang) {
        case "en":
        case "de":
        case "it":
        case "eo":
            return function(msgs, n) {
                return msgs[n === 1 ? 0 : 1];
            };
        case "fr":
            return function(msgs, n) {
                return msgs[n > 1 ? 1 : 0];
            };
        case "ru":
            return function(msgs, n) {
                if (n % 10 === 1 && n % 100 !== 11) {
                    return msgs[0];
                } else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
                    return msgs[1];
                } else {
                    return typeof msgs[2] !== "undefined" ? msgs[2] : msgs[1];
                }
            };
        default:
            return null;
        }
    };

    // useragent's prefered language (or manually overridden)
    var lang = config.lang;

    // fall back to English
    if (! pluralforms(lang)) {
        lang = "en";
    }

    var catalogue = {
        de: de,
        en: en,
        fr: fr,
        ru: ru,
        it: it,
        eo: eo
    };

    var plural = pluralforms(lang);

    var translate = function(msgid) {
        return catalogue[lang][msgid] || en[msgid] || "???";
    };

    var pluralize = function(msgid, n) {
        var msg;

        msg = translate(msgid);
        if (msg.indexOf("\n") > -1) {
            msg = plural(msg.split("\n"), (+ n));
        }

        return msg ? msg.replace("{{ n }}", (+ n)) : msg;
    };

    return {
        lang: lang,
        translate: translate,
        pluralize: pluralize
    };
});

define('app/lib/promise',[],function() {

    

    var stderr = function(text) { console.log(text); };

    var Promise = function() {
        this.success = [];
        this.errors = [];
    };

    Promise.prototype.then = function(onSuccess, onError) {
        this.success.push(onSuccess);
        if (onError) {
            this.errors.push(onError);
        } else {
            this.errors.push(stderr);
        }
    };

    var Defer = function() {
        this.promise = new Promise();
    };

    Defer.prototype = {
        promise: Promise,
        resolve: function(rv) {
            this.promise.success.forEach(function(callback) {
                window.setTimeout(function() {
                    callback(rv);
                }, 0);
            });
        },

        reject: function(error) {
            this.promise.errors.forEach(function(callback) {
                window.setTimeout(function() {
                    callback(error);
                }, 0);
            });
        }
    };

    var when = function(obj, func) {
        if (obj instanceof Promise) {
            return obj.then(func);
        } else {
            return func(obj);
        }
    };

    return {
        defer: function() { return new Defer(); },
        when: when
    };

});

define('app/globals',[],function() {
    

    var Offset = function() {
        this.values = [];
    };

    Offset.prototype.update = function(remoteTime) {
        this.values.push((new Date()).getTime() - remoteTime.getTime());
    };

    Offset.prototype.localTime = function() {
        return new Date((new Date()).getTime() + this.values.reduce(
            function(a, b) { return a + b; }) / this.values.length);
    };

    return {
        offset: new Offset()
    };

});
define('app/api',["app/lib/promise", "app/globals"], function(Q, globals) {

    

    var salt = "Eech7co8Ohloopo9Ol6baimi",
        location = window.location.pathname;

    var script, endpoint,
        js = document.getElementsByTagName("script");

    // prefer `data-isso="//host/api/endpoint"` if provided
    for (var i = 0; i < js.length; i++) {
        if (js[i].hasAttribute("data-isso")) {
            endpoint = js[i].getAttribute("data-isso");
            break;
        }
    }

    // if no async-script is embedded, use the last script tag of `js`
    if (! endpoint) {
        for (i = 0; i < js.length; i++) {
            if (js[i].getAttribute("async") || js[i].getAttribute("defer")) {
                throw "Isso's automatic configuration detection failed, please " +
                      "refer to https://github.com/posativ/isso#client-configuration " +
                      "and add a custom `data-isso` attribute.";
            }
        }

        script = js[js.length - 1];
        endpoint = script.src.substring(0, script.src.length - "/js/embed.min.js".length);
    }

    //  strip trailing slash
    if (endpoint[endpoint.length - 1] === "/") {
        endpoint = endpoint.substring(0, endpoint.length - 1);
    }

    var curl = function(method, url, data, resolve, reject) {

        var xhr = new XMLHttpRequest();

        function onload() {

            var date = xhr.getResponseHeader("Date");
            if (date !== null) {
                globals.offset.update(new Date(date));
            }

            var cookie = xhr.getResponseHeader("X-Set-Cookie");
            if (cookie && cookie.match(/^isso-/)) {
                document.cookie = cookie;
            }

            if (xhr.status >= 500) {
                reject(xhr.body);
            } else {
                resolve({status: xhr.status, body: xhr.responseText});
            }
        }

        try {
            xhr.open(method, url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    onload();
                }
            };
        } catch (exception) {
            (reject || console.log)(exception.message);
        }

        xhr.send(data);
    };

    var qs = function(params) {
        var rv = "";
        for (var key in params) {
            if (params.hasOwnProperty(key) &&
                params[key] !== null && typeof(params[key]) !== "undefined") {
                rv += key + "=" + encodeURIComponent(params[key]) + "&";
            }
        }

        return rv.substring(0, rv.length - 1);  // chop off trailing "&"
    };

    var create = function(tid, data) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/new?" + qs({uri: tid || location}), JSON.stringify(data),
            function (rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var modify = function(id, data) {
        var deferred = Q.defer();
        curl("PUT", endpoint + "/id/" + id, JSON.stringify(data), function (rv) {
            if (rv.status === 403) {
                deferred.reject("Not authorized to modify this comment!");
            } else if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body));
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var remove = function(id) {
        var deferred = Q.defer();
        curl("DELETE", endpoint + "/id/" + id, null, function(rv) {
            if (rv.status === 403) {
                deferred.reject("Not authorized to remove this comment!");
            } else if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body) === null);
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var view = function(id, plain) {
        var deferred = Q.defer();
        curl("GET", endpoint + "/id/" + id + "?" + qs({plain: plain}), null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var fetch = function(tid, limit, nested_limit, parent, lastcreated) {
        if (typeof(limit) === 'undefined') { limit = "inf"; }
        if (typeof(nested_limit) === 'undefined') { nested_limit = "inf"; }
        if (typeof(parent) === 'undefined') { parent = null; }

        var query_dict = {uri: tid || location, after: lastcreated, parent: parent};

        if(limit !== "inf") {
            query_dict['limit'] = limit;
        }
        if(nested_limit !== "inf"){
            query_dict['nested_limit'] = nested_limit;
        }

        var deferred = Q.defer();
        curl("GET", endpoint + "/?" +
            qs(query_dict), null, function(rv) {
                if (rv.status === 200) {
                    deferred.resolve(JSON.parse(rv.body));
                } else if (rv.status === 404) {
                    deferred.resolve({total_replies: 0});
                } else {
                    deferred.reject(rv.body);
                }
            });
        return deferred.promise;
    };

    var count = function(urls) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/count", JSON.stringify(urls), function(rv) {
            if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body));
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var like = function(id) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/id/" + id + "/like", null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var dislike = function(id) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/id/" + id + "/dislike", null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    return {
        endpoint: endpoint,
        salt: salt,

        create: create,
        modify: modify,
        remove: remove,
        view: view,
        fetch: fetch,
        count: count,
        like: like,
        dislike: dislike
    };
});

define('app/dom',[],function() {

    

    window.Element.prototype.replace = function(el) {
        var element = DOM.htmlify(el);
        this.parentNode.replaceChild(element, this);
        return element;
    };

    window.Element.prototype.prepend = function(el) {
        var element = DOM.htmlify(el);
        this.insertBefore(element, this.firstChild);
        return element;
    };

    window.Element.prototype.append = function(el) {
        var element = DOM.htmlify(el);
        this.appendChild(element);
        return element;
    };

    window.Element.prototype.insertAfter = function(el) {
        var element = DOM.htmlify(el);
        this.parentNode.insertBefore(element, this.nextSibling);
        return element;
    };

    window.Element.prototype.on = function(type, listener, prevent) {
        /*
        Shortcut for `Element.addEventListener`, prevents default event
        by default, set :param prevents: to `false` to change that behavior.
         */
        this.addEventListener(type, function(event) {
            listener(event);
            if (prevent === undefined || prevent) {
                event.preventDefault();
            }
        });
    };

    window.Element.prototype.toggle = function(type, a, b) {
        /*
        Toggle between two internal states on event :param type: e.g. to
        cycle form visibility. Callback :param a: is called on first event,
        :param b: next time.

        You can skip to the next state without executing the callback with
        `toggler.next()`. You can prevent a cycle when you call `toggler.wait()`
        during an event.
         */

        function Toggle(el, a, b) {
            this.state = false;
            this.el = el;
            this.a = a;
            this.b = b;
        }

        Toggle.prototype.next = function next() {
            if (! this.state) {
                this.state = true;
                this.a(this);
            } else {
                this.state = false;
                this.b(this);
            }
        };

        Toggle.prototype.wait = function wait() {
            this.state = ! this.state;
        };

        var toggler = new Toggle(this, a, b);
        this.on(type, function() {
            toggler.next();
        });
    };

    window.Element.prototype.detach = function() {
        /*
        Detach an element from the DOM and return it.
         */

        this.parentNode.removeChild(this);
        return this;
    };

    window.Element.prototype.remove = function() {
        // Mimimi, I am IE and I am so retarded, mimimi.
        this.parentNode.removeChild(this);
    };

    window.Element.prototype.show = function() {
        this.style.display = "block";
    };

    window.Element.prototype.hide = function() {
        this.style.display = "none";
    };

    var DOM = function(query, root, single) {
        /*
        jQuery-like CSS selector which returns on :param query: either a
        single node (unless single=false), a node list or null.

        :param root: only queries within the given element.
         */

        if (typeof single === "undefined") {
            single = true;
        }

        if (! root) {
            root = window.document;
        }

        var elements = root.querySelectorAll(query);

        if (elements.length === 0) {
            return null;
        }

        if (elements.length === 1 && single) {
            return elements[0];
        }

        return elements;
    };

    DOM.htmlify = function(html) {
        /*
        Convert :param html: into an Element (if not already).
         */

        if (html instanceof window.Element) {
            return html;
        }

        var wrapper = DOM.new("div");
        wrapper.innerHTML = html;
        return wrapper.firstChild;
    };

    DOM.new = function(tag, content) {
        /*
        A helper to build HTML with pure JS. You can pass class names and
        default content as well:

            var par = DOM.new("p"),
                div = DOM.new("p.some.classes"),
                div = DOM.new("textarea.foo", "...")
         */

        var el = document.createElement(tag.split(".")[0]);
        tag.split(".").slice(1).forEach(function(val) { el.classList.add(val); });

        if (["A", "LINK"].indexOf(el.nodeName) > -1) {
            el.href = "#";
        }

        if (["TEXTAREA", "INPUT"].indexOf(el.nodeName) > -1) {
            el.value = content || "";
        } else {
            el.textContent = content || "";
        }
        return el;
    };

    DOM.each = function(tag, func) {
        // XXX really needed? Maybe better as NodeList method
        Array.prototype.forEach.call(document.getElementsByTagName(tag), func);
    };

    return DOM;
});
define('app/utils',["app/i18n"], function(i18n) {
    

    // return `cookie` string if set
    var cookie = function(cookie) {
        return (document.cookie.match('(^|; )' + cookie + '=([^;]*)') || 0)[2];
    };

    var pad = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    };

    var ago = function(localTime, date) {

        var secs = ((localTime.getTime() - date.getTime()) / 1000);

        if (isNaN(secs) || secs < 0 ) {
            secs = 0;
        }

        var mins = Math.ceil(secs / 60), hours = Math.ceil(mins / 60),
            days = Math.ceil(hours / 24);

        return secs  <=  45 && i18n.translate("date-now")  ||
               secs  <=  90 && i18n.pluralize("date-minute", 1) ||
               mins  <=  45 && i18n.pluralize("date-minute", mins) ||
               mins  <=  90 && i18n.pluralize("date-hour", 1) ||
               hours <=  22 && i18n.pluralize("date-hour", hours) ||
               hours <=  36 && i18n.pluralize("date-day", 1) ||
               days  <=   5 && i18n.pluralize("date-day", days) ||
               days  <=   8 && i18n.pluralize("date-week", 1) ||
               days  <=  21 && i18n.pluralize("date-week", Math.ceil(days / 7)) ||
               days  <=  45 && i18n.pluralize("date-month", 1) ||
               days  <= 345 && i18n.pluralize("date-month", Math.ceil(days / 30)) ||
               days  <= 547 && i18n.pluralize("date-year", 1) ||
                               i18n.pluralize("date-year", Math.ceil(days / 365.25));
    };

    var HTMLEntity = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };

    var escape = function(html) {
        return String(html).replace(/[&<>"'\/]/g, function (s) {
            return HTMLEntity[s];
        });
    };

    var text = function(html) {
        var _ = document.createElement("div");
        _.innerHTML = html.replace(/<div><br><\/div>/gi, '<br>')
                          .replace(/<div>/gi,'<br>')
                          .replace(/<br>/gi, '\n')
                          .replace(/&nbsp;/gi, ' ');
        return _.textContent.trim();
    };

    var detext = function(text) {
        text = escape(text);
        return text.replace(/\n\n/gi, '<br><div><br></div>')
                   .replace(/\n/gi, '<br>');
    };

    return {
        cookie: cookie,
        pad: pad,
        ago: ago,
        text: text,
        detext: detext
    };
});

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define('libjs-jade-runtime',[],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return (Array.isArray(val) ? val.map(joinClasses) :
    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
    [val]).filter(nulls).join(' ');
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};


exports.style = function (val) {
  if (val && typeof val === 'object') {
    return Object.keys(val).map(function (style) {
      return style + ':' + val[style];
    }).join(';');
  } else {
    return val;
  }
};
/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if (key === 'style') {
    val = exports.style(val);
  }
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    if (JSON.stringify(val).indexOf('&') !== -1) {
      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
                   'will be escaped to `&amp;`');
    };
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will eliminate the double quotes around dates in ' +
                   'ISO form after 2.0.0');
    }
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])(1)
});
define('jade',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});

define('jade!app/text/postbox', function () {  var fn = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (author, email, i18n, website) {
buf.push("<div class=\"isso-postbox\"><div class=\"form-wrapper\"><div class=\"textarea-wrapper\"><div contenteditable=\"true\" class=\"textarea placeholder\">" + (jade.escape(null == (jade_interp = i18n('postbox-text')) ? "" : jade_interp)) + "</div></div><section class=\"auth-section\"><p class=\"input-wrapper\"><input type=\"text\" name=\"author\"" + (jade.attr("placeholder", i18n('postbox-author'), true, false)) + (jade.attr("value", author !== null ? '' + (author) + '' : '', true, false)) + "/></p><p class=\"input-wrapper\"><input type=\"email\" name=\"email\"" + (jade.attr("placeholder", i18n('postbox-email'), true, false)) + (jade.attr("value", email != null ? '' + (email) + '' : '', true, false)) + "/></p><p class=\"input-wrapper\"><input type=\"text\" name=\"website\"" + (jade.attr("placeholder", i18n('postbox-website'), true, false)) + (jade.attr("value", website != null ? '' + (website) + '' : '', true, false)) + "/></p><p class=\"post-action\"><input type=\"submit\"" + (jade.attr("value", i18n('postbox-submit'), true, false)) + "/></p></section></div></div>");}.call(this,"author" in locals_for_with?locals_for_with.author:typeof author!=="undefined"?author:undefined,"email" in locals_for_with?locals_for_with.email:typeof email!=="undefined"?email:undefined,"i18n" in locals_for_with?locals_for_with.i18n:typeof i18n!=="undefined"?i18n:undefined,"website" in locals_for_with?locals_for_with.website:typeof website!=="undefined"?website:undefined));;return buf.join("");
};  return fn;});


define('jade!app/text/comment', function () {  var fn = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (bool, comment, conf, datetime, humanize, i18n, svg) {
buf.push("<div" + (jade.attr("id", 'isso-' + (comment.id) + '', true, false)) + " class=\"isso-comment\">");
if ( conf.avatar)
{
buf.push("<div class=\"avatar\"><svg" + (jade.attr("data-hash", '' + (comment.hash) + '', true, false)) + "></svg></div>");
}
buf.push("<div class=\"text-wrapper\"><div role=\"meta\" class=\"isso-comment-header\">");
if ( bool(comment.website))
{
buf.push("<a" + (jade.attr("href", '' + (comment.website) + '', true, false)) + " rel=\"nofollow\" class=\"author\">" + (jade.escape(null == (jade_interp = bool(comment.author) ? comment.author : i18n('comment-anonymous')) ? "" : jade_interp)) + "</a>");
}
else
{
buf.push("<span class=\"author\">" + (jade.escape(null == (jade_interp = bool(comment.author) ? comment.author : i18n('comment-anonymous')) ? "" : jade_interp)) + "</span>");
}
buf.push("<span class=\"spacer\">•</span><a" + (jade.attr("href", '#isso-' + (comment.id) + '', true, false)) + " class=\"permalink\"><time" + (jade.attr("title", '' + (humanize(comment.created)) + '', true, false)) + (jade.attr("datetime", '' + (datetime(comment.created)) + '', true, false)) + "></time></a><span class=\"note\">" + (jade.escape(null == (jade_interp = comment.mode == 2 ? i18n('comment-queued') : comment.mode == 4 ? i18n('comment-deleted') : '') ? "" : jade_interp)) + "</span></div><div class=\"text\">");
if ( comment.mode == 4)
{
buf.push("<p>&nbsp;</p>");
}
else
{
buf.push(null == (jade_interp = comment.text) ? "" : jade_interp);
}
buf.push("</div><div class=\"isso-comment-footer\">");
if ( conf.vote)
{
if ( comment.likes - comment.dislikes != 0)
{
buf.push("<span class=\"votes\">" + (jade.escape((jade_interp = comment.likes - comment.dislikes) == null ? '' : jade_interp)) + "</span>");
}
buf.push("<a href=\"#\" class=\"upvote\">" + (null == (jade_interp = svg['arrow-up']) ? "" : jade_interp) + "</a><span class=\"spacer\">|</span><a href=\"#\" class=\"downvote\">" + (null == (jade_interp = svg['arrow-down']) ? "" : jade_interp) + "</a>");
}
buf.push("<a href=\"#\" class=\"reply\">" + (jade.escape((jade_interp = i18n('comment-reply')) == null ? '' : jade_interp)) + "</a><a href=\"#\" class=\"edit\">" + (jade.escape((jade_interp = i18n('comment-edit')) == null ? '' : jade_interp)) + "</a><a href=\"#\" class=\"delete\">" + (jade.escape((jade_interp = i18n('comment-delete')) == null ? '' : jade_interp)) + "</a></div><div class=\"isso-follow-up\"></div></div></div>");}.call(this,"bool" in locals_for_with?locals_for_with.bool:typeof bool!=="undefined"?bool:undefined,"comment" in locals_for_with?locals_for_with.comment:typeof comment!=="undefined"?comment:undefined,"conf" in locals_for_with?locals_for_with.conf:typeof conf!=="undefined"?conf:undefined,"datetime" in locals_for_with?locals_for_with.datetime:typeof datetime!=="undefined"?datetime:undefined,"humanize" in locals_for_with?locals_for_with.humanize:typeof humanize!=="undefined"?humanize:undefined,"i18n" in locals_for_with?locals_for_with.i18n:typeof i18n!=="undefined"?i18n:undefined,"svg" in locals_for_with?locals_for_with.svg:typeof svg!=="undefined"?svg:undefined));;return buf.join("");
};  return fn;});


define('jade!app/text/comment-loader', function () {  var fn = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (comment, pluralize) {
buf.push("<div" + (jade.attr("id", 'isso-loader-' + (comment.name) + '', true, false)) + " class=\"isso-comment-loader\"><a href=\"#\" class=\"load_hidden\">" + (jade.escape((jade_interp = pluralize('comment-hidden', comment.hidden_replies)) == null ? '' : jade_interp)) + "</a></div>");}.call(this,"comment" in locals_for_with?locals_for_with.comment:typeof comment!=="undefined"?comment:undefined,"pluralize" in locals_for_with?locals_for_with.pluralize:typeof pluralize!=="undefined"?pluralize:undefined));;return buf.join("");
};  return fn;});

define('app/jade',["libjs-jade-runtime", "app/utils", "jade!app/text/postbox", "jade!app/text/comment", "jade!app/text/comment-loader"], function(runtime, utils, tt_postbox, tt_comment, tt_comment_loader) {
    

    var globals = {},
        templates = {};

    var load = function(name, js) {
        templates[name] = (function(jade) {
                var fn;
                eval("fn = " + js);
                return fn;
            })(runtime);
    };

    var set = function(name, value) {
        globals[name] = value;
    };

    load("postbox", tt_postbox);
    load("comment", tt_comment);
    load("comment-loader", tt_comment_loader);

    set("bool", function(arg) { return arg ? true : false; });
    set("humanize", function(date) {
        if (typeof date !== "object") {
            date = new Date(parseInt(date, 10) * 1000);
        }

        return date.toString();
    });
    set("datetime", function(date) {
        if (typeof date !== "object") {
            date = new Date(parseInt(date, 10) * 1000);
        }

        return [
            date.getUTCFullYear(),
            utils.pad(date.getUTCMonth(), 2),
            utils.pad(date.getUTCDay(), 2)
        ].join("-") + "T" + [
            utils.pad(date.getUTCHours(), 2),
            utils.pad(date.getUTCMinutes(), 2),
            utils.pad(date.getUTCSeconds(), 2)
        ].join(":") + "Z";
    });

    return {
        "set": set,
        "render": function(name, locals) {
            var rv, t = templates[name];
            if (! t) {
                throw new Error("Template not found: '" + name + "'");
            }

            locals = locals || {};

            var keys = [];
            for (var key in locals) {
                if (locals.hasOwnProperty(key) && !globals.hasOwnProperty(key)) {
                    keys.push(key);
                    globals[key] = locals[key];
                }
            }

            rv = templates[name](globals);

            for (var i = 0; i < keys.length; i++) {
                delete globals[keys[i]];
            }

            return rv;
        }
    };
});
define('app/lib/editor',["app/dom", "app/i18n"], function($, i18n) {

    

    return function(el) {
        el.setAttribute("contentEditable", true);

        el.on("focus", function() {
            if (el.classList.contains("placeholder")) {
                el.innerHTML = "";
                el.classList.remove("placeholder");
            }
        });

        el.on("blur", function() {
            if (el.textContent.length === 0) {
                el.textContent = i18n.translate("postbox-text");
                el.classList.add("placeholder");
            }
        });

        return el;
    };

});
/*
  Copyright (C) 2013 Gregory Schier <gschier1990@gmail.com>
  Copyright (C) 2013 Martin Zimmermann <info@posativ.org>

  Inspired by http://codepen.io/gschier/pen/GLvAy
*/
define('app/lib/identicons',["app/lib/promise", "app/config"], function(Q, config) {

    

    // Number of squares width and height
    var GRID = 5;

    var pad = function(n, width) {
        return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
    };

    /**
     * Fill in a square on the canvas.
     */
    var fill = function(svg, x, y, padding, size, color) {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        rect.setAttribute("x", padding + x * size);
        rect.setAttribute("y", padding + y * size);
        rect.setAttribute("width", size);
        rect.setAttribute("height", size);
        rect.setAttribute("style", "fill: " + color);

        svg.appendChild(rect);
    };

    /**
     * Pick random squares to fill in.
     */
    var generateIdenticon = function(key, padding, size) {

        var svg =  document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("version", "1.1");
        svg.setAttribute("viewBox", "0 0 " + size + " " + size);
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        svg.setAttribute("shape-rendering", "crispEdges");
        fill(svg, 0, 0, 0, size + 2*padding, config["avatar-bg"]);

        if (typeof key === null) {
            return svg;
        }

        Q.when(key, function(key) {
            var hash = pad((parseInt(key, 16) % Math.pow(2, 18)).toString(2), 18),
                index = 0;

            svg.setAttribute("data-hash", key);

            var i = parseInt(hash.substring(hash.length - 3, hash.length), 2),
                color = config["avatar-fg"][i % config["avatar-fg"].length];

            for (var x=0; x<Math.ceil(GRID/2); x++) {
                for (var y=0; y<GRID; y++) {

                    if (hash.charAt(index) === "1") {
                        fill(svg, x, y, padding, 8, color);

                        // fill right sight symmetrically
                        if (x < Math.floor(GRID/2)) {
                            fill(svg, (GRID-1) - x, y, padding, 8, color);
                        }
                    }
                    index++;
                }
            }
        });

        return svg;
    };

    var generateBlank = function(height, width) {

        var blank = parseInt([
            0, 1, 1, 1, 1,
            1, 0, 1, 1, 0,
            1, 1, 1, 1, 1, /* purple: */ 0, 1, 0
        ].join(""), 2).toString(16);

        var el = generateIdenticon(blank, height, width);
        el.setAttribute("className", "blank"); // IE10 does not support classList on SVG elements, duh.

        return el;
    };

    return {
        generate: generateIdenticon,
        blank: generateBlank
    };
});

define('app/lib',['require','app/lib/editor','app/lib/identicons'],function (require) {
    return {
        editorify: require("app/lib/editor"),
        identicons: require("app/lib/identicons")
    };
});

/* Isso – Ich schrei sonst!
 */
define('app/isso',["app/dom", "app/utils", "app/config", "app/api", "app/jade", "app/i18n", "app/lib", "app/globals"],
    function($, utils, config, api, jade, i18n, lib, globals) {

    

    var Postbox = function(parent) {

        var el = $.htmlify(jade.render("postbox", {
            "author":  JSON.parse(localStorage.getItem("author")),
            "email":   JSON.parse(localStorage.getItem("email")),
            "website": JSON.parse(localStorage.getItem("website"))
        }));

        // callback on success (e.g. to toggle the reply button)
        el.onsuccess = function() {};

        el.validate = function() {
            if (utils.text($(".textarea", this).innerHTML).length < 3 ||
                $(".textarea", this).classList.contains("placeholder"))
            {
                $(".textarea", this).focus();
                return false;
            }
            return true;
        };

        // submit form, initialize optional fields with `null` and reset form.
        // If replied to a comment, remove form completely.
        $("[type=submit]", el).on("click", function() {
            if (! el.validate()) {
                return;
            }

            var author = $("[name=author]", el).value || null,
                email = $("[name=email]", el).value || null,
                website = $("[name=website]", el).value || null;

            localStorage.setItem("author", JSON.stringify(author));
            localStorage.setItem("email", JSON.stringify(email));
            localStorage.setItem("website", JSON.stringify(website));

            api.create($("#isso-thread").getAttribute("data-isso-id"), {
                author: author, email: email, website: website,
                text: utils.text($(".textarea", el).innerHTML),
                parent: parent || null
            }).then(function(comment) {
                $(".textarea", el).innerHTML = "";
                $(".textarea", el).blur();
                insert(comment, true);

                if (parent !== null) {
                    el.onsuccess();
                }
            });
        });

        lib.editorify($(".textarea", el));

        return el;
    };

    var insert_loader = function(comment, lastcreated) {
        var entrypoint;
        if (comment.id === null) {
            entrypoint = $("#isso-root");
            comment.name = 'null';
        } else {
            entrypoint = $("#isso-" + comment.id + " > .text-wrapper > .isso-follow-up");
            comment.name = comment.id;
        }
        var el = $.htmlify(jade.render("comment-loader", {"comment": comment}));

        entrypoint.append(el);

        $("a.load_hidden", el).on("click", function() {
            el.remove();
            api.fetch($("#isso-thread").getAttribute("data-isso-id"),
                config["reveal-on-click"], config["max-comments-nested"],
                comment.id,
                lastcreated).then(
                function(rv) {
                    if (rv.total_replies === 0) {
                        return;
                    }

                    var lastcreated = 0;
                    rv.replies.forEach(function(commentObject) {
                        insert(commentObject, false);
                        if(commentObject.created > lastcreated) {
                            lastcreated = commentObject.created;
                        }
                    });

                    if(rv.hidden_replies > 0) {
                        insert_loader(rv, lastcreated);
                    }
                },
                function(err) {
                    console.log(err);
                });
        });
    };

    var insert = function(comment, scrollIntoView) {
        var el = $.htmlify(jade.render("comment", {"comment": comment}));

        // update datetime every 60 seconds
        var refresh = function() {
            $(".permalink > time", el).textContent = utils.ago(
                globals.offset.localTime(), new Date(parseInt(comment.created, 10) * 1000));
            setTimeout(refresh, 60*1000);
        };

        // run once to activate
        refresh();

        if (config["avatar"]) {
            $("div.avatar > svg", el).replace(lib.identicons.generate(comment.hash, 4, 48));
        }

        var entrypoint;
        if (comment.parent === null) {
            entrypoint = $("#isso-root");
        } else {
            entrypoint = $("#isso-" + comment.parent + " > .text-wrapper > .isso-follow-up");
        }

        entrypoint.append(el);

        if (scrollIntoView) {
            el.scrollIntoView();
        }

        var footer = $("#isso-" + comment.id + " > .text-wrapper > .isso-comment-footer"),
            header = $("#isso-" + comment.id + " > .text-wrapper > .isso-comment-header"),
            text   = $("#isso-" + comment.id + " > .text-wrapper > .text");

        var form = null;  // XXX: probably a good place for a closure
        $("a.reply", footer).toggle("click",
            function(toggler) {
                form = footer.insertAfter(new Postbox(comment.parent === null ? comment.id : comment.parent));
                form.onsuccess = function() { toggler.next(); };
                $(".textarea", form).focus();
                $("a.reply", footer).textContent = i18n.translate("comment-close");
            },
            function() {
                form.remove();
                $("a.reply", footer).textContent = i18n.translate("comment-reply");
            }
        );

        if (config.vote) {
            // update vote counter, but hide if votes sum to 0
            var votes = function (value) {
                var span = $("span.votes", footer);
                if (span === null) {
                    if (value !== 0) {
                        footer.prepend($.new("span.votes", value));
                    }
                } else {
                    if (value === 0) {
                        span.remove();
                    } else {
                        span.textContent = value;
                    }
                }
            };

            $("a.upvote", footer).on("click", function () {
                api.like(comment.id).then(function (rv) {
                    votes(rv.likes - rv.dislikes);
                });
            });

            $("a.downvote", footer).on("click", function () {
                api.dislike(comment.id).then(function (rv) {
                    votes(rv.likes - rv.dislikes);
                });
            });
        }

        $("a.edit", footer).toggle("click",
            function(toggler) {
                var edit = $("a.edit", footer);
                var avatar = $(".avatar", el, false)[0];

                edit.textContent = i18n.translate("comment-save");
                edit.insertAfter($.new("a.cancel", i18n.translate("comment-cancel"))).on("click", function() {
                    toggler.canceled = true;
                    toggler.next();
                });

                toggler.canceled = false;
                api.view(comment.id, 1).then(function(rv) {
                    var textarea = lib.editorify($.new("div.textarea"));

                    textarea.innerHTML = utils.detext(rv.text);
                    textarea.focus();

                    text.classList.remove("text");
                    text.classList.add("textarea-wrapper");

                    text.textContent = "";
                    text.append(textarea);
                });

                if (avatar !== null) {
                    avatar.hide();
                }
            },
            function(toggler) {
                var textarea = $(".textarea", text);
                var avatar = $(".avatar", el, false)[0];

                if (! toggler.canceled && textarea !== null) {
                    if (utils.text(textarea.innerHTML).length < 3) {
                        textarea.focus();
                        toggler.wait();
                        return;
                    } else {
                        api.modify(comment.id, {"text": utils.text(textarea.innerHTML)}).then(function(rv) {
                            text.innerHTML = rv.text;
                            comment.text = rv.text;
                        });
                    }
                } else {
                    text.innerHTML = comment.text;
                }

                text.classList.remove("textarea-wrapper");
                text.classList.add("text");

                if (avatar !== null) {
                    avatar.show();
                }

                $("a.cancel", footer).remove();
                $("a.edit", footer).textContent = i18n.translate("comment-edit");
            }
        );

        $("a.delete", footer).toggle("click",
            function(toggler) {
                var del = $("a.delete", footer);
                var state = ! toggler.state;

                del.textContent = i18n.translate("comment-confirm");
                del.on("mouseout", function() {
                    del.textContent = i18n.translate("comment-delete");
                    toggler.state = state;
                    del.onmouseout = null;
                });
            },
            function() {
                var del = $("a.delete", footer);
                api.remove(comment.id).then(function(rv) {
                    if (rv) {
                        el.remove();
                    } else {
                        $("span.note", header).textContent = i18n.translate("comment-deleted");
                        text.innerHTML = "<p>&nbsp;</p>";
                        $("a.edit", footer).remove();
                        $("a.delete", footer).remove();
                    }
                    del.textContent = i18n.translate("comment-delete");
                });
            }
        );

        // remove edit and delete buttons when cookie is gone
        var clear = function(button) {
            if (! utils.cookie("isso-" + comment.id)) {
                if ($(button, footer) !== null) {
                    $(button, footer).remove();
                }
            } else {
                setTimeout(function() { clear(button); }, 15*1000);
            }
        };

        clear("a.edit");
        clear("a.delete");

        // show direct reply to own comment when cookie is max aged
        var show = function(el) {
            if (utils.cookie("isso-" + comment.id)) {
                setTimeout(function() { show(el); }, 15*1000);
            } else {
                footer.append(el);
            }
        };

        if (! config["reply-to-self"] && utils.cookie("isso-" + comment.id)) {
            show($("a.reply", footer).detach());
        }

        if(comment.hasOwnProperty('replies')) {
            var lastcreated = 0;
            comment.replies.forEach(function(replyObject) {
                insert(replyObject, false);
                if(replyObject.created > lastcreated) {
                    lastcreated = replyObject.created;
                }

            });
            if(comment.hidden_replies > 0) {
                insert_loader(comment, lastcreated);
            }

        }

    };

    return {
        insert: insert,
        insert_loader: insert_loader,
        Postbox: Postbox
    };
});

define('app/count',["app/api", "app/dom", "app/i18n"], function(api, $, i18n) {
    return function() {

        var objs = {};

        $.each("a", function(el) {
            if (! el.href.match(/#isso-thread$/)) {
                return;
            }

            var tid = el.getAttribute("data-isso-id") ||
                      el.href.match(/^(.+)#isso-thread$/)[1]
                             .replace(/^.*\/\/[^\/]+/, '');

            if (tid in objs) {
                objs[tid].push(el);
            } else {
                objs[tid] = [el];
            }
        });

        var urls = Object.keys(objs);

        api.count(urls).then(function(rv) {
            for (var key in objs) {
                if (objs.hasOwnProperty(key)) {

                    var index = urls.indexOf(key);

                    for (var i = 0; i < objs[key].length; i++) {
                        objs[key][i].textContent = i18n.pluralize("num-comments", rv[index]);
                    }
                }
            }
        });
    };
});

define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});

define('text!app/../../css/isso.css',[],function () { return '#isso-thread * {\n    -webkit-box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    box-sizing: border-box;\n}\n#isso-thread a {\n    text-decoration: none;\n}\n\n#isso-thread {\n    padding: 0;\n    margin: 0;\n}\n#isso-thread > h4 {\n    color: #555;\n    font-weight: bold;\n}\n#isso-thread .textarea {\n    min-height: 58px;\n    outline: 0;\n}\n#isso-thread .textarea.placeholder {\n    color: #AAA;\n}\n\n.isso-comment {\n    max-width: 68em;\n    padding-top: 0.95em;\n    margin: 0.95em auto;\n}\n.isso-comment:not(:first-of-type),\n.isso-follow-up .isso-comment {\n    border-top: 1px solid rgba(0, 0, 0, 0.1);\n}\n.isso-comment > div.avatar,\n.isso-postbox > .avatar {\n    display: block;\n    float: left;\n    width: 7%;\n    margin: 3px 15px 0 0;\n}\n.isso-postbox > .avatar {\n    float: left;\n    margin: 5px 10px 0 5px;\n    width: 48px;\n    height: 48px;\n    overflow: hidden;\n}\n.isso-comment > div.avatar > svg,\n.isso-postbox > .avatar > svg {\n    max-width: 48px;\n    max-height: 48px;\n    border: 1px solid rgba(0, 0, 0, 0.2);\n    border-radius: 3px;\n    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.isso-comment > div.text-wrapper {\n    display: block;\n}\n.isso-comment .isso-follow-up {\n    padding-left: calc(7% + 20px);\n}\n.isso-comment > div.text-wrapper > .isso-comment-header, .isso-comment > div.text-wrapper > .isso-comment-footer {\n    font-size: 0.95em;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header {\n    font-size: 0.85em;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header .spacer {\n    padding: 0 6px;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header .spacer,\n.isso-comment > div.text-wrapper > .isso-comment-header a.permalink,\n.isso-comment > div.text-wrapper > .isso-comment-header .note,\n.isso-comment > div.text-wrapper > .isso-comment-header a.parent {\n    color: gray !important;\n    font-weight: normal;\n    text-shadow: none !important;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header .spacer:hover,\n.isso-comment > div.text-wrapper > .isso-comment-header a.permalink:hover,\n.isso-comment > div.text-wrapper > .isso-comment-header .note:hover,\n.isso-comment > div.text-wrapper > .isso-comment-header a.parent:hover {\n    color: #606060 !important;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header .note {\n    float: right;\n}\n.isso-comment > div.text-wrapper > .isso-comment-header .author {\n    font-weight: bold;\n    color: #555;\n}\n.isso-comment > div.text-wrapper > .textarea-wrapper .textarea {\n    margin-top: 0.2em;\n}\n.isso-comment > div.text-wrapper > div.text p {\n    margin-top: 0.2em;\n}\n.isso-comment > div.text-wrapper > div.text p:last-child {\n    margin-bottom: 0.2em;\n}\n.isso-comment > div.text-wrapper > div.text h1,\n.isso-comment > div.text-wrapper > div.text h2,\n.isso-comment > div.text-wrapper > div.text h3,\n.isso-comment > div.text-wrapper > div.text h4,\n.isso-comment > div.text-wrapper > div.text h5,\n.isso-comment > div.text-wrapper > div.text h6 {\n    font-size: 130%;\n    font-weight: bold;\n}\n.isso-comment > div.text-wrapper > div.textarea-wrapper .textarea {\n    width: 100%;\n    border: 1px solid #f0f0f0;\n    border-radius: 2px;\n    box-shadow: 0 0 2px #888;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer {\n    font-size: 0.80em;\n    color: gray !important;\n    clear: left;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer a {\n    font-weight: bold;\n    text-decoration: none;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer a:hover {\n    color: #111111 !important;\n    text-shadow: #aaaaaa 0 0 1px !important;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer > a {\n    position: relative;\n    top: .2em;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer > a + a {\n    padding-left: 1em;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer .votes {\n    color: gray;\n}\n.isso-comment > div.text-wrapper > .isso-comment-footer .upvote svg,\n.isso-comment > div.text-wrapper > .isso-comment-footer .downvote svg {\n    position: relative;\n    top: .2em;\n}\n.isso-comment .isso-postbox {\n    margin-top: 0.8em;\n}\n\n.isso-postbox {\n    max-width: 68em;\n    margin: 0 auto 2em;\n}\n.isso-postbox > .form-wrapper {\n    display: block;\n    padding: 0;\n}\n.isso-postbox > .form-wrapper > .auth-section,\n.isso-postbox > .form-wrapper > .auth-section .post-action {\n    display: block;\n}\n.isso-postbox > .form-wrapper .textarea {\n    margin: 0 0 .3em;\n    padding: .4em .8em;\n    border-radius: 3px;\n    background-color: #fff;\n    border: 1px solid rgba(0, 0, 0, 0.2);\n    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n#isso-thread .textarea:focus,\n#isso-thread input:focus {\n    border-color: rgba(0, 0, 0, 0.8);\n}\n.isso-postbox > .form-wrapper > .auth-section .input-wrapper {\n    display: inline-block;\n    position: relative;\n    max-width: 25%;\n    margin: 0;\n}\n.isso-postbox > .form-wrapper > .auth-section .input-wrapper input {\n    padding: .3em 10px;\n    max-width: 100%;\n    border-radius: 3px;\n    background-color: #fff;\n    line-height: 1.4em;\n    border: 1px solid rgba(0, 0, 0, 0.2);\n    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.isso-postbox > .form-wrapper > .auth-section .post-action {\n    display: inline-block;\n    float: right;\n    margin: 0;\n}\n.isso-postbox > .form-wrapper > .auth-section .post-action > input {\n    padding: calc(.3em - 1px);\n    border-radius: 2px;\n    border: 1px solid #CCC;\n    background-color: #DDD;\n    cursor: pointer;\n    outline: 0;\n    line-height: 1.4em;\n    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.isso-postbox > .form-wrapper > .auth-section .post-action > input:hover {\n    background-color: #CCC;\n}\n.isso-postbox > .form-wrapper > .auth-section .post-action > input:active {\n    background-color: #BBB;\n}\n@media screen and (max-width:600px) {\n    .isso-postbox > .form-wrapper > .auth-section .input-wrapper {\n        display: block;\n        max-width: 100%;\n        margin: 0 0 .3em;\n    }\n    .isso-postbox > .form-wrapper > .auth-section .input-wrapper input {\n        width: 100%;\n    }\n    .isso-postbox > .form-wrapper > .auth-section .post-action {\n        display: block;\n        float: none;\n        text-align: right;\n    }\n}\n';});

define('app/text/css',["text!../../../css/isso.css"], function(isso) {
    return {
        inline: isso
    };
});


define('text!app/text/arrow-down.svg',[],function () { return '<!-- Generator: IcoMoon.io --><svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="gray">\n  <g>\n    <path d="M 24.773,13.701c-0.651,0.669-7.512,7.205-7.512,7.205C 16.912,21.262, 16.456,21.44, 16,21.44c-0.458,0-0.914-0.178-1.261-0.534 c0,0-6.861-6.536-7.514-7.205c-0.651-0.669-0.696-1.87,0-2.586c 0.698-0.714, 1.669-0.77, 2.522,0L 16,17.112l 6.251-5.995 c 0.854-0.77, 1.827-0.714, 2.522,0C 25.47,11.83, 25.427,13.034, 24.773,13.701z">\n    </path>\n  </g>\n</svg>\n';});


define('text!app/text/arrow-up.svg',[],function () { return '<!-- Generator: IcoMoon.io --><svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="gray">\n  <g>\n    <path d="M 24.773,18.299c-0.651-0.669-7.512-7.203-7.512-7.203C 16.912,10.739, 16.456,10.56, 16,10.56c-0.458,0-0.914,0.179-1.261,0.536 c0,0-6.861,6.534-7.514,7.203c-0.651,0.669-0.696,1.872,0,2.586c 0.698,0.712, 1.669,0.77, 2.522,0L 16,14.89l 6.251,5.995 c 0.854,0.77, 1.827,0.712, 2.522,0C 25.47,20.17, 25.427,18.966, 24.773,18.299z">\n    </path>\n  </g>\n</svg>\n';});

define('app/text/svg',["text!./arrow-down.svg", "text!./arrow-up.svg"], function (arrdown, arrup) {
    return {
        "arrow-down": arrdown,
        "arrow-up": arrup
    };
});

/*
 * Copyright 2014, Martin Zimmermann <info@posativ.org>. All rights reserved.
 * Distributed under the MIT license
 */

require(["app/lib/ready", "app/config", "app/i18n", "app/api", "app/isso", "app/count", "app/dom", "app/text/css", "app/text/svg", "app/jade"], function(domready, config, i18n, api, isso, count, $, css, svg, jade) {

    

    jade.set("conf", config);
    jade.set("i18n", i18n.translate);
    jade.set("pluralize", i18n.pluralize);
    jade.set("svg", svg);

    domready(function() {

        if (config["css"]) {
            var style = $.new("style");
            style.type = "text/css";
            style.textContent = css.inline;
            $("head").append(style);
        }

        count();

        if ($("#isso-thread") === null) {
            return console.log("abort, #isso-thread is missing");
        }

        $("#isso-thread").append($.new('h4'));
        $("#isso-thread").append(new isso.Postbox(null));
        $("#isso-thread").append('<div id="isso-root"></div>');

        api.fetch($("#isso-thread").getAttribute("data-isso-id"),
            config["max-comments-top"],
            config["max-comments-nested"]).then(
            function(rv) {
                if (rv.total_replies === 0) {
                    $("#isso-thread > h4").textContent = i18n.translate("no-comments");
                    return;
                }

                var lastcreated = 0;
                var count = rv.total_replies;
                rv.replies.forEach(function(comment) {
                    isso.insert(comment, false);
                    if(comment.created > lastcreated) {
                        lastcreated = comment.created;
                    }
                    count = count + comment.total_replies;
                });
                $("#isso-thread > h4").textContent = i18n.pluralize("num-comments", count);

                if(rv.hidden_replies > 0) {
                    isso.insert_loader(rv, lastcreated);
                }

                if (window.location.hash.length > 0) {
                    $(window.location.hash).scrollIntoView();
                }
            },
            function(err) {
                console.log(err);
            }
        );
    });
});

define("embed", function(){});

}());