var Dispatcher = require('./Dispatcher.jsx');
var ScenicStore = require('./Stores.jsx');
var Actions = require('./Actions.jsx');
var Analytics = require('./Analytics.jsx');
var equals = require('deep-equal');

// Will be "saved" to sessionState.activePath.
var paths = [];
var originMarker;
var destMarker;
var curMarker;

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}
function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function serializeObj(mObj){
  return mObj.latLng.lat + "," + mObj.latLng.lng;
}
function serializeWaypoints(arr){
  // waypoints arranged as an array of arrays
  var str = new String();
  for (let i = 0; i < arr.length; i++){
    let current = arr[i];
    if (i != 0){
        str += "|";
    }
    str += current[1]+','+current[0];
  }
  return str;
}

function googlifyMode(mode){
    if (mode == "cycling")
      return "BICYCLING";
    else if (mode == "walking")
      return "WALKING";
}

// Finds unique elements in an array!
function returnDuplicateIds(a) {
  var seen = new Set();
  var retval = [];
  a.filter(function(x, id) {
    if (x == "NULL"){
      return;
    }
    else if (!seen.has(x)) {
      seen.add(x);
    } else {
      // Found a duplicate.
      retval.push(id);
    }
  })
  return retval;
}

// Used only when re-draw routes
function liteClearDrawnRoutes() {
  if ($("path").length) {
    paths.map(function(path) {
      // Keep popup, delete polyline path.
      window.map.removeLayer(path);
    });
  }
  return;
}

// Should draw and re-draw.
function drawRoutes() {
  var activeIndex = null;
  paths.map(function(path, index) {
    if (path.active)
      activeIndex = index;
    else {
      path.addTo(window.map);
      path._path.setAttribute('route', index);
    }
  });
  // Now draw active map so it's on stacked on top.
  paths[activeIndex].addTo(window.map);
  paths[activeIndex]._path.setAttribute('route', activeIndex);
  return;
}

function syncActivePath() {
  paths.map(function(path) {
    if (path.active)
      Actions.updateActivePath(path);
  })
}

// Takes an index of the new active path
// updates paths[]
function updateActivePath(activeIndex) {
  // Check if already the active path!
  if (paths[activeIndex] && paths[activeIndex].active)
    return;
  else if (paths[activeIndex]) {
    // Turn off current active flag.
    paths.map(function(path, p_index) {
      if (path.active) {
        path.active = false;
      } else if (p_index == activeIndex) {
        path.active = true;
      }
    });

  // Update CSS attributes to reflect
  // this.
    var oldActive = document.querySelector('path.activePath');
    if (oldActive) {

      $('.active-popup').removeClass('active-popup');

      oldActive.setAttribute('class', 'inactivePath leaflet-clickable');
      paths[activeIndex]._path.setAttribute('class', 'activePath leaflet-clickable');

      $(".leaflet-popup[route=" + activeIndex + "]").addClass("active-popup");

      liteClearDrawnRoutes();
      drawRoutes();
      syncActivePath();
    } else {
      console.log("Routes haven't been drawn yet...")
    }

  } else {
    console.error("undefined behaviour - how'd you get here?");
  }
}

window.updateActivePath = updateActivePath;

// Activates on route click.
function onPathClick() {
  console.log(this.duration);
  console.log(this.distance);

  var pathIndex = paths.indexOf(this);
  updateActivePath(pathIndex);

  return;
}

// Clears drawn routes and associated popups
function clearDrawnRoutes() {
  if ($("path").length) {
    paths.map(function(path) {
      // Remove popup and polyline path.
      window.map.removeLayer(path._popup);
      window.map.removeLayer(path);
    });

    if (originMarker)
      window.map.removeLayer(originMarker);
    if (destMarker)
      window.map.removeLayer(destMarker);
  }
  return [];
}

function drawPins() {
  var originIcon = L.icon({
    iconUrl: 'public/assets/locBubble.svg',
    iconSize: [
      40, 40
    ], // size of the icon
    iconAnchor: [
      0, 0
    ] // point of the icon which will correspond to marker's location
  });
  var destIcon = L.icon({
    iconUrl: 'public/assets/dest.svg',
    iconSize: [
      30, 35
    ], // size of the icon
    iconAnchor: [
      30, 35
    ] // point of the icon which will correspond to marker's location
  });
  if (ScenicStore.getSessionState().loop) {
    if (!curMarker){
        originMarker = L.marker(ScenicStore.getSessionState().origin.latLng, {
          icon: originIcon
        }).addTo(window.map) // destMarker = L.marker(ScenicStore.getSessionState().origin.latLng,{icon: destIcon}).addTo(window.map)
    }
    else{
      originMarker = L.marker(ScenicStore.getSessionState().origin.latLng, {
        icon: destIcon
      }).addTo(window.map)
    }
  } else {
    if (!curMarker){
      originMarker = L.marker(ScenicStore.getSessionState().origin.latLng, {
        icon: originIcon
      }).addTo(window.map)
    }
    else{
      originMarker = L.marker(ScenicStore.getSessionState().origin.latLng, {
        icon: destIcon
      }).addTo(window.map)
    }
    destMarker = L.marker(ScenicStore.getSessionState().destination.latLng, {
      icon: destIcon
    }).addTo(window.map)
  }
}

// Refactor this ugly af function.
function drawMarkers() {

  let markerLocations = [];
  function markerExists(prospect) {
    for (let i = 0; i < markerLocations.length; i++) {
      if (equals(markerLocations[i], prospect))
        return true;
    }
    return false;
  }

  for (var i = 0; i < paths.length; i++) {
    (function(i) {
      var formattedRouteInfo = formatRouteInfo(paths[i].duration, paths[i].distance);
      console.log("INDEX IS :", i);
      console.log("LENGTH IS :", paths[i]._latlngs.length);

      var lastIndex = paths[i]._latlngs.length - 1;
      var popupLocation = Math.round(((1 / 6) * (lastIndex)) + ((1 / 3) * (i) * (lastIndex)));
      while (markerExists(paths[i]._latlngs[popupLocation])) {
        // Add 30% spacing if it exists in the same location.
        popupLocation = popupLocation + Math.round((0.3) * (lastIndex - popupLocation))
        console.log('modified popuplocation', popupLocation);
      }
      markerLocations.push(paths[i]._latlngs[popupLocation]);

      console.log("POPUP LOCATION IS :", popupLocation);
      paths[i]._popup = L.popup().setLatLng(paths[i]._latlngs[popupLocation]).setContent(formattedRouteInfo);
      console.dir(paths[i]._popup);
      console.log("BOUND");
      // do we need to do fitBounds at this point?
      try {
        window.map.addLayer(paths[i]._popup);
        paths[i]._popup._container.setAttribute('route', i);
      } catch (err) {
        console.error(err);
      }
    })(i);
  }
}

// Takes in seconds and returns
// a nicely formatted time string.
function formatDuration(_seconds) {
  var sec_num = parseInt(_seconds, 10); // don't forget the second param
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  var result = new String();
  if (hours > 0) {
    var plural = (hours == 1) ? '' : 's';
    result += '<b>' + hours + '</b>' + ' hr' + plural;
  }
  if (minutes > 0) {
    var plural = (minutes == 1) ? '' : 's';
    var spacing = (hours > 0) ? ' ' : '';
    result += spacing + '<b>' + minutes + '</b>' + ' min';
  }
  // Only show seconds if no minutes value.
  if ((seconds > 0) && (minutes < 1)) {
    var plural = (seconds == 1) ? '' : 's';
    result += '<b>' + seconds + '</b>' + ' s';
  }
  return result;
}

// Takes in distance in metre,
// outputs either km or metres
function formatDistance(_distance) {
  var km = (parseInt(_distance) / 1000);
  if (Math.floor(km) == 0) {
    // Distance is in metres!
    return '<b>' + _distance + '</b>' + ' metres';
  } else {
    return '<b>' + km.toFixed(2) + '</b>' + ' km';
  }
}

function formatDurationRaw(_seconds) {
  var sec_num = parseInt(_seconds, 10); // don't forget the second param
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  var result = new String();
  if (hours > 0) {
    var plural = (hours == 1) ? '' : 's';
    result += hours + ' hr' + plural;
  }
  if (minutes > 0) {
    var plural = (minutes == 1) ? '' : 's';
    var spacing = (hours > 0) ? ' ' : '';
    result += spacing + minutes + ' m';
  }
  // Only show seconds if no minutes value.
  if ((seconds > 0) && (minutes < 1)) {
    var plural = (seconds == 1) ? '' : 's';
    result += seconds + ' s';
  }
  return result;
}

function formatDistanceRaw(_distance) {
  var km = (parseInt(_distance) / 1000);
  if (Math.floor(km) == 0) {
    // Distance is in metres!
    return _distance + ' metres';
  } else {
    return km.toFixed(2) + ' km';
  }
}

function formatRouteInfo(_duration, _distance) {
  // var durationInfo = formatDuration(_duration);
  // var distanceInfo = formatDistance(_distance);
  // return durationInfo + ' | ' + distanceInfo;
  return formatDuration(_duration);
}

function fetchData(callback, pathLength) {
  var requests = [];
// Prepare paths for re-use.
  paths = clearDrawnRoutes();
  for (var i = 0; i < pathLength; i++) {
    // JavaScript Closures: http://www.mennovanslooten.nl/blog/post/62
    (function(index) {
      var mapboxCallback = function(routesInfo, err) {
        // Grabbing map and directions
        routesInfo = JSON.parse(routesInfo.responseText);
        console.log(routesInfo);

        /* Format directions to get rid of {highway:footway...} */
        window.yooo = routesInfo;
        routesInfo.routes[0].steps.map(function(direction, id){
          console.log("Splitting", direction.way_name);

          // Replacing waypoint with greenpoint
          if (direction.maneuver.instruction.split("waypoint").length > 1){
            direction.maneuver.instruction = direction.maneuver.instruction.split("waypoint").join("<span class='green-emphasis'>greenpoint</span>");
          }

          // Cleaning out {...}
          if ( direction.way_name && (direction.way_name.split("{").length > 1)){
            // Must sanitize!
            direction.way_name = "";

            if (direction.maneuver.instruction.split(" on ").length > 1){
              direction.maneuver.instruction = direction.maneuver.instruction.split(" on ")[0].trim();
            }
            else if (direction.maneuver.instruction.split(" onto ").length > 1){
              direction.maneuver.instruction = direction.maneuver.instruction.split(" onto ")[0].trim();
            }
            else{
              console.log("You shouldnt be here!!!");
            }
          }
          return direction;
        })



        var poly_raw = routesInfo.routes[0].geometry.coordinates;
        // Route coordinates received as (lng,lat), and
        // must be inverted to (lat,lng) for plotting
        poly_raw = poly_raw.map(function(e) {
          return e.reverse();
        });
        // Assign default path classes, and pushing it to our paths
        // array where we will draw from in the callback.
        var _pathStyles = {
          className: (index == 0) ? 'activePath' : 'inactivePath'
        };
        var path = L.polyline(poly_raw, _pathStyles);
        // Assign path traversal time, distance, directions
        // as a property that can
        // can be referenced in the handler handleRouteSelection
        path.active = (index == 0) ? true : false;
        path.duration = routesInfo.routes[0].duration;
        path.distance = routesInfo.routes[0].distance;
        path.formatted = {
          duration: formatDurationRaw(path.duration),
          distance: formatDistanceRaw(path.distance)
        };
        path.steps = routesInfo.routes[0].steps;
        path.info = ScenicStore.getSessionState().greenpoints.results[index];
        path.transit = ScenicStore.getSessionState().transit;

        /* REFACTOR */
        Actions.setSessionState('steps', path.steps);
        Actions.setSessionState('routeTime', path.duration);
        Actions.setSessionState('routeDist', path.distance);

        // Adding path click handler.
        path.addEventListener('click', onPathClick);
        // Plug it into the local-global variable paths.
        paths.push(path);
        return;
      };

      requests.push($.ajax({
        url: Navigate.buildMapboxDirectionsURL(index),
        async: false,
        complete: mapboxCallback
      }));

      // requests.push( $.get(Navigate.buildMapboxDirectionsURL(index),mapboxCallback) );
    })(i);
  }

  $.when.apply($, requests).then(function() {
    var array = $.map(arguments, function(arg) {
      return arg[0];
    });
    callback(array);
  })
}

var Navigate = {
/**
   * @param  {string} query
   * @param  {fn} cb
   */
  getSuggestions: function(query, cb) {
    var TorontoBbox = new google.maps.LatLngBounds(new google.maps.LatLng(43.581, -79.6393), new google.maps.LatLng(43.8555, -79.1152));
    var service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({
      input: query,
      bounds: TorontoBbox,
      componentRestrictions: {
        country: 'CA'
      }
    }, function(predictions, status) {
      if (status != google.maps.places.PlacesServiceStatus.OK) {
        console.log("Autocomplete status: " + status);
        return;
      }

      // Prune to best 3 matches.
      if (predictions.length > 3) {
        predictions = predictions.slice(0, 3);
      }

      console.log(predictions);
      return cb(predictions);
    });
  },
  // Sample query: http://104.131.189.81/greenify?origin=-79.380658,43.645388&dest=-79.391974,43.647957&greenness=3
  buildGreenifyURL: function() {
    var origin = ScenicStore.getSessionState().origin;

    var destination;
    if (ScenicStore.getSessionState().loop) {
      destination = ScenicStore.getSessionState().origin;
    } else {
      destination = ScenicStore.getSessionState().destination;
    }
    var greenness = ScenicStore.getSessionState().greenness;

    var api = "https://greenlane.io/greenify?";
    api += "origin=" + origin.latLng.lng + ',' + origin.latLng.lat;
    api += "&";
    api += "dest=" + destination.latLng.lng + ',' + destination.latLng.lat;
    api += "&";

    let offset;
    if (greenness == 1){
      offset = 2
    }
    else{
      offset = 3;
    }

    api += "greenness=" + (greenness + offset);
    return api;
  },
  buildMapboxDirectionsURL: function(item) {
    var origin = ScenicStore.getSessionState().origin;

    console.log("IN BUILD MAPBOX DIRECTIONS");
    console.log(origin);

    var destination;
    if (ScenicStore.getSessionState().loop)
      destination = ScenicStore.getSessionState().origin;
    else
      destination = ScenicStore.getSessionState().destination;

    console.log("I'm grabbing destination here", destination);


    var greenpoints = ScenicStore.getSessionState().greenpoints;

    var api = "https://api.tiles.mapbox.com/v4/directions/";
    api += 'mapbox.' + ScenicStore.getSessionState().transit;
    api += '/';
    api += origin.latLng.lng + ',' + origin.latLng.lat + ';';
// Affix green waypoints here!
    console.log("GREENPOINTS", greenpoints);
    console.log("ITEM", item);
// Only viewing fastest green route right now.
    var coords = greenpoints.results[item].scenic_route;
    console.log("COORDS", coords);
    coords.map(function(it) {
      window._it = it;
      console.log("IT", it);
      var lng = it[0];
      var lat = it[1];
      api += lng + ',' + lat + ';';
    });


    console.log("I'm grabbing destination below");
    api += destination.latLng.lng + ',' + destination.latLng.lat;
    api += '.json?instructions=html&access_token=';
    api += 'pk.eyJ1IjoibWFwYm94IiwiYSI6IlhHVkZmaW8ifQ.hAMX5hSW-QnTeRCMAy9A8Q';
    return api;
  },
  prepareSingleton: function(route) {
    // origin & destination
    var origin = route.origin;
    var destination = route.destination;
    Actions.setSessionState('origin', {
      'latLng': L.latLng(parseFloat(origin.lat), parseFloat(origin.lng))
    });
    Actions.setSessionState('destination', {
      'latLng': L.latLng(parseFloat(destination.lat), parseFloat(destination.lng))
    });

    // normalize the greenpoints.
    var greenlane = route.info;
    greenlane.scenic_route.map(function(greenpnt) {
      return [
        parseFloat(greenpnt[0]), parseFloat(greenpnt[1])
      ]
      }) // format like the object.
    greenlane = {
      results: [greenlane]
    };

    Actions.setSessionState('greenpoints', greenlane);
    Actions.setSessionState('loop', JSON.parse(route.loop));
    Actions.setSessionState('transit', route.transit);

  },
  generateSingleton: function(route) {

// Andrew: Why was this placed here??
    Actions.goBack();

    Actions.changeParkViewBtn('favorited');

    // $(".favorite, .go-to-route").hide();
    // $(".favorited").removeClass("hide").show();
    // $(".favorite").removeClass("hide").show();

    event.preventDefault();
    event.stopPropagation();
/*
     * Set session origin, destination, transit, greenpoints
    */
    // console.log("in generate singleton");
    // console.log(route);
    window._comemyroute = route;

    Navigate.prepareSingleton(route);

    var origin = ScenicStore.getSessionState().origin;

    var destination;
    if (ScenicStore.getSessionState().loop) {
      //console.log("im in generate route and im looping");
      destination = ScenicStore.getSessionState().origin;
      //console.log(destination);
    } else {
      destination = ScenicStore.getSessionState().destination;
    }

    // Setup directions Mapbox Directions object.
    var directionsSetup = L.mapbox.directions({
      profile: 'mapbox.' + ScenicStore.getSessionState().transit
    });
    directionsSetup.setOrigin(origin.latLng);
    directionsSetup.setDestination(destination.latLng);

    // Get green waypoints, before you request for directions.
    Actions.isLoading(true);
    fetchData(function(array) {
      // Debugging variable below.
      // console.log("Finished getting everything");
      window._paths = paths;
      // console.log(array);
      // console.log(paths);

      Actions.setDirectionsState(true);

      Actions.setParkMode();

      drawPins();
      drawRoutes();
      drawMarkers();
      // Only for initialization.
      syncActivePath();
      // Handle the state change.

      $(".leaflet-popup[route=0]").addClass("active-popup");
      // Turn off the park info stuff if it exists
      $(".parkBtn.active").trigger('click');

      Actions.isLoading(false);
      // If you try and draw
      // a favourited route from here the following
      // action will handle the state changes.
      Actions.initialized();
      // console.log("InvalidatedSize");
      // setTimeout(window.map.invalidateSize, 5);

      // Get the bounds of the longest route.
      var bounds = paths[0].getBounds();
      window.map.fitBounds(bounds, {
        padding: [
          8, 8
        ],
        animate: true,
        duration: 0.5
      });
    }, 1)
    return false;
  },
  generateRoute: function(event) {

    // Attach event listener to .activator
    $(document).off('click', '.activator', Analytics.virtualPageChosenList);
    $(document).on('click', '.activator', Analytics.virtualPageChoiceList);

    event.preventDefault();
    event.stopPropagation();
    var origin = ScenicStore.getSessionState().origin;

    var destination;
    if (ScenicStore.getSessionState().loop) {
      // console.log("im in generate route and im looping");
      destination = ScenicStore.getSessionState().origin;
      // console.log(destination);
    } else {
      destination = ScenicStore.getSessionState().destination;
    }

    // Setup directions Mapbox Directions object.
    var directionsSetup = L.mapbox.directions({
      profile: 'mapbox.' + ScenicStore.getSessionState().transit
    });
    directionsSetup.setOrigin(origin.latLng);
    directionsSetup.setDestination(destination.latLng);

    // Get green waypoints, before you request for directions.
    Actions.isLoading(true);

    // var tenSecondWait = true;
    var tenSecondWait = false; // set to true if you want this to work...
    setTimeout(function(){
      if (tenSecondWait){
          Actions.showWaitCopy();
      }
    },5000);

    $.get(Navigate.buildGreenifyURL(), function(results, err) {
      // console.log("Hit Greenify API", results);
      // console.log('catching error here', err);
      tenSecondWait = false;
      // Do the click handler stuff here...
      results.results = results.results.slice(-3);

      // console.log("This is right after you get it", results.results);

      var greenifyResults = results.results;

      var poppedRoutes = {
        0:[],
        1:[],
        2:[]
      };

      // 0 - Optimize the waypoint order.
      greenifyResults.map(function(it, id){

        var optimal_order = [];
        // find closest to origin
        while (optimal_order.length != it.scenic_route.length){
          var minDelta = Infinity, current_idx = -1;

          for (var i = 0; i < it.scenic_route.length; i++){
            var dist;
            if (optimal_order.length == 0){
              let temp = getDistanceFromLatLonInKm(ScenicStore.getSessionState().origin.latLng.lat,ScenicStore.getSessionState().origin.latLng.lng,it.scenic_route[i][1],it.scenic_route[i][0]);
              if (temp > 0)
                dist = temp;
              console.log("distance between origin and A", i, dist);
            }
            else if( optimal_order.indexOf(i) == -1){
              let temp = getDistanceFromLatLonInKm(it.scenic_route[ optimal_order[optimal_order.length-1] ][1],it.scenic_route[ optimal_order[optimal_order.length-1] ][0],it.scenic_route[i][1],it.scenic_route[i][0]);
              if (temp > 0)
                dist = temp;
              console.log(" distance between A, B and distance",optimal_order[optimal_order.length-1], i, dist);
            }
            if (dist < minDelta){
              minDelta = dist;
              current_idx = i;
            }
          }
          optimal_order.push(current_idx);
        }

        /* Setting up for second bounding box check. */
        var A = new google.maps.LatLng(
                    ScenicStore.getSessionState().origin.latLng.lat,
                    ScenicStore.getSessionState().origin.latLng.lng
        );
        var B;
        if (ScenicStore.getSessionState().loop){
          B = A;
        }
        else{
          B = new google.maps.LatLng(
                      ScenicStore.getSessionState().destination.latLng.lat,
                      ScenicStore.getSessionState().destination.latLng.lng
          );
        }

        var midPoint = new google.maps.LatLng ((A.lat()+B.lat())/2,(A.lng()+B.lng())/2)
        var boundingRadius = google.maps.geometry.spherical.computeDistanceBetween(A,midPoint);
        console.log('bounding raiuds', boundingRadius);
        function pointInCircle(longitude,latitude){
          var point = new google.maps.LatLng (latitude,longitude);
          console.log('distance between ', google.maps.geometry.spherical.computeDistanceBetween(point, midPoint));

          return (google.maps.geometry.spherical.computeDistanceBetween(point, midPoint) <= (boundingRadius + 500))
        }

        // Re-order, check for bounding box.
        var reParks = [], reFac = [], rePic = [], reRoute = [];

        for (var i = 0; i < optimal_order.length; i++){
          let inBbox = pointInCircle(it.scenic_route[optimal_order[i]][0],it.scenic_route[optimal_order[i]][1]);
          if (ScenicStore.getSessionState().loop){
            inBbox = true; // only care about the radius for A->B routes!
          }
          if (inBbox || (it.scenic_route.length === 1) ){
            reParks.push( it.parks[ optimal_order[i] ] );
            reFac.push( it.facilities[ optimal_order[i] ] );
            rePic.push( it.pictures[ optimal_order[i] ] );
            reRoute.push( it.scenic_route[ optimal_order[i] ] );
          }
          else{
            // not in bbox, and getting popped!
            var popped = {
              parks: it.parks[ optimal_order[i] ],
              facilities: it.facilities[ optimal_order[i] ],
              pictures: it.pictures[ optimal_order[i] ],
              scenic_route: it.scenic_route[ optimal_order[i] ]
            };
            poppedRoutes[id].push(popped);
          }
        }
        console.log("OPTIMAL_ORDER", optimal_order);
        // Assign corrected values.
        it.parks = reParks;
        it.facilities = reFac;
        it.pictures = rePic;
        it.scenic_route = reRoute;
      })

      // 0.5 -
      // check if the routes are the same, and if they are:
      // if (greenpoints.length > 1) re-arrange some greenpoints
      // else add popped greenpoint.
      window.poppedRoutes = poppedRoutes;
      // function hasIdenticalRoutes(){
      //     var possibleDuplicates = [];
      //     var previousRouteGreenpointCount = 0;
      //     greenifyResults.map(function(it,id){
      //       if (previousRouteGreenpointCount == it.scenic_route.length){
      //         if (possibleDuplicates.indexOf(id) == -1){
      //           possibleDuplicates.push( id );
      //         }
      //         if (possibleDuplicates.indexOf(id-1) == -1){
      //           possibleDuplicates.push( id );
      //         }
      //         previousRouteGreenpointCount = it.scenic_route.length;
      //       }
      //     });
      //
      //     if (possibleDuplicates.length){
      //         var identicalRouteGreenspaceCount = greenifyResults[possibleDuplicates[0]].scenic_route.length;
      //
      //         var mapResult = possibleDuplicates.map(function(dupCandidate){
      //           return (possibleDuplicate.map(function(altDupCandidate){
      //               if (dupCandidate != altDupCandidate){
      //                 // Check if scenic_route is the same.
      //                 var dupCandidateGreenspaces = greenifyResults[dupCandidate].scenic_route;
      //                 var altDupCandidateGreenspaces = greenifyResults[altDupCandidate].scenic_route;
      //                 for (var i = 0; i < identicalRouteGreenspaceCount; i++){
      //                     if ((dupCandidateGreenspaces[0][1] != altDupCandidateGreenspaces[0][1]) || (dupCandidateGreenspaces[1][1] != altDupCandidateGreenspaces[1][1])){
      //                       // not duplicate.
      //                       console.log("no identical routes found! - 1");
      //                       return false;
      //                     }
      //                 }
      //                 console.log("found identical routes!");
      //                 return true;
      //               }
      //           }))
      //         })
      //
      //         console.log("mapResult", mapResult);
      //         return mapResult;
      //
      //     }
      //     else{
      //       // no identical routes!
      //       console.log("no identical routes - 2");
      //       return false;
      //     }
      // }

      // hasIdenticalRoutes();

      // Formatting API Results for convenience
      // 1 - Cleaning out duplicates
      greenifyResults.map(function(it, id) {
        var currentDups = returnDuplicateIds(it.parks);
        var cleanParks = [];
        var cleanRoutes = [];
        var cleanPictures = [];
        for (var i = 0; i < greenifyResults[id].parks.length; i++) {
          if (currentDups.indexOf(i) == -1) {
            cleanParks.push(greenifyResults[id].parks[i]);
            cleanRoutes.push(greenifyResults[id].scenic_route[i]);
            cleanPictures.push(greenifyResults[id].pictures[i]);
          }
        }
        greenifyResults[id].parks = cleanParks;
        greenifyResults[id].scenic_route = cleanRoutes;
        greenifyResults[id].pictures = cleanPictures;
      })
       // 2 - Cleaning out common facilities, pictures etc.
      greenifyResults.map(function(it, id) {
        var cleanParks = [],
          cleanPictures = [],
          cleanFacilities = [];
        for (var i = 0; i < greenifyResults[id].parks.length; i++) {
          if (greenifyResults[id].parks[i] != "NULL") {
            cleanParks.push(greenifyResults[id].parks[i]);
            cleanPictures.push(greenifyResults[id].pictures[i]);
            cleanFacilities.push(greenifyResults[id].facilities[i]);
          }
        }
        greenifyResults[id].parks = cleanParks;
        greenifyResults[id].pictures = cleanPictures;
        greenifyResults[id].facilities = cleanFacilities;
      })

      // https://maps.googleapis.com/maps/api/directions/json?
      // origin=43.6573801,-79.4168093&
      // destination=43.6476654,-79.3917897&
      // waypoints=optimize:true|43.63951581,-79.39037859|43.65472984,-79.41547642
      // &mode=bicycling
      // &key=AIzaSyChQYTBtW433Szc2Sq_nTOVCGjQJWa_CVE

      results.results = greenifyResults;
      window._greenify = greenifyResults;
      Actions.setGreenpoints(results);
      fetchData(function(array) {
        // console.log("Finished getting everything");
        window._paths = paths;
        // console.log(array);
        // console.log(paths);
        Actions.setDirectionsState(true);
        Actions.setParkMode();
        drawPins();
        drawRoutes();
        drawMarkers();
        // Only for initialization.
        syncActivePath();
        // Handle the state change.
        $(".leaflet-popup[route=0]").addClass("active-popup");
        // Turn the park view off if active
        $(".parkBtn.active").trigger('click') // Setting up for a fresh run.

        Actions.changeParkViewBtn('go-to-route');
        // $(".go-to-route").removeClass("hide");
        // // reset favorite btn state
        // $(".favorited").removeClass("favorited").addClass("favorite").addClass("hide");

        Actions.isLoading(false);
        // This must get triggered after loading completes
        Analytics.virtualPage('Route Options|Map', '/options/map');
        // Handling smooth transition to the new map view.
        setTimeout(function() {
          // console.log("timeout invoked");
          window.map.fitBounds(L.featureGroup(paths).getBounds(), {
            padding: [
              10, 10
            ],
            animate: true,
            duration: 0.5
          });
        }, 500);

      }, 3)
    }).fail(function() {
      Actions.timeOut();
    });
    return false;
  }
};

// Similar to the onPathClick, but for when you click the
// popup associated with a path.
$(document).on('click', '.leaflet-popup', function() {
  // console.log("Clicked popup");
  var routeId = $(this).attr('route');
  var relatedRoute = $("path[route='" + routeId + "']");

  if (relatedRoute.hasClass("activePath")) {
    return;
  } else {
    updateActivePath(routeId);
    return;
  }
});

$(document).on('click', '.go-to-route', function() {

  Analytics.virtualPage('Route Chosen|Map', '/chosen/map');
  // Attach click event listener, handler to .activator
  $(document).off('click', '.activator', Analytics.virtualPageChoiceList);
  $(document).on('click', '.activator', Analytics.virtualPageChosenList);

  var activePathIndex = parseFloat($('.activePath').attr('route'));
  $("[route]").not("[route=" + activePathIndex + "]").fadeOut();

  Actions.changeParkViewBtn('favorite');
  // $(".go-to-route").addClass("hide");
  // $(".favorite").removeClass("hide").show();

  Analytics.greenOnRoute( paths[activePathIndex].info.scenic_route.length );

  // Center the selected route.
  window.map.fitBounds(paths[activePathIndex].getBounds(), {
    padding: [
      8, 8
    ],
    animate: true,
    duration: 0.5
  })
  window.map.invalidateSize();

  // should only occur when directions tab is closed.
  // if ($("#turnList").is(':visible') == false){
  //   $('#turnList').addClass('bounceList').delay(2000).queue(function(next){
  //     $(this).removeClass('bounceList');
  //     next();
  //   });
  // }
})
$(document).on('click', '.routeChoice', function() {

  var originIcon = L.icon({
    iconUrl: 'public/assets/locBubble.svg',
    iconSize: [
      40, 40
    ], // size of the icon
    iconAnchor: [
      0, 0
    ] // point of the icon which will correspond to marker's location
  });

  var destIcon = L.icon({
    iconUrl: 'public/assets/dest.svg',
    iconSize: [
      30, 35
    ], // size of the icon
    iconAnchor: [
      30, 35
    ] // point of the icon which will correspond to marker's location
  });

  function showError() {
    alert("Activate your location services to use this feature");
    Actions.deactivateError();
  }
  if (navigator.geolocation) {
    Actions.activateError('location');
    navigator.geolocation.getCurrentPosition(function(position) {
      console.log('Grabbed current location!');

      var latitude = position.coords.latitude;
      var longitude = position.coords.longitude;
      var latlng = new google.maps.LatLng(latitude, longitude);
      var geocoder = new google.maps.Geocoder();

      var radlat1 = Math.PI * ScenicStore.getSessionState().origin.latLng.lat / 180
      var radlat2 = Math.PI * latitude / 180
      var radlon1 = Math.PI * ScenicStore.getSessionState().origin.latLng.lng / 180
      var radlon2 = Math.PI * longitude / 180
      var theta = ScenicStore.getSessionState().origin.latLng.lng - longitude;
      var radtheta = Math.PI * theta / 180
      var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(dist)
      dist = dist * 180 / Math.PI
      dist = dist * 60 * 1.1515
      dist = dist * 1.609344 * 1000;

      if (dist > 15) {
        // Do the swap before zooming in.
        if (curMarker)
          window.map.removeLayer(curMarker)
        else {
          window.map.removeLayer(originMarker);
          originMarker = L.marker(ScenicStore.getSessionState().origin.latLng, {
            icon: destIcon
          }).addTo(window.map);
        }

        curMarker = L.marker([
          latitude, longitude
        ], {
          icon: originIcon
        }).addTo(window.map);
        window.map.setView([
          latitude, longitude
        ], 18, {
          animate: true
        })
      } else {
        // zoom in on the userLocation.
        window.map.setView(ScenicStore.getSessionState().origin.latLng, 18, {
          animate: true
        })
      }
      Actions.deactivateError();
    }, showError, {
      timeout: 5000
    });
  } else {
    Actions.activateError('nogeolocation');
  }

})
module.exports = Navigate;
