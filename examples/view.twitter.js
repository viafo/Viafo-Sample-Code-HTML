/*global $, TwitterService, console */

// Using a global variable to share twitter results for now
var SEARCH_RESULT = null;

$(document).on('pageinit', function (event) {
    
    $('#search-form').submit(function () {
        var query = $('#search-box').val();
        
        $.mobile.showPageLoadingMsg("b", "Searching...");
        
        TwitterService.CallSearch(query, 
            function (data, result, xhr) {
                var $page = $('#start'),
                    $list = $page.find("#tweet-list"),
                    html = '',
                    i, item;
                
                SEARCH_RESULT = data;
                
                for (i in data.results) {
                    if (data.results.hasOwnProperty(i)) {
                        item = data.results[i];
                        html += '<li class="tweets""><a href="#share" data-rel="dialog" data-transition="slide" id="' + item.id_str + '"><img src="' + item.profile_image_url + '" \/>' + item.from_user + ': <span class="tweet_text">' + item.text + '<\/span><\/a><\/li>';
                    }
                }
                
                $list.html(html);
                $list.on('create');
                $list.listview('refresh');
                
                $.mobile.hidePageLoadingMsg();
            },
            function () {
                console.log(arguments);
                alert("Problem communicating with twitter");
                $.mobile.hidePageLoadingMsg();
            });
        
        return false;
    });
});
