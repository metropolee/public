/***************** HELPERS *****************/
//Element.prototype.addClassC = Element.prototype.addClassC || function ( htmlClass ) {
//	this.classList.add( htmlClass );
//	return this;
//};
//
//Element.prototype.removeClassC = Element.prototype.removeClassC || function ( htmlClass ) {
//	this.classList.remove( htmlClass );
//	return this;
//};
//
//Element.prototype.toggleClassC = Element.prototype.toggleClassC || function ( htmlClass ) {
//	this.classList.toggle( htmlClass );
//	return this;
//};



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
	if ( mammoccioBgToKill && mammoccioBgToKill != mammoccioBgToShow ) {
		mammoccioBgToKill.classList.remove( 'current' );
		mammoccioContentToKill.classList.remove( 'current' );
		mammoccioBgToShow.classList.add( 'current' );
		mammoccioContentToShow.classList.add( 'current' );
		mainMammoccio.style.height = mammoccioContentToShow.offsetHeight + 40 + 'px';
	}
}

function handleMammocci() {
	var mammocci = document.querySelectorAll( '.mammoccio' );
	if ( mammocci ) {
		mainMammoccio.style.height = mainMammoccio.querySelector( '.mammoccio-content.current' ).offsetHeight + 40 + 'px';
		[].forEach.call( mammocci, function ( mammoccio ) {
			mammoccio.addEventListener( 'click', updateMammoccio, false);
		});
	}
}

document.addEventListener('DOMContentLoaded', function() {
	// FastClick magic
	FastClick.attach(document.body);
	responsi.init();
	handleMammocci();
	menuHandler();
}, false);