	  $(document).ready(function() {
	    $('.button-collapse').sideNav({
	      edge: 'right', // Choose the horizontal origin
	    });

	    $('.collapsible').collapsible({
	      accordion: true,
	    });

	    $('ul.tabs').tabs();

	    $('.slider').slider({
	      full_width: true,
	      height: '40vh'
	    });
	  });

    // INSERTING IMAGE AS PROGRESS MOVES ON ----------------------------------------

    function nextPage() {
      $(".progress-points").data('current', $(".progress-points").data('current') + 1 );
      $(".progress-point.active").next().click();
    };

// $('.cloudOne').animate({width:"200px"},200)
    function addBike(_Actions){
      $('a').has('.svg-bike-switch').animate({padding:'0px'},200);
      $('a').has('.svg-bike-switch').animate({padding:"5%"},200);
      setTimeout( function(){
      $('#cloudOneBike').attr('class','cloudLeft')
      $('#cloudTwoBike').attr('class','cloudRight')},350);
         setTimeout( function() {
          _Actions.setTransitMode('cycling');
            dataLayer.push({
            'transportationType': 'BIKE',
            });
            console.log("Mode set to cycling");
              $(".progress-point.active").addClass('bikeProg').removeClass('walkProg');
              $("#travelType").removeClass("disabled");
            nextPage();
        },1200);
    };

    function addWalk(_Actions){
      $('a').has('.svg-walk-switch').animate({padding:'0px'},200);
      $('a').has('.svg-walk-switch').animate({padding:"5%"},200);
      setTimeout( function(){
      $('#cloudOneWalk').attr('class','cloudLeft')
      $('#cloudTwoWalk').attr('class','cloudRight')},350);
        setTimeout( function() {
          _Actions.setTransitMode('walking');
          dataLayer.push({
            'transportationType': 'WALK',
          });
          console.log("Mode set to walking");
            $(".progress-point.active").addClass('walkProg').removeClass('bikeProg');
            $("#travelType").removeClass("disabled");
          nextPage();
      },1200);
    };

    function addRoute(_Actions){
      $('a').has('.routeBtn').animate({padding:'0px'},200);
      $('a').has('.routeBtn').animate({padding:"5%"},200);
    setTimeout( function(){
      $('#locIconStart').attr('class','bounceOne')
      $('#locIconEnd').attr('class','bounceTwo')},350);

         setTimeout( function() {
          _Actions.setRoute();
          dataLayer.push({
            'travelType': 'ROUTE',
          });
          $(".progress-point.active").addClass('routeProg').removeClass('loopProg');
          $("#destSel").removeClass("disabled");
          nextPage();
        },1200);
    };

    function addLoop(_Actions){
      $('a').has('.loopBtn').animate({padding:'0px'},200);
      $('a').has('.loopBtn').animate({padding:"5%"},200);

      setTimeout( function(){
      $('#locIconLoop').attr('class','bounceOne')},350);

        setTimeout( function() {
          _Actions.setLoop();
          dataLayer.push({
            'travelType': 'LOOP',
          });
          $(".progress-point.active").addClass('loopProg').removeClass('routeProg');
          $("#destSel").removeClass("disabled");
          nextPage();
        },1200);
    };

    function addLoc(){
      $(".progress-point.active").addClass('navProg');
      $("#timeSel").removeClass("disabled");
      nextPage();
    };
    // ACTIVE STATE PROGRESS METER

          $(function() {
      var $point_arr, $current, $points, $progress, $trigger, active, max, tracker, val, $current, index;

      $trigger   = $('.trigger').first();
      $points    = $('.progress-points').first();
      $point_arr = $('.progress-point');
      $current   = $('.current').first();
      $progress  = $('.progress').first();

      // The following is only for initialization.
      val     = $points.data('current') - 1;
      max     = $point_arr.length - 1;
      tracker = active = 0;
      $point_arr.first().addClass('active');

      function activate(index) {
        // Updating the current data attribute to show current state
        val = $points.data('current') - 1;
        // console.log("In active", val, index);
      if (index !== active) {
        active = index;
        window._id = index;
        var $_active = $point_arr.eq(active)

        $point_arr
          .removeClass('completed active')
          .slice(0, active).addClass('completed')

        // console.log("modified val");
        // console.log(val);
        $(".progress-point").eq(val).addClass("active");

          if ($(window).height() <= 800){
                 return $current.css('top', (index / 3 * 90) + "%"),
                        $progress.css('height', (index / 3 * 100)+ "%");
                } else {
                 return $current.css('top', (index / 3 * 93) + "%"),
                        $progress.css('height', (index / 3 * 100)+ "%");

                };

        }
      };

      $points.on('click', 'li', function(event) {
        // Updating the current data attribute to show current state
        $points.data('current', $(this).index() + 1);
        // Mark all elements that we haven't visited yet as disabled.
        if ($(this).hasClass("disabled"))
          return false;

        var _index;
          _index  = $point_arr.index(this);
          tracker = _index === 0 ? 1 : _index === val ? 0 : tracker;
          return activate(_index);
        });

        $trigger.on('click', function() {
          return activate(tracker++ % 2 === 0 ? 0 : val);
        });

        setTimeout((function() {
          return activate(val);
        }), 1000);


      });
