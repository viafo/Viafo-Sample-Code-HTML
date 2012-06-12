/*jslint white: true, maxerr: 50, indent: 4 */
/*global VIAFO_SETTINGS, $, window, document, alert, console, localStorage, urlhandler */


var ViafoService = ViafoService || (function () {
    "use strict";
    
    var me,
        // Private variables
        VIAFO_ACCESS_TOKEN = null;
    
    // PRIVATE FUNCTIONS
    
    function eventNameToFunc(callback) {
        var f = function () {};
        if (callback) {
            if (typeof callback === 'function') {
                f = callback;
            } else {
                f = function () {
                    $(document).trigger(callback, arguments);
                };
            }
        }
        return f;
    }
    
    function doCall(path, data, success_cb, error_cb) {
        $.ajax({
            type : 'POST',
            url : VIAFO_SETTINGS.ENDPOINT + path,
            data : data,
            dataType : 'json'
        })
        .done(eventNameToFunc(success_cb))
        .fail(eventNameToFunc(error_cb));
        //.always(function() {console.log(arguments);});
    }
    
    function callAction_i(service_name, verb, data, success_cb, error_cb) {
        data = data || {};
        data.access_token = VIAFO_ACCESS_TOKEN;
        
        doCall(service_name + '/' + verb + '.json', 
            data,
            success_cb,
            error_cb);
    }
    
    function callProxy_i(service_name, domain, path, method, params, success_cb, error_cb) {
        params = params || {};
        params.access_token = VIAFO_ACCESS_TOKEN;
        params._path = path;
        
        $.ajax({
            type : 'POST',
            url : VIAFO_SETTINGS.ENDPOINT + 'proxy/' + service_name + '/' + domain + '/' + method + '.json',
            data : params,
            dataType : 'json'
        })
        .done(eventNameToFunc(success_cb))
        .fail(eventNameToFunc(error_cb));
        //.always(function() {console.log(arguments);});
    }
    
    function reportError(msg) {
        console.error(msg);
        alert(msg);
    }
    
    
    // VIAFO SERVICE OBJECT

    me = {
        // App variables
        
        // Set this to true if the services list needs to refreshed (e.g. if the app goes
        // into the background and then back to the foreground)
        VIAFO_SERVICES_REFRESH : false,
        
        // Number of times retries we've had (fails after 3)
        RETRY_COUNT : 0,
        
        Init : function (success_cb, error_cb) {
            
            // Helper functions for the register code
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }
            
            function guid() {
                return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
            }
            
            if (!window.VIAFO_SETTINGS) {
                reportError("VIAFO DEVELOPER: no VIAFO_SETTINGS defined. Please edit the script in this html file");
                return;
            }
            
            if (!VIAFO_SETTINGS.CLIENT_ID || !VIAFO_SETTINGS.CLIENT_SECRET) {
                reportError("VIAFO DEVELOPER: no CLIENT_ID and/or CLIENT_SECRET defined");
                return;
            }
            
            // Set optional settings to defaults
            VIAFO_SETTINGS.GetAccessToken = VIAFO_SETTINGS.GetAccessToken || function () {
                var token;
                if (typeof window.localStorage !== 'undefined') {
                    token = localStorage.getItem(VIAFO_SETTINGS.CLIENT_ID);
                } else {
                    reportError("VIAFO DEVELOPER: HTML5 localStorage not supported, you need to define a VIAFO_SETTINGS.GetAccessToken function");
                }
                return token;
            };
            
            VIAFO_SETTINGS.SetAccessToken = VIAFO_SETTINGS.SetAccessToken || function (token) {
                if (typeof window.localStorage !== 'undefined') {
                    localStorage.setItem(VIAFO_SETTINGS.CLIENT_ID, token);
                } else {
                    reportError("VIAFO DEVELOPER: HTML5 localStorage not supported, you need to define a VIAFO_SETTINGS.SetAccessToken function");
                }
            };
            
            VIAFO_SETTINGS.GetReturnUrl = VIAFO_SETTINGS.GetReturnUrl || function () {
                return (typeof window.Qt !== 'undefined') ? '' : encodeURIComponent(window.location.toString());
            };
            
            VIAFO_SETTINGS.GetUUID = VIAFO_SETTINGS.GetUUID || function () { 
                return guid();
            };
            
            VIAFO_SETTINGS.OpenBrowserWindow = VIAFO_SETTINGS.OpenBrowserWindow || function (url) {
                if (typeof window.urlhandler !== 'undefined') {
                    urlhandler.openUrl(url);
                } else {
                    window.location = url;
                }
            };
            
            if (!VIAFO_ACCESS_TOKEN || VIAFO_ACCESS_TOKEN.length !== 64) {
                VIAFO_ACCESS_TOKEN = null;
                VIAFO_ACCESS_TOKEN = VIAFO_SETTINGS.GetAccessToken();
            }
        
            if (!VIAFO_ACCESS_TOKEN) {
                me.CallRegister(function (data, result, xhr) {
                        $(document).trigger('com.viafo.ready');
                        success_cb = eventNameToFunc(success_cb);
                        success_cb(data, result, xhr);
                    },
                    error_cb);
            } else {
                me.CallGetServices(function (data, result, xhr) {
                        $(document).trigger('com.viafo.ready');
                        success_cb = eventNameToFunc(success_cb);
                        success_cb(data, result, xhr);
                    }, 
                    error_cb);
            }
        },
        
        GetAccessToken : function () {
            return VIAFO_ACCESS_TOKEN;  
        },
        
        CallRegister : function (success_cb, error_cb) {
            var data = {
                'uuid' : VIAFO_SETTINGS.GetUUID(),
                'client_id' : VIAFO_SETTINGS.CLIENT_ID,
                'client_secret': VIAFO_SETTINGS.CLIENT_SECRET
            };
            
            doCall('register.json', 
                data, 
                function (data, result, xhr) {
                    VIAFO_ACCESS_TOKEN = data.access_token;
                    VIAFO_SETTINGS.SetAccessToken(VIAFO_ACCESS_TOKEN);
                    
                    me.CallGetServices(success_cb, error_cb);
                }, 
                error_cb);
        },
        
        CallGetServices : function (success_cb, error_cb) {
            var retUrl = VIAFO_SETTINGS.GetReturnUrl(),
                data = {
                    //'verbs' : 'share',
                    'access_token': VIAFO_ACCESS_TOKEN,
                    'return_url' : retUrl
                };
            
            doCall('get_services.json', 
                data, 
                function (data, result, xhr) {
                    var i, service, services = [];
                    
                    $.each(data.authenticated, function (i, service) {
                            service.authenticated = true;
                            services.push(service);
                        });
                    $.each(data.available, function (i, service) {
                            service.authenticated = false;
                            services.push(service);
                        });
                    
                    me.VIAFO_SERVICES = services;
                    me.VIAFO_SERVICES_REFRESH = false;
                    me.RETRY_COUNT = 0;
                    
                    $(document).trigger('com.viafo.got_services', [services]);
                    
                    success_cb = eventNameToFunc(success_cb);
                    success_cb(data, result, xhr);
                }, 
                function (xhr, result, msg) {
                    if (xhr && xhr.status) {
                        if (xhr.status === 401) {
                            me.RETRY_COUNT = 0;
                            me.VIAFO_SERVICES_REFRESH = true;
                            
                            VIAFO_ACCESS_TOKEN = null;
                            me.CallRegister(success_cb, error_cb);
                            return;
                        }
                        
                        me.RETRY_COUNT += 1;
                        
                        if (me.RETRY_COUNT < 3) {
                            me.CallGetServices(success_cb, error_cb);
                        } else {
                            me.VIAFO_SERVICES_REFRESH = true;
                            me.RETRY_COUNT = 0;
                            
                            error_cb = eventNameToFunc(error_cb);
                            error_cb(xhr, result, msg);
                        }
                    }
                });
        },
        
        GetService: function (service_name) {
            var i, s, service = null;
            
            if (me.VIAFO_SERVICES) {
                $.each(me.VIAFO_SERVICES, function (index, value) { 
                    if (value.name === service_name) {
                        service = value;
                        return true;
                    }
                });
            }
            
            return service;  
        },
        
        GetServicesByVerb: function (verb) {
            var i, s, services = [];
            
            if (me.VIAFO_SERVICES) {
                $.each(me.VIAFO_SERVICES, function (index, value) { 
                    if (typeof value.services[verb] !== 'undefined') {
                        services.push(value);
                    }
                });
            }
            
            return services;
        },
        
        CheckForAuth : function (service_name, success_cb, error_cb, askUserForAuth_cb) {
            
            service_name = service_name.toLowerCase();
            
            if (me.VIAFO_SERVICES_REFRESH) {
                me.CallGetServices(function (/*data, result, xhr*/) {
                        me.CheckForAuth(service_name, success_cb, error_cb, askUserForAuth_cb);
                    },
                    error_cb);
                return;
            }
            
            var service = me.GetService(service_name);
            
            if (service) {
                if (service.authenticated) {
                    success_cb = eventNameToFunc(success_cb);
                    success_cb(service);
                } else {
                    askUserForAuth_cb = eventNameToFunc(askUserForAuth_cb);
                    askUserForAuth_cb(service, function () {
                            var url = service.url;
                                
                            if (typeof VIAFO_SETTINGS.SCOPES !== 'undefined' &&
                                typeof VIAFO_SETTINGS.SCOPES[service.name] !== 'undefined') {
                            
                                url += '&scope=' + VIAFO_SETTINGS.SCOPES[service.name];
                            }
                            
                            VIAFO_SETTINGS.OpenBrowserWindow(url);
                            me.VIAFO_SERVICES_REFRESH = true;
                        });
                }
            } else {
				error_cb(null, "Error", "No such service: " + service_name);
			}
        },
        
        Authenticate : function (service_name, signIn, success_cb, error_cb, askUserForAuth_cb) {
            
            if (me.VIAFO_SERVICES_REFRESH) {
                me.CallGetServices(function (/*data, result, xhr*/) {
                        me.Authenticate(service_name, signIn, success_cb, error_cb, askUserForAuth_cb);
                    },
                    error_cb);
                return;
            }
            
            var service = me.GetService(service_name);
            
            if (service) {
                if (signIn) {
                    if (service.authenticated) {
                        success_cb = eventNameToFunc(success_cb);
                        success_cb(service);
                    } else {
                        askUserForAuth_cb = eventNameToFunc(askUserForAuth_cb);
                        askUserForAuth_cb(service, function () {
                                var url = service.url;
                                
                                if (typeof VIAFO_SETTINGS.SCOPES !== 'undefined' &&
                                        typeof VIAFO_SETTINGS.SCOPES[service.name] !== 'undefined') {
                                
                                    url += '&scope=' + VIAFO_SETTINGS.SCOPES[service.name];
                                }
                                
                                VIAFO_SETTINGS.OpenBrowserWindow(url);
                                me.VIAFO_SERVICES_REFRESH = true;
                            });
                    }
                } else {
                    if (service.authenticated) {
                        $.ajax({ 
                            url: service.url,
                            type: "GET"
                        })
                        .always(function () {
                            service.authenticated = false;
                            me.VIAFO_SERVICES_REFRESH = true;
                            success_cb = eventNameToFunc(success_cb);
                            success_cb(service);
                        });
                    } else {
                        success_cb = eventNameToFunc(success_cb);
                        success_cb(service);                        
                    }
                }
            }
        },
        
        CallAction : function (service_name, verb, data, success_cb, error_cb, askUserForAuth_cb) {
            me.CheckForAuth(service_name, function () {
                callAction_i(service_name, verb, data, success_cb, error_cb);
            },
            error_cb,
            askUserForAuth_cb);
        },
        
        CallProxy : function (service_name, domain, path, method, params, success_cb, error_cb, askUserForAuth_cb) {
            me.CheckForAuth(service_name, function () {
                callProxy_i(service_name, domain, path, method, params, success_cb, error_cb);
            },
            error_cb,
            askUserForAuth_cb);
        },
        
        //
        // Helper functions from here on
        //
        
        // Generic set status function        
        CallStatus : function (service_name, text, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            var params = {};
            
            if (text) {
                params.text = text;
            }
            if (lat) {
                params.lat = lat;
                params.lng = lng;
            }
            
            return me.CallAction(service_name, 'status', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Generic reply function
        CallReply : function (service_name, id, text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            var params = {};
            
            if (id) {
                params.id = id;
            }
            if (text) {
                params.text = text;
            }
            if (link) {
                params.link = link;
            }
            if (lat) {
                params.lat = lat;
                params.lng = lng;
            }
            
            return me.CallAction(service_name, 'reply', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Generic share function
        CallShare : function (service_name, text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb, params) {
            var params = params || {};
            
            if (text) {
                params.text = text;
            }
            if (link) {
                params.link = link;
            }
            if (lat) {
                params.lat = lat;
                params.lng = lng;
            }
            
            return me.CallAction(service_name, 'share', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Generic retweet function
        CallRetweet : function (service_name, id, success_cb, error_cb, askUserForAuth_cb) {
            var params = {};
            
            if (id) {
                params.id = id;
            }
            
            return me.CallAction(service_name, 'retweet', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Generic follow function
        CallFollow : function (service_name, id, success_cb, error_cb, askUserForAuth_cb) {
            var params = {};
            
            if (id) {
                params.id = id;
            }
            
            return me.CallAction(service_name, 'follow', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Generic check-in function
        CallCheckin : function (service_name, id, text, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            var params = {};
            
            if (id) {
                params.id = id;
            }
            if (text) {
                params.text = text;
            }
            if (lat) {
                params.lat = lat;
                params.lng = lng;
            }
            
            return me.CallAction(service_name, 'checkin', params, success_cb, error_cb, askUserForAuth_cb);
        },
        
        
        //
        // Twitter functionality helpers - if your app is always going to have Twitter enabled, you can safely
        // use these.
        //
        
        // All parameters are optional, although you should probably set text
        CallTwitterStatus: function (text, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallStatus('twitter', text, lat, lng, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // All parameters are optional, except for id - the id of the tweet you're replying to
        CallTwitterReply : function (id, text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallReply('twitter', id, text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // All parameters are optional
        CallTwitterShare : function (text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallShare('twitter', text, link, lat, lng, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Must specify id - the id of the tweet you're retweeting
        CallTwitterRetweet : function (id, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallRetweet('twitter', id, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // Must specify id - the screen name of user you want to follow
        CallTwitterFollow : function (id, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallFollow('twitter', id, success_cb, error_cb, askUserForAuth_cb);
        },

        //
        // Facebook functionality helpers - if your app is always going to have Facebook enabled, you can safely
        // use these.
        //
        
        // All parameters are optional, although you should probably set text
        CallFacebookStatus: function (text, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallStatus('facebook', text, null, null, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // All parameters are optional, although you should probably set text
        CallFacebookReply: function (id, text, link, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallReply('facebook', id, text, link, null, null, success_cb, error_cb, askUserForAuth_cb);
        },
        
        // All parameters are optional, although you should probably set text
        CallFacebookShare : function (text, link, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallShare('facebook', text, link, null, null, success_cb, error_cb, askUserForAuth_cb);
        },
        
        //
        // Foursquare functionality helpers - if your app is always going to have Foursquare enabled, you can safely
        // use these.
        //
        
        // Must specify id - the location id of the place you want to check-in to
        CallFoursquareCheckin : function (id, text, lat, lng, success_cb, error_cb, askUserForAuth_cb) {
            return me.CallCheckin('foursquare', id, text, lat, lng, success_cb, error_cb, askUserForAuth_cb);
        }
    };
    
    return me;
}());

