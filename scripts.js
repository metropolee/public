function menuHandler() {
	var menuTrigger = document.querySelector('.menu-trigger');
	menuTrigger.addEventListener('click', function() {
		document.body.classList.toggle('menu-open');
	}, false);
}

document.addEventListener('DOMContentLoaded', function() {
	menuHandler();
}, false);