;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());


/**
 * @preserve Responsi – Making responsive and retina-ready images easy, lightweight and asynchronous.
 * @version 0.1.1
 * @author Emanuele Feliziani – emanuele@gravida.pro – http://gravida.pro
 * @homepage https://github.com/GioSensation/responsi
 * @license MIT License
 */

var responsi = {
	// We set viewport and dpi at the object level so they can be easily accessed outside responsi. It's just a helper. I know I will use them. Note: I couldn't find the browser support for devicePixelRatio, so I just throw a fallback in case that fails.
	viewport : document.documentElement.clientWidth,
	dpi : window.devicePixelRatio || 1,
	// Init fires the whole thing.
	init : function( responsiConfig ) {
		var viewport = this.viewport,
			dpi = this.dpi,
			responsiSize = 'large',
			defaultConfig = {
				phones	: 480,
				tabs	: 768,
				laps	: 1200,
				desks	: 1900
			};
		
		responsiConfig = typeof responsiConfig !== 'undefined' ? responsiConfig : defaultConfig;
		
		/***************** SMALL *****************/
		if (
			viewport <= responsiConfig.phones /* 480 */ // all smartphones, regardless of dpi
			||
			viewport < responsiConfig.tabs /* 768 */ && dpi < 1.5 // up to regular dpi phablets and small tablets (no iPad)
			) {
				responsiSize = 'small';
			}
		
		/***************** MEDIUM *****************/
		if (
			viewport > responsiConfig.phones /* 480 */ && viewport < responsiConfig.laps /* 1200 */ && dpi > 1.5 // hidpi phablets, tablets and hidpi small computers (dunno whether they even exist)
			||
			viewport >= responsiConfig.tabs /* 768 */ && viewport < responsiConfig.desks /* 1900 */ && dpi < 1.5 // regular tablets, laptops & desktop
			) {
				responsiSize = 'medium';
			}
		
		/***************** LARGE *****************/
		if (
			viewport >= responsiConfig.laps /* 1200 */ && dpi > 1.5 // hidpi laptops
			||
			viewport >= responsiConfig.desks /* 1900 */ // big desktops
			) {
				responsiSize = 'large';
			}
		
		/***************** RSPONSI MAGIC HAPPENS HERE *****************/
		// Get the source URI.
		function getResponsiSrc(el) {
			// If the element has the attribute of the desired size, get that size URI, otherwise try other sizes. A loop would have been more elegant, but this should be faster.
			var imgSrc = el.getAttribute('data-responsi-' + responsiSize) ||
						 el.getAttribute('data-responsi-large') ||
						 el.getAttribute('data-responsi-medium') ||
						 el.getAttribute('data-responsi-small');
			return imgSrc;
		}
		
		function getResponsiAlt(el) {
			var altValue;
			if (el.hasAttribute('data-responsi-alt')) {
				altValue = el.getAttribute('data-responsi-alt');
			} else {
				altValue = document.title;
			}
			return altValue;
		}
		
		// Get responsi elements and loop through them, then get attributes, create the image element and append it.
		var responsiImgs = document.querySelectorAll('.responsi-img');
		[].forEach.call(responsiImgs, function(el) {
			if (getResponsiSrc(el)) {
				// If the alt attribute is not defined, we will set it to an empty string.
				var imgEl = new Image();
				imgEl.src = getResponsiSrc(el);
				imgEl.alt = getResponsiAlt(el);
				el.appendChild(imgEl);
				// Removing the responsi class allows us to call the function again after the first call, for example if we want to create responsi elements dynamically.
				el.classList.remove('responsi-img');
			}
		});
		
		// Responsi logic for background images.
		var responsiBgImgs = document.querySelectorAll('.responsi-bg-img');
		[].forEach.call(responsiBgImgs, function(el) {
			var imgSrc = getResponsiSrc(el);
			el.style.backgroundImage = "url(" + imgSrc + ")";
			// Removing the responsi class allows us to call the function again after the first call, for example if we want to create responsi elements dynamically.
			el.classList.remove('responsi-bg-img');
		});
	}
};

(function(t){"object"===typeof exports&&"undefined"!==typeof module?module.exports=t():"function"===typeof define&&define.amd?define([],t):("undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:this).SmartBanner=t()})(function(){return function d(g,f,e){function b(c,n){if(!f[c]){if(!g[c]){var k="function"==typeof require&&require;if(!n&&k)return k(c,!0);if(a)return a(c,!0);k=Error("Cannot find module '"+c+"'");throw k.code="MODULE_NOT_FOUND",k;}k=f[c]=
{exports:{}};g[c][0].call(k.exports,function(a){var e=g[c][1][a];return b(e?e:a)},k,k.exports,d,g,f,e)}return f[c].exports}for(var a="function"==typeof require&&require,c=0;c<e.length;c++)b(e[c]);return b}({1:[function(d,g,f){var e=d("xtend/mutable"),b=d("component-query"),a=d("get-doc"),c=a&&a.documentElement,q=d("cookie-cutter"),n=d("ua-parser-js"),k={ios:{appMeta:"apple-itunes-app",iconRels:["apple-touch-icon-precomposed","apple-touch-icon"],getStoreLink:function(){return"https://itunes.apple.com/"+
this.options.appStoreLanguage+"/app/id"+this.appId}},android:{appMeta:"google-play-app",iconRels:["android-touch-icon","apple-touch-icon-precomposed","apple-touch-icon"],getStoreLink:function(){return"http://play.google.com/store/apps/details?id="+this.appId}},windows:{appMeta:"msApplication-ID",iconRels:["windows-touch-icon","apple-touch-icon-precomposed","apple-touch-icon"],getStoreLink:function(){return"http://www.windowsphone.com/s?appid="+this.appId}}};d=function(b){var a=n(navigator.userAgent);
this.options=e({},{daysHidden:15,daysReminder:90,appStoreLanguage:"us",button:"OPEN",store:{ios:"On the App Store",android:"In Google Play",windows:"In the Windows Store"},price:{ios:"FREE",android:"FREE",windows:"FREE"},force:!1},b||{});this.options.force?this.type=this.options.force:"Windows Phone"===a.os.name||"Windows Mobile"===a.os.name?this.type="windows":"iOS"===a.os.name&&6>parseInt(a.os.version)?this.type="ios":"Android"===a.os.name&&(this.type="android");!this.type||navigator.standalone||
q.get("smartbanner-closed")||q.get("smartbanner-installed")||(e(this,k[this.type]),this.parseAppId()&&(this.create(),this.show()))};d.prototype={constructor:d,create:function(){for(var c=this.getStoreLink(),e=this.options.price[this.type]+" - "+this.options.store[this.type],d,u=0;u<this.iconRels.length;u++){var v=b('link[rel="'+this.iconRels[u]+'"]');if(v){d=v.getAttribute("href");break}}var p=a.createElement("div");p.className="smartbanner smartbanner-"+this.type;p.innerHTML='<div class="smartbanner-container"><a href="javascript:void(0);" class="smartbanner-close">&times;</a><span class="smartbanner-icon" style="background-image: url('+
d+')"></span><div class="smartbanner-info"><div class="smartbanner-title">'+this.options.title+"</div><div>"+this.options.author+"</div><span>"+e+'</span></div><a href="'+c+'" class="smartbanner-button"><span class="smartbanner-button-text">'+this.options.button+"</span></a></div>";a.body?a.body.appendChild(p):a&&a.addEventListener("DOMContentLoaded",function(){a.body.appendChild(p)});b(".smartbanner-button",p).addEventListener("click",this.install.bind(this),!1);b(".smartbanner-close",p).addEventListener("click",
this.close.bind(this),!1)},hide:function(){c.classList.remove("smartbanner-show")},show:function(){c.classList.add("smartbanner-show")},close:function(){this.hide();q.set("smartbanner-closed","true",{path:"/",expires:+new Date+864E5*this.options.daysHidden})},install:function(){this.hide();q.set("smartbanner-installed","true",{path:"/",expires:+new Date+864E5*this.options.daysReminder})},parseAppId:function(){var a=b('meta[name="'+this.appMeta+'"]');if(a)return this.appId="windows"===this.type?a.getAttribute("content"):
/app-id=([^\s,]+)/.exec(a.getAttribute("content"))[1]}};g.exports=d},{"component-query":2,"cookie-cutter":3,"get-doc":4,"ua-parser-js":6,"xtend/mutable":7}],2:[function(d,g,f){function e(b,a){return a.querySelector(b)}f=g.exports=function(b,a){a=a||document;return e(b,a)};f.all=function(b,a){a=a||document;return a.querySelectorAll(b)};f.engine=function(b){if(!b.one)throw Error(".one callback required");if(!b.all)throw Error(".all callback required");e=b.one;f.all=b.all;return f}},{}],3:[function(d,
g,f){f=g.exports=function(e){e||(e={});"string"===typeof e&&(e={cookie:e});void 0===e.cookie&&(e.cookie="");return{get:function(b){for(var a=e.cookie.split(/;\s*/),c=0;c<a.length;c++){var d=a[c].split("=");if(unescape(d[0])===b)return unescape(d[1])}},set:function(b,a,c){c||(c={});b=escape(b)+"="+escape(a);c.expires&&(b+="; expires="+c.expires);c.path&&(b+="; path="+escape(c.path));return e.cookie=b}}};"undefined"!==typeof document&&(d=f(document),f.get=d.get,f.set=d.set)},{}],4:[function(d,g,f){d=
d("has-dom");g.exports=d()?document:null},{"has-dom":5}],5:[function(d,g,f){g.exports=function(){return"undefined"!==typeof window&&"undefined"!==typeof document&&"function"===typeof document.createElement}},{}],6:[function(d,g,f){(function(e,b){var a={extend:function(a,b){for(var c in b)-1!=="browser cpu device engine os".indexOf(c)&&0===b[c].length%2&&(a[c]=b[c].concat(a[c]));return a},has:function(a,b){return"string"===typeof a?-1!==b.toLowerCase().indexOf(a.toLowerCase()):!1},lowerize:function(a){return a.toLowerCase()},
major:function(a){return"string"===typeof a?a.split(".")[0]:b}},c=function(){for(var a,c=0,d,e,f,h,g,k,l=arguments;c<l.length&&!g;){var n=l[c],m=l[c+1];if("undefined"===typeof a)for(f in a={},m)h=m[f],"object"===typeof h?a[h[0]]=b:a[h]=b;for(d=e=0;d<n.length&&!g;)if(g=n[d++].exec(this.getUA()))for(f=0;f<m.length;f++)k=g[++e],h=m[f],"object"===typeof h&&0<h.length?2==h.length?a[h[0]]="function"==typeof h[1]?h[1].call(this,k):h[1]:3==h.length?a[h[0]]="function"!==typeof h[1]||h[1].exec&&h[1].test?k?
k.replace(h[1],h[2]):b:k?h[1].call(this,k,h[2]):b:4==h.length&&(a[h[0]]=k?h[3].call(this,k.replace(h[1],h[2])):b):a[h]=k?k:b;c+=2}return a},d=function(c,d){for(var e in d)if("object"===typeof d[e]&&0<d[e].length)for(var f=0;f<d[e].length;f++){if(a.has(d[e][f],c))return"?"===e?b:e}else if(a.has(d[e],c))return"?"===e?b:e;return c},n={ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2E3:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2","8.1":"NT 6.3",10:["NT 6.4","NT 10.0"],RT:"ARM"},
k={browser:[[/(opera\smini)\/([\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,/(opera).+version\/([\w\.]+)/i,/(opera)[\/\s]+([\w\.]+)/i],["name","version"],[/\s(opr)\/([\w\.]+)/i],[["name","Opera"],"version"],[/(kindle)\/([\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,/(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,/(?:ms|\()(ie)\s([\w\.]+)/i,/(rekonq)\/([\w\.]+)*/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium)\/([\w\.-]+)/i],
["name","version"],[/(trident).+rv[:\s]([\w\.]+).+like\sgecko/i],[["name","IE"],"version"],[/(edge)\/((\d+)?[\w\.]+)/i],["name","version"],[/(yabrowser)\/([\w\.]+)/i],[["name","Yandex"],"version"],[/(comodo_dragon)\/([\w\.]+)/i],[["name",/_/g," "],"version"],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i,/(uc\s?browser|qqbrowser)[\/\s]?([\w\.]+)/i],["name","version"],[/(dolfin)\/([\w\.]+)/i],[["name","Dolphin"],"version"],[/((?:android.+)crmo|crios)\/([\w\.]+)/i],[["name","Chrome"],
"version"],[/XiaoMi\/MiuiBrowser\/([\w\.]+)/i],["version",["name","MIUI Browser"]],[/android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)/i],["version",["name","Android Browser"]],[/FBAV\/([\w\.]+);/i],["version",["name","Facebook"]],[/version\/([\w\.]+).+?mobile\/\w+\s(safari)/i],["version",["name","Mobile Safari"]],[/version\/([\w\.]+).+?(mobile\s?safari|safari)/i],["version","name"],[/webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i],["name",["version",d,{"1.0":"/8","1.2":"/1","1.3":"/3","2.0":"/412",
"2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/"}]],[/(konqueror)\/([\w\.]+)/i,/(webkit|khtml)\/([\w\.]+)/i],["name","version"],[/(navigator|netscape)\/([\w\.-]+)/i],[["name","Netscape"],"version"],[/fxios\/([\w\.-]+)/i],["version",["name","Firefox"]],[/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,/(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,/(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf)[\/\s]?([\w\.]+)/i,
/(links)\s\(([\w\.]+)/i,/(gobrowser)\/?([\w\.]+)*/i,/(ice\s?browser)\/v?([\w\._]+)/i,/(mosaic)[\/\s]([\w\.]+)/i],["name","version"]],cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[["architecture","amd64"]],[/(ia32(?=;))/i],[["architecture",a.lowerize]],[/((?:i[346]|x)86)[;\)]/i],[["architecture","ia32"]],[/windows\s(ce|mobile);\sppc;/i],[["architecture","arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[["architecture",/ower/,"",a.lowerize]],[/(sun4\w)[;\)]/i],[["architecture","sparc"]],
[/((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[["architecture",a.lowerize]]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],["model","vendor",["type","tablet"]],[/applecoremedia\/[\w\.]+ \((ipad)/],["model",["vendor","Apple"],["type","tablet"]],[/(apple\s{0,1}tv)/i],[["model","Apple TV"],["vendor","Apple"]],[/(archos)\s(gamepad2?)/i,/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],
["vendor","model",["type","tablet"]],[/(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i],["model",["vendor","Amazon"],["type","tablet"]],[/(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i],[["model",d,{"Fire Phone":["SD","KF"]}],["vendor","Amazon"],["type","mobile"]],[/\((ip[honed|\s\w*]+);.+(apple)/i],["model","vendor",["type","mobile"]],[/\((ip[honed|\s\w*]+);/i],["model",["vendor","Apple"],["type","mobile"]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],["vendor","model",["type","mobile"]],[/\(bb10;\s(\w+)/i],["model",["vendor","BlackBerry"],["type","mobile"]],[/android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7)/i],["model",["vendor","Asus"],["type","tablet"]],[/(sony)\s(tablet\s[ps])\sbuild\//i,/(sony)?(?:sgp.+)\sbuild\//i],[["vendor","Sony"],["model","Xperia Tablet"],["type","tablet"]],[/(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i],[["vendor","Sony"],["model","Xperia Phone"],["type",
"mobile"]],[/\s(ouya)\s/i,/(nintendo)\s([wids3u]+)/i],["vendor","model",["type","console"]],[/android.+;\s(shield)\sbuild/i],["model",["vendor","Nvidia"],["type","console"]],[/(playstation\s[3portablevi]+)/i],["model",["vendor","Sony"],["type","console"]],[/(sprint\s(\w+))/i],[["vendor",d,{HTC:"APA",Sprint:"Sprint"}],["model",d,{"Evo Shift 4G":"7373KT"}],["type","mobile"]],[/(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i],["vendor","model",["type","tablet"]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,
/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i],["vendor",["model",/_/g," "],["type","mobile"]],[/(nexus\s9)/i],["model",["vendor","HTC"],["type","tablet"]],[/[\s\(;](xbox(?:\sone)?)[\s\);]/i],["model",["vendor","Microsoft"],["type","console"]],[/(kin\.[onetw]{3})/i],[["model",/\./g," "],["vendor","Microsoft"],["type","mobile"]],[/\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,/mot[\s-]?(\w+)*/i,/(XT\d{3,4}) build\//i],["model",
["vendor","Motorola"],["type","mobile"]],[/android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i],["model",["vendor","Motorola"],["type","tablet"]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9|nexus 10))/i,/((SM-T\w+))/i],[["vendor","Samsung"],"model",["type","tablet"]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-n900))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[["vendor","Samsung"],"model",["type","mobile"]],[/(samsung);smarttv/i],["vendor","model",["type","smarttv"]],[/\(dtv[\);].+(aquos)/i],
["model",["vendor","Sharp"],["type","smarttv"]],[/sie-(\w+)*/i],["model",["vendor","Siemens"],["type","mobile"]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[["vendor","Nokia"],"model",["type","mobile"]],[/android\s3\.[\s\w;-]{10}(a\d{3})/i],["model",["vendor","Acer"],["type","tablet"]],[/android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i],[["vendor","LG"],"model",["type","tablet"]],[/(lg) netcast\.tv/i],["vendor","model",["type","smarttv"]],[/(nexus\s[45])/i,/lg[e;\s\/-]+(\w+)*/i],
["model",["vendor","LG"],["type","mobile"]],[/android.+(ideatab[a-z0-9\-\s]+)/i],["model",["vendor","Lenovo"],["type","tablet"]],[/linux;.+((jolla));/i],["vendor","model",["type","mobile"]],[/((pebble))app\/[\d\.]+\s/i],["vendor","model",["type","wearable"]],[/android.+;\s(glass)\s\d/i],["model",["vendor","Google"],["type","wearable"]],[/android.+(\w+)\s+build\/hm\1/i,/android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,/android.+(mi[\s\-_]*(?:one|one[\s_]plus)?[\s_]*(?:\d\w)?)\s+build/i],[["model",
/_/g," "],["vendor","Xiaomi"],["type","mobile"]],[/(mobile|tablet);.+rv\:.+gecko\//i],[["type",a.lowerize],"vendor","model"]],engine:[[/windows.+\sedge\/([\w\.]+)/i],["version",["name","EdgeHTML"]],[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],["name","version"],[/rv\:([\w\.]+).*(gecko)/i],["version","name"]],os:[[/microsoft\s(windows)\s(vista|xp)/i],["name","version"],[/(windows)\snt\s6\.2;\s(arm)/i,
/(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],["name",["version",d,n]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[["name","Windows"],["version",d,n]],[/\((bb)(10);/i],[["name","BlackBerry"],"version"],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)[\/\s]([\w\.]+)/i,/(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,/linux;.+(sailfish);/i],["name","version"],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[["name","Symbian"],"version"],
[/\((series40);/i],["name"],[/mozilla.+\(mobile;.+gecko.+firefox/i],[["name","Firefox OS"],"version"],[/(nintendo|playstation)\s([wids3portablevu]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(mageia|vectorlinux)[;\s]/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],["name","version"],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[["name","Chromium OS"],"version"],[/(sunos)\s?([\w\.]+\d)*/i],
[["name","Solaris"],"version"],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i],["name","version"],[/(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i],[["name","iOS"],["version",/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i,/(macintosh|mac(?=_powerpc)\s)/i],[["name","Mac OS"],["version",/_/g,"."]],[/((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,/(unix)\s?([\w\.]+)*/i],["name","version"]]},
l=function(b,d){if(!(this instanceof l))return(new l(b,d)).getResult();var f=b||(e&&e.navigator&&e.navigator.userAgent?e.navigator.userAgent:""),g=d?a.extend(k,d):k;this.getBrowser=function(){var b=c.apply(this,g.browser);b.major=a.major(b.version);return b};this.getCPU=function(){return c.apply(this,g.cpu)};this.getDevice=function(){return c.apply(this,g.device)};this.getEngine=function(){return c.apply(this,g.engine)};this.getOS=function(){return c.apply(this,g.os)};this.getResult=function(){return{ua:this.getUA(),
browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU()}};this.getUA=function(){return f};this.setUA=function(a){f=a;return this};this.setUA(f);return this};l.VERSION="0.7.9";l.BROWSER={NAME:"name",MAJOR:"major",VERSION:"version"};l.CPU={ARCHITECTURE:"architecture"};l.DEVICE={MODEL:"model",VENDOR:"vendor",TYPE:"type",CONSOLE:"console",MOBILE:"mobile",SMARTTV:"smarttv",TABLET:"tablet",WEARABLE:"wearable",EMBEDDED:"embedded"};l.ENGINE={NAME:"name",
VERSION:"version"};l.OS={NAME:"name",VERSION:"version"};"undefined"!==typeof f?("undefined"!==typeof g&&g.exports&&(f=g.exports=l),f.UAParser=l):e.UAParser=l;var m=e.jQuery||e.Zepto;if("undefined"!==typeof m){var r=new l;m.ua=r.getResult();m.ua.get=function(){return r.getUA()};m.ua.set=function(a){r.setUA(a);a=r.getResult();for(var b in a)m.ua[b]=a[b]}}})("object"===typeof window?window:this)},{}],7:[function(d,g,f){g.exports=function(d){for(var b=1;b<arguments.length;b++){var a=arguments[b],c;for(c in a)a.hasOwnProperty(c)&&
(d[c]=a[c])}return d}},{}]},{},[1])(1)});


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
function removeCreditCard() {
	var creditCardPaymentForm = document.getElementById( 'frmPayment_2' );
	if ( creditCardPaymentForm ) {
		var amount = creditCardPaymentForm.querySelector( 'input[name=total]' ).value;
		if ( amount > 1800 ) {
			creditCardPaymentForm.style.display = 'none';
		}
	}
}

document.addEventListener('DOMContentLoaded', function() {
	handleVideoPlayer();
	cleanSignup();
	removeCreditCard();
}, false);

