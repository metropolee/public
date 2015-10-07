function menuHandler() {
	var menuTrigger = document.querySelector('.menu-trigger');
	menuTrigger.addEventListener('click', function() {
		document.body.classList.toggle('menu-open');
	}, false);
}

/***************** FORM ANIMATIONS *****************/

function onInputFocus( ev ) {
	ev.target.parentNode.classList.add( 'input--filled' );
}

function onInputBlur( ev ) {
	if( ev.target.value.trim() === '' ) {
		ev.target.parentNode.classList.remove( 'input--filled' );
	}
}

var allInputs = document.querySelectorAll( 'input:not([type=submit]), textarea' );
[].forEach.call( allInputs, function ( inputEl ) {
	// in case the input is already filled
	if( inputEl.value.trim() !== '' ) {
		inputEl.parentNode.classList.add( 'input--filled' );
	}

	// events:
	inputEl.addEventListener( 'focus', onInputFocus );
	inputEl.addEventListener( 'blur', onInputBlur );
} );

/***************** MAMMOCCI *****************/
var mainMammoccio = document.querySelector( '.main-mammoccio' );
function updateMammoccio() {
	var name = this.getAttribute( 'data-mammoccio' ),
		mammoccioBgToShow = mainMammoccio.querySelector( '.main-mammoccio__bg.' + name ),
		mammoccioContentToShow = mainMammoccio.querySelector( '.mammoccio-content.' + name ),
		mammoccioBgToKill = mainMammoccio.querySelector( '.main-mammoccio__bg.current' ),
		mammoccioContentToKill = mainMammoccio.querySelector( '.mammoccio-content.current' );
	if ( mammoccioBgToKill && mammoccioBgToKill !== mammoccioBgToShow ) {
		mammoccioBgToKill.classList.remove( 'current' );
		mammoccioContentToKill.classList.remove( 'current' );
		mammoccioBgToShow.classList.add( 'current' );
		mammoccioContentToShow.classList.add( 'current' );
		mainMammoccio.style.height = mammoccioContentToShow.offsetHeight + 40 + 'px';
	}
}

function handleMammocci() {
	if ( mainMammoccio ) {
		var mammocci = document.querySelectorAll( '.mammoccio' );
		mainMammoccio.style.height = mainMammoccio.querySelector( '.mammoccio-content.current' ).offsetHeight + 40 + 'px';
		[].forEach.call( mammocci, function ( mammoccio ) {
			mammoccio.addEventListener( 'click', updateMammoccio, false);
		});
	}
}

/***************** scrollTo Helper *****************/
// Ubercool scrollTo animation taken from here: https://gist.github.com/james2doyle/5694700. It uses requestAnimationFrame for better performance. Ubercool!

//t = current time
//b = start value
//c = change in value
//d = duration
Math.easeInOutQuad = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) {
		return c/2*t*t + b;
	}
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
};

// requestAnimationFrame for Smart Animating http://goo.gl/sx5sts
var requestAnimFrame = (function(){
	return  window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function( callback ){ window.setTimeout(callback, 1000 / 60); };
})();

function scrollTo(to, callback, duration) {
	// because it's so fucking difficult to detect the scrolling element, just move them all
	function move(amount) {
		document.documentElement.scrollTop = amount;
		document.body.parentNode.scrollTop = amount;
		document.body.scrollTop = amount;
	}
	function position() {
		return document.documentElement.scrollTop || document.body.parentNode.scrollTop || document.body.scrollTop;
	}
	var start = position(),
		change = to - start,
		currentTime = 0,
		increment = 20;
	duration = (typeof(duration) === 'undefined') ? 500 : duration;
	var animateScroll = function() {
		// increment the time
		currentTime += increment;
		// find the value with the quadratic in-out easing function
		var val = Math.easeInOutQuad(currentTime, start, change, duration);
		// move the document.body
		move(val);
		// do the animation unless its over
		if (currentTime < duration) {
			requestAnimFrame(animateScroll);
		} else {
			if (callback && typeof(callback) === 'function') {
				// the animation is done so lets callback
				callback();
			}
		}
	};
	animateScroll();
}

function scrollToInit() {
	var hashLinks = document.querySelectorAll( 'a[href^="#"]' );
	if ( hashLinks ) {
		[].forEach.call( hashLinks, function ( hashLink ) {
			hashLink.addEventListener('click', function(event) {
				event.preventDefault();
				var target = this.getAttribute('href').substring(1);
				if ( target ) {
					scrollTo( document.getElementById( target ).offsetTop - 150, 400);
				}
			}, false);
		});
	}
}

document.addEventListener('DOMContentLoaded', function() {
	// FastClick magic
	FastClick.attach(document.body);
	handleMammocci();
	menuHandler();
	scrollToInit();
}, false);