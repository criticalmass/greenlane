var React = require('react/addons');
var Classnames = require('classnames');
var ProfileNav = require('./views/ProfileNav.jsx');
var config = require('./config.js');
var SetupFlow = require('./views/SetupFlow.jsx');
var RouteView = require('./views/RouteView.jsx');
var ParkInfo = require('./views/ParkInfo.jsx');
var MapView = require('./views/Map.jsx');
var StaticPages = require('./views/StaticPages.jsx');
var LoopComponent = require('./views/LoopComponent.jsx');
var RouteComponent = require('./views/RouteComponent.jsx');
var BikeComponent = require('./views/BikeComponent.jsx');
var WalkComponent = require('./views/WalkComponent.jsx');
var Loader = require('./views/Loader.jsx');
var ErrorView = require('./views/Error.jsx');
var Tutorial = require('./views/Tutorial.jsx');
var LandingAnim = require('./views/LandingAnim.jsx');
var ScenicStore = require('./stores/Stores.jsx');
var Actions = require('./stores/Actions.jsx');


var is_keyboard = false;
var is_landscape = false;
var initial_screen_size = window.innerHeight;
var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;


$(document).on('focus', 'input[type="text"]', function(){
  if ( $(window).width() < 993) {

  var _windowHeight = initial_screen_size;
  $('body').css({'height':_windowHeight + 'px',
                  'background-color':'white'});
  $('.progress-meter').css({'height':_windowHeight + 'px'});
  $('.progress-meter').css({'display':'block'});
};
});

if ( $(window).width() > 1000) {
  $(document).on('focus', 'input[type="text"]', function(){  
    $('body').css({'height':94 + '%',
                   'background-color':'white'});
    $('.progress-meter').css({'height':94 + '%'});
    $('.progress-meter').css({'display':'block'});
  });
};

function readCookie(name) {
    var value = (name = new RegExp('(?:^|;\\s*)' + ('' + name).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)').exec(document.cookie)) && name[1];
    console.log('cookie value', value);
    return (value == null) ? false : decodeURIComponent(value);
}
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+";";
}


var Body = React.createClass({
	getInitialState: function(){
    window._BODY = this;
		window._Actions = Actions;
		window._Store = ScenicStore;
		return {
			hideLoader: ScenicStore.getSessionState().isLoading,
			layout: ScenicStore.getLayout(),
			test: ScenicStore.getData(),
			backBtn: Classnames(ScenicStore.getBackBtnState().css),
			lockHeight: {},
			onboardedUser: null
		};
	},
	componentWillMount: function(){
    ScenicStore.addChangeListener(this._onChange);
		var onboardedUser = $.parseJSON(readCookie('onboardedUser'));
    // var onboardedUser = false;
		if (onboardedUser) // change to onboardedUser
			this.setState({onboardedUser: true});
		else
			this.setState({bodyContent: false});
	},
  landingAnimation: function(){
    setTimeout(function(){
      $(".landing-animation").fadeOut();
    },5100);
  },
	componentDidMount: function(){
		// only occurs once once the rest of the site has loaded!
		createCookie('onboardedUser', true, 365);
		$("#containerRow").css({
			'z-index': -1
		})
    this.landingAnimation();
	},

	changeData: function(){
	    Actions.test();
	},
	startApplication: function(){
		this.setState({onboardedUser: true});
	},
  render: function(){
    var tutClasses = Classnames(
      'landing-tutorial',
      'viewContainer',
      'tutorial',
      (this.state.onboardedUser)?'hide': ''
    )
    return (

			<div id='containerRow' style={this.state.lockHeight} className="row">
        <div className={tutClasses}>
              <div className="landing-animation"></div>
                <Tutorial startApplication={this.startApplication} />
                <div onClick={this.startApplication} id='skip-tutorial'>skip</div>
        </div>
        <div id='backBtn' onClick={Actions.goBack} className={this.state.backBtn}></div>
          <ProfileNav />
          <SetupFlow layout={this.state.layout.nav} parentState={this.state} isLoading={Actions.isLoading} />
          <MapView layout={this.state.layout.map} />
          <Loader />
          <RouteView />
          <StaticPages />
          <ErrorView />
	    </div>
    );
  },
  componentWillUnmount: function(){
  	ScenicStore.removeChangeListener(this._onChange);
  },
  shouldComponentUpdate: function(){
    // Needs to be here!
    this.forceUpdate();
  },
  _onChange: function(){
  	// Set Loader State
  	this.setState({hideLoader: ScenicStore.getSessionState().isLoading});
  	// Set Updated Layouts State
  	this.setState({layout: ScenicStore.getLayout()});
    this.setState({
      // layout prop deails with right padding,
      // backBtnState deals with visibility of the button.
      backBtn: Classnames(
      	ScenicStore.getBackBtnState().css
      )
    }, function(){
      // console.log('backBtn updated!', ScenicStore.getBackBtnState().css)
    })
  }
});

React.render(<Body />, document.getElementById('content'));
