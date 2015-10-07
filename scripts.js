
function handleVideoPlayer() {
	var videoTriggers = document.querySelectorAll( '.video-trigger' ),
		videoPlayerContainer = document.querySelector( '.video-player-container' ),
		videoPlayerClose = videoPlayerContainer.querySelector( '.video-player-close' ),
		videoIframe = videoPlayerContainer.querySelector( 'iframe' );
	
	[].forEach.call( videoTriggers, function ( videoTrigger ) {
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
	});
}

document.addEventListener('DOMContentLoaded', function() {
	handleVideoPlayer();
}, false);