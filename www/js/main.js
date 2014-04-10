var lastParameter = "";
var autocompleteData = null;
var showsData = null;

$(function(){
    $("#input-only-english")
        .on('change', toggleLanguage )
        .prop('checked', $.cookie("only-english"));

    $("#input-reverse-order")
        .on('change', toggleOrder )
        .prop('checked', $.cookie("reverse-order"));

    $( document )
        .on("click", "#season tr", downloadClickListener )
        .on('click', '#navigatorBlock a, #seasonSelector a', pushbackLinkListener);

    if (getUrlParameter())
        loadHashToBlock();

    addShowAutocompleteListener($("#addShowInput"));

    loadShows();
});

function loadHashToBlock() {
    if (!getUrlParameter())
        return;

    $("#listBlock").setLoading(true, 400, "Loading\u2026");
    var season = getSeason();
    if (season !== null) {
        loadSubtitles(getShowId(), season);
    }

    if (!lastParameter || getShowId(lastParameter) != getShowId()) {
        $("#seasonBlock").removeClass("hidden");
        var seasonSelector = $("#seasonSelector");
        seasonSelector.setLoading(true, 75);
        $.ajax({
            url: seasonSelector.data('src'),
            data: { showId: getShowId() },
            success: function (result) {
                if (!result.error) {
                    updateSidebar(result.seasons);
                }
                else {
                    // TODO
                }
            }
        });
    } else {
        var seasonBlocks = $("#seasonSelector > li");
        seasonBlocks.removeClass("selected");
        seasonBlocks.each(function() {
            if (parseInt($(this).text()) == getSeason()) {
                $(this).addClass("selected");
                return false;
            }
            return true;
        });
    }

    highlightCurrentShow();

    lastParameter = getUrlParameter();
}

function loadSubtitles(showId, season) {
    if (showId != getShowId || season != getSeason())
        window.history.pushState("", "", basePath + "/" + showId + "/" + season);

    var subBlock = $("#subtitleBlock");
    var onlyEnglish = $("#input-only-english").is(":checked") ? 1 : 0;
    $.ajax({
        url: subBlock.data('src'),
        data: { showId: showId, season: season, english: onlyEnglish },
        success: function (result) {
            if (!result.error) {
                updateSubtitles(result.data);
            }
            else {
                // TODO
            }
        }
    });
}

function toggleLanguage() {
    if ($(this).is(":checked")) {
        $("#subtitleBlock").addClass("only-english");
        $.cookie("only-english", true, { expires: 30, path: basePath});
    }
    else {
        $("#subtitleBlock").removeClass("only-english");
        $.removeCookie("only-english");
    }

    loadHashToBlock();
}

function toggleOrder() {
    if ($(this).is(":checked")) {
        $.cookie("reverse-order", true, { expires: 30, path: basePath });
    }
    else {
        $.removeCookie("reverse-order");
    }

    loadHashToBlock();
}

function updateSubtitles(data) {
    $("#listBlock")
        .setLoading(false)
        .html('<h3>' + getShowName(true) + '</h3> <hr/>' + data);

    var lastEpisode = -1;
    var table = $("#season > table");
    table.addClass("table table-striped");
    if ($("#input-reverse-order").is(":checked"))
        table.find("tbody").reverseOrder();

    table.find("tr[height]").remove();
    table.find("tr:visible").each(function() {
        $(this).find("td:nth-child(3) > a").contents().unwrap();
        var link = $(this).find("td:nth-child(10) > a");
        if (link.length)
            $(this).data("href", link.attr('href'));

        var currentEpisode = parseInt($(this).find("td:nth-child(2)").text());
        if (currentEpisode == lastEpisode) {
            $(this).addClass("duplicate");
        }

        lastEpisode = currentEpisode;
    });
    addCurrentToCookie();
}

function updateSidebar(seasons) {
    var selector = $("#seasonSelector");

    var currentSeason = getSeason();
    if (currentSeason == null) {
        var currentSeason = seasons[seasons.length -1];
        loadSubtitles(getShowId(), currentSeason);
    }

    selector.setLoading(false);

    seasons.forEach(function(val) {
        var link = basePath + '/' + getShowId() + '/' + val;
        var cls =  currentSeason == val ? ' class="selected"' : '';
        selector.append('<li' + cls + '><a href="' + link + '">' + val + '</a></li>');
    });


}

function downloadClickListener() {
    var hiddenIFrameID = 'hiddenDownloader';
    var iFrame = document.getElementById(hiddenIFrameID);

    if (iFrame === null) {
        iFrame = document.createElement('iframe');
        iFrame.id = hiddenIFrameID;
        iFrame.style.display = 'none';
        document.body.appendChild(iFrame);
    }

    var name = getShowName(false) +
        " S" + prepandZero($($(this).children()[0]).text()) +
        "E" + prepandZero($($(this).children()[1]).text()) +
        " " + $($(this).children()[2]).text() +
        " " + $($(this).children()[4]).text() +
        ".srt";

    name = name.replace(/ /g, ".");

    iFrame.src = $("#listBlock").data('src') + "&file=" + $(this).data("href") + "&name=" + name;
}

function pushbackLinkListener() {
    window.history.pushState("", "", $(this).attr("href"));
    loadHashToBlock();
    return false;
}

function getUrlParameter() {
    return window.location.pathname.replace(basePath + '/', "");
}

function getShowId(parameter) {
    if (!parameter)
        parameter = getUrlParameter();

    if (parameter.indexOf(basePath) == 0)
        parameter = parameter.substr(basePath.length);

    if (parameter.indexOf("/") == 0)
        parameter = parameter.substr(1);

    return parameter.split('/')[0];
}

function getSeason(parameter) {
    if (!parameter)
        parameter = getUrlParameter();

    var arr = parameter.split("/");
    if (arr.length >= 2)
        return arr[1];
    else {
        var visitedShows = getShowsInCookies();
        var showIdx = indexOfShow(visitedShows, getShowId());
        if (showIdx != -1) {
            var season = getSeason(visitedShows[showIdx]);
            window.history.pushState("", "", basePath + "/" + getShowId() + "/" + season);
            return season;
        } else {
            return null;
        }
    }
}

function getShowName(full) {
    var result = "Loading\u2026";
    var showId = getShowId();
    if (showsData) {
        showsData.forEach(function(obj) {
            if (obj.value == showId) {
                result = obj.label;
                if (full)
                    result += ' - Season ' + getSeason();
                return false;
            }
            return true;
        });
    }

    return result;
}

function addShowAutocompleteListener(object) {
    object.autocomplete({
        source: function(request, response) {
            getAutocompleteData(function() {
                response( $.ui.autocomplete.filter(autocompleteData, request.term ) );
            });
        },
        minLength: 2,
        focus: function( event, ui ) {
            return false;
        },
        select: function( event, ui ) {
            $( "#addShowInput" ).val( ui.item.label );
            addTVShow(ui.item.value, ui.item.label );
            return false;
        }
    })
    .data( "ui-autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li>" )
            .append( "<a>" + item.label + "</a>" )
            .appendTo( ul );
    };
}

function getAutocompleteData(callback) {
    if (!autocompleteData) {
        $.ajax({
            url: $("#addShowInput").data('src'),
            success: function( data ) {
                autocompleteData = data.shows;
                callback.call();
            }
        });
    } else {
        callback.call();
    }
}

function addTVShow(id, showTitle) {
    $("#navigatorMain").setLoading(true);
    $.ajax({
        url: $("#showAdder").data('src'),
        data: { showId: id, title: showTitle },
        success: function( data ) {
            //if (data.status == "OK")
            loadShows(true);
            $("#addShowInput").val("");
        }
    });

    window.history.pushState("", "", basePath + "/" + id);
    loadHashToBlock();
}

function loadShows(force) {
    $("#additionalNavigator").addClass("hidden");
    var navigator = $("#navigatorMain");
    navigator.setLoading(true, 75);
    if (force)
        showsData = undefined;

    getShowsData(function() {
        var latestShows = getShowsInCookies();
        var latestBlock = $("#navigatorLatest");
        navigator.setLoading(false);
        latestBlock.html('');

        latestShows.forEach(function() {
            $( "<li>").appendTo(latestBlock);
        });

        showsData.forEach(function(show) {
            var item = $( "<li>" )
                .append( '<a href="' + basePath + '/' + show.value + '">' + show.label + '</a>' );

            /*if (show.value == getShowId())
                item.addClass("selected");*/

            item.appendTo( navigator );

            var latestPos = indexOfShow(latestShows, show.value);
            if (latestPos != -1) {
                item = $(latestBlock.children()[latestPos]);
                /* in Latest shows is current show always on top, no reason to highlight it */
                /*if (show.value == getShowId())
                    item.addClass("selected");*/

                $('<a href="' + basePath + '/' + latestShows[latestPos] + '">S' + getSeason(latestShows[latestPos]) + ' | ' + show.label + '</a>')
                    .appendTo(item);
                $("#additionalNavigator").removeClass("hidden");
            }
        });

        highlightCurrentShow();
        $("#listBlock > h3").text(getShowName(true));
    });
}

function getShowsData(callback) {
    if (!showsData) {
        $.getJSON($("#navigatorMain").data('src'), function(result) {
            showsData = result.data;
            callback.call();
        });
    } else {
        callback.call();
    }
}

function getShowsInCookies() {
    var shows = $.cookie("shows");
    if (!shows)
        return [];
    else
        return shows.split(',');
}

function addCurrentToCookie() {
    if (getSeason() === null)
        return;

    var currentShows = getShowsInCookies();
    var existingIdIdx = indexOfShow(currentShows, getShowId());
    if (existingIdIdx != -1)
        currentShows.splice(existingIdIdx, 1);

    currentShows.unshift(getShowId() + "/" + getSeason());

    $.cookie("shows", currentShows, { expires: 30, path: basePath });
    loadShows();
}

function indexOfShow(array, show) {
    for (var idx = 0; idx < array.length; ++idx ) {
        var showId = getShowId(array[idx]);
        if (showId == show) {
            return idx;
        }
    }

    return -1;
}

function prepandZero(text) {
    if (text < 10)
        text = "0" + text;

    return text;
}

$.fn.extend({
    setLoading: function(start, height, text) {
        this.html('');
        if (start) {
            this.addClass("loader");

            var ele = $("<div>");
            if (text)
                ele.append('<div>' + text + '</div>');

            ele.append('<img src="' + basePath + '/images/loading.gif">');

            ele = $("<div>").append(ele);
            if (height)
                ele.css("height", height);

            ele.appendTo(this);
        } else {
            this.removeClass("loader");
        }

        return this;
    },
    reverseOrder: function() {
        [].reverse.call(this.children()).appendTo(this);
    }
});

function highlightCurrentShow() {
    var items = $("#navigatorMain > li");
    if (items.length) {
        items.removeClass("selected");
        items.each(function() {
            var showId = getShowId($($(this).children()[0]).attr('href'));
            if (showId == getShowId()) {
                $(this).addClass("selected");
                return false;
            }
            return true;
        });
    }
}