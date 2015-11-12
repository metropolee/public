document.querySelector('head').innerHTML += '<meta name="apple-itunes-app" content="app-id=1031598275">' +
	'<meta name="google-play-app" content="app-id=com.metropolee.app.app55a2590531c3d">' +
	'<!-- for Facebook -->' +
	'<meta property="og:title" content="Metropolee" />' +
	'<meta property="og:type" content="website" />' +
	'<meta property="og:image" content="https://metropolee.s3.amazonaws.com/images/favicons/metropolee-logo.png" />' +
	'<meta property="og:url" content="http://metropolee.com" />' +
	'<meta property="og:description" content="Metropolee lets you build smartphone applications for local businesses and make profits out of them." />' +
	'<meta property="og:site_name" content="Metropolee" />' +
	'<!-- for Twitter -->' +
	'<meta name="twitter:card" content="summary" />' +
	'<meta name="twitter:site" content="@metropoleeapp" />' +
	'<meta name="twitter:title" content="Metropolee" />' +
	'<meta name="twitter:description" content="Metropolee lets you build smartphone applications for local businesses and make profits out of them." />' +
	'<meta name="twitter:image" content="https://metropolee.s3.amazonaws.com/images/favicons/metropolee-logo.png" />';

new SmartBanner({
	daysHidden: 15,
	daysReminder: 90,
	title: 'Metropolee Network App',
	author: 'Metropolee',
	button: 'VIEW',
	store: {
		ios: 'On the App Store',
		android: 'In Google Play',
	},
	price: {
		ios: 'FREE',
		android: 'FREE',
	}
//	, force: 'ios'
});

function handleVideoPlayer() {
	var videoTriggers = document.querySelectorAll( '.video-trigger' ),
		videoPlayerContainer = document.querySelector( '.video-player-container' );
	
	if ( videoTriggers && videoPlayerContainer ) {
		var videoPlayerClose = videoPlayerContainer.querySelector( '.video-player-close' ),
			videoIframe = videoPlayerContainer.querySelector( 'iframe' );
		
		[].forEach.call( videoTriggers, function ( videoTrigger ) {
			if ( videoTrigger ) {
				videoTrigger.addEventListener('click', function( event ) {
					event.preventDefault();
					var videoUrl = 'https://www.youtube.com/embed/' +  this.getAttribute( 'href' ).split("/").pop() + '?autoplay=1&showinfo=0&rel=0&wmode=transparent';
					
					videoIframe.setAttribute( 'src', videoUrl );
					videoPlayerContainer.classList.add( 'open' );
					videoPlayerClose.addEventListener('click', function() {
						videoPlayerContainer.classList.remove( 'open' );
						videoIframe.removeAttribute( 'src' );
					}, false);
				}, false);
			}
		});
	}
}

function cleanSignup() {
	var signupContainer = document.querySelector( '.signup' );
	function findAncestor ( el, cls ) {
		while ( ( el = el.parentElement ) && !el.classList.contains( cls ) );
		return el;
	}
	if ( signupContainer ) {
		var toRemove = signupContainer.querySelectorAll( '#fphone, #cPhone, #wphone, input[name=cellemail], #phonePref' );
		[].forEach.call( toRemove, function ( el ) {
			findAncestor( el, 'form-group' ).style.display = 'none';
		});
	}
}
cleanSignup();

document.addEventListener('DOMContentLoaded', function() {
	handleVideoPlayer();
}, false);