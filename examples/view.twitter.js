/*global $, TwitterService, console */

// Using a global variable to share twitter results for now
var SEARCH_RESULT = null;

// This handles the twitter search and displays the list of tweets

$(document).on('pageinit', '#start', function (event) {
    
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
                        html += '<li class="tweets"><a href="#tweet" data-transition="slide" id="' + item.id_str + '"><img src="' + item.profile_image_url + '" \/>' + item.from_user + ': <span class="tweet_text">' + item.text + '<\/span><\/a><\/li>';
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
    
    $('#tweet-list').on('click', 'li a', function (event) {
        var me = $(this),
            id_str = me.attr('id'),
            item = null, 
            curr_item, i;
        
        for (i in SEARCH_RESULT.results) {
            if (SEARCH_RESULT.results.hasOwnProperty(i)) {
                curr_item = SEARCH_RESULT.results[i];
                if (curr_item.id_str === id_str) {
                    item = curr_item;
                    break;
                }
            }
        }
        
        if (item) {
            $('#profile_image_url').attr('src', item.profile_image_url);
            $('#from_user').text(item.from_user);
            $('#from_user_name').text(item.from_user_name);
            $('#text').text(item.text);
            $('#created_at').text(item.created_at);
            
            // The source is html-escaped, so this turns it back into html
            $('#source').html(item.source);
            $('#source').html($('#source').text());
        }
        
        // Attach the item to the DOM so we can retrieve it later
        $('#options').data(item);
        
        // Allow propogation so we follow the href link anyway to the page
        return true;
    });
});

