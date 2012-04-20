/*jslint white: true, maxerr: 50, indent: 4 */
/*global $ */

var TwitterService = TwitterService || (function () {
    var me,
        WEB_SERVICE = "http://search.twitter.com/search.json";
    
    function doCall(data, success_cb, error_cb) {
        $.ajax({
            type : 'GET',
            url : WEB_SERVICE,
            data : data,
            dataType : 'jsonp'
        })
        .done(success_cb)
        .fail(error_cb);
        //.always(function() {console.log(arguments);});
    }

    me = {
        CallSearch : function (query, success_cb, error_cb) {
            var data = {
                q : query,
                rpp : 25,
                lang : 'en',
                result_type : 'mixed'
            };
            
            doCall(data, success_cb, error_cb);
        }
    };
    
    return me;
}());
