/*jslint white: true, maxerr: 50, indent: 4 */
/*global ViafoService, VIAFO_SETTINGS, $, console, window */


//
// jQuery mobile uses pageinit instead of document.on('ready')
//
$(document).on('pageinit', function () {
    "use strict";
    
    $('#get_services').button('disable');
    $('#clear_token').button('disable');
    
    $('#call_init').on('click', function () {
        $.mobile.showPageLoadingMsg('b', 'Calling Init', false);
        ViafoService.Init(function () { 
                console.log(arguments);
            },
            function () {
                console.log(arguments);
            });
    });
    
    $('#get_services').on('click', function () {
        $.mobile.showPageLoadingMsg('b', 'Calling Get Services', false);
        ViafoService.CallGetServices(function () {
                console.log(arguments);
            },
            function () {
                console.log(arguments);
            });
    });
    
    $('#clear_token').on('click', function () {
        VIAFO_SETTINGS.SetAccessToken(null);
        window.location = window.location.toString();
    });
});

//
// When viafo has succesfully registered, we get this call
//
$(document).on('com.viafo.ready', function () {
    $('#access_token').val(ViafoService.GetAccessToken());
    $('#get_services').button('enable');
    $('#clear_token').button('enable');
    $('#call_init').button('disable');
});

//
// This code dynamically creates a list of services, and gives you the ability
// to sign in and exercise any of the available verbs we claim that service supports
//
$(document).on('com.viafo.got_services', function (event, data) {
    var i, service, verb, params, param, value, html = '', scope='', $services = $('#services'),
        VIAFO_AUTH_BASE = VIAFO_SETTINGS.ENDPOINT.split('client').join('auth'),
        access_token = ViafoService.GetAccessToken();
    $('#access_token').val(access_token);
    $.mobile.hidePageLoadingMsg();
    
    for (i in data) {
        if (data.hasOwnProperty(i)) {
            service = data[i];
            html += '<div data-role="collapsible" data-theme="c" data-content-theme="c">';
            html +=     '<h3>' + service.display_name + '</h3>';
            html +=     '<p>';
            html +=         'Auth Status: ' + (service.authenticated ? ' Authenticated ' : ' Not authenticated ');
            html +=         '<a href="' + VIAFO_AUTH_BASE + service.name + '?access_token=' + access_token + '&deauth=true" data-role="button" data-inline="true" data-mini="true">Unauth</a>';
            
            // You can specify a custom scope, depending on your app's needs
            if (typeof VIAFO_SETTINGS.SCOPES !== 'undefined' &&
                typeof VIAFO_SETTINGS.SCOPES[service.name] !== 'undefined') {
               scope = '&scope=' + VIAFO_SETTINGS.SCOPES[service.name];
            } else {
                scope = ''
            }
            
            html +=         '<a href="' + VIAFO_AUTH_BASE + service.name + '?access_token=' + access_token + scope + '" data-role="button" data-theme="b" data-inline="true" data-mini="true">Authenticate</a>';
            html +=         '<div data-role="collapsible-set">';
                    
            for (verb in service.services) {
                if (service.services.hasOwnProperty(verb)) {
                    params = service.services[verb];
                    html += '<div data-role="collapsible" data-theme="b" data-content-theme="b" data-mini="true">';
                    html +=     '<h3>';
                    html +=         verb;
                    html +=     '</h3>';
                    html +=     '<p>';
                    html +=         '<form action="' + VIAFO_SETTINGS.ENDPOINT + service.name + '/' + verb + '.json" method="get" data-service="' + service.name + '" data-verb="' + verb + '">';
                    
                    if (params.hasOwnProperty('lat')) {
                        params.lng = params.lat;
                    }
                    
                    for (param in params) {
                        if (params.hasOwnProperty(param)) {
                            value = params[param];
                            html +=     '<div data-mini="true" data-role="fieldcontain">';
                            html +=         '<label data-mini="true" for="' + service.name + '_' + verb + '_' + param + '">' + param + (value === true ? ' (*)' :'') + '</label>';
                            html +=         '<input data-mini="true" type="text" name="' + param + '" id="' + service.name + '_' + verb + '_' + param + '"';
                            if (param === 'text') {
                                html += ' maxlength="' + value + '"';
                            }
                            html +=                 'data-mini="true"></input>';
                            html +=     '</div>';
                        }
                    }
                    
                    html +=             '<input type="hidden" name="access_token" value="' + ViafoService.GetAccessToken() + '"/>';
                    html +=             '<button type="submit" data-theme="a" data-inline="true" data-mini="true">Submit</button>';
                    html +=         '</form>';
                    html +=     '</p>';
                    html += '</div>';
                }
            }
                    
            html +=         '</div>';
            html +=     '</p>';
            html += '</div>';
        }
    }
    
    $services.html(html).trigger("create");
    $services.collapsibleset('refresh');
    
    // Instead of calling the Viafo Service directly, lets test the Viafo Javascript wrapper
    $services.find('form').submit(function () {
        var params = {}, 
            fields = $(this).find(':input:not(input[type=hidden])').serializeArray();
  
        $.each(fields, function (i, param) {
            params[param.name] = param.value;
        });
        
        ViafoService.CallAction(
            $(this).attr('data-service'), // Service name (e.g. twitter) 
            $(this).attr('data-verb'),  // Verb (e.g. share)
            params,  // the other parameters
            function (data, success, xhr) {
                // On Success - show output
                var $page = $('#response'),
                    $content = $page.children(":jqmData(role=content)"), 
                    html = "<pre>";
                console.log(data);
                
                html += xhr.responseText;
                html += '</pre>';
                
                $content.html(html).trigger('create');
                $.mobile.changePage('#response');
            },
            function (xhr, success, message) {
                // On Error - show output
                var $page = $('#response'),
                    $content = $page.children(":jqmData(role=content)"), 
                    html = "<pre>";
                
                html += xhr.responseText;
                html += '</pre>';
                
                $content.html(html).trigger('create');
                $.mobile.changePage('#response');
            },
            function (service, callback) {
                // If authentication is required, ask the user first
                var $page = $('#response'),
                    $content = $page.children(":jqmData(role=content)"), 
                    html = "";
                
                html += "Not Authenticated with " + service.name + ", do that now?";
                html += '<button id="doAuth" data-role="button" data-theme="b">Authenticate</button>';
                
                $content.html(html).trigger('create');
                $content.find('#doAuth').on('click', function () { 
                    callback();
                });
                $.mobile.changePage('#response');
            });
        
        // Don't go to the URL in the form HTML
        return false;
    });
});