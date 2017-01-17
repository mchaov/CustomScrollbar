"use strict";
var CustomScrollbar = (function () {
    function CustomScrollbar(element, observable, template) {
        var _this = this;
        if (observable === void 0) { observable = false; }
        if (typeof Object.setPrototypeOf === "function") {
            Object.setPrototypeOf(Object.getPrototypeOf(this), null);
        }
        var supportedWheelEvent = "onwheel" in HTMLDivElement.prototype ? "wheel" :
            document.onmousewheel !== undefined ? "mousewheel" : "DOMMouseScroll";
        this.classes = Object.create(null, {
            wrapper: { configurable: true, writable: false, value: "-wrapper" },
            main: { configurable: true, writable: false, value: "scrollable" },
            base: { configurable: true, writable: false, value: "scrollbar" },
            track: { configurable: true, writable: false, value: "-track" },
            thumb: { configurable: true, writable: false, value: "-thumb" },
            enabled: { writable: false, value: "is-scrolling-enabled" },
            scrolling: { writable: false, value: "is-scrolling" },
            focused: { writable: false, value: "is-focused" },
        });
        this.html = Object.create(null, {
            parent: { writable: false, value: element },
            wrapper: { writable: false, value: element.querySelector("." + this.classes.main + this.classes.wrapper) }
        });
        this.template = Object.assign([{
                type: "div",
                attr: { class: this.classes.base },
                content: [{
                        type: "div",
                        attr: { class: this.classes.base + this.classes.track },
                        content: [{
                                type: "div",
                                attr: { class: this.classes.base + this.classes.thumb }
                            }]
                    }]
            }], template || {});
        this.domTemplate = document.createDocumentFragment();
        this.drag = false;
        this.scroll = Object.create(null, {
            max: { writable: true, value: 0 },
            min: { writable: true, value: 0 },
            parent: {
                writable: false,
                value: Object.create(null, {
                    height: { writable: true, value: 0 }
                })
            },
            wrapper: {
                writable: false,
                value: Object.create(null, {
                    height: { writable: true, value: 0 },
                    current: { writable: true, value: 0 }
                })
            },
            thumb: {
                writable: false,
                value: Object.create(null, {
                    height: { writable: true, value: 0 },
                    current: { writable: true, value: 0 }
                })
            },
            end: { writable: true, value: false },
            start: { writable: true, value: false }
        });
        this.delta = Object.create(null, {
            initial: { writable: true, value: 0 },
            current: { writable: true, value: 0 },
            ratio: { writable: true, value: 0 }
        });
        this.enabled = false;
        this.animationTimer = 0;
        this.animationSuccess = 0;
        this.wheelDelta = undefined;
        this.wheelDeltaMultiplier = undefined;
        this.cache = Object.create(null, {
            wheelDelta: { enumerable: true, writable: true, value: Object.create(null) },
            clickDelta: { enumerable: true, writable: true, value: Object.create(null) },
            moveDelta: { enumerable: true, writable: true, value: Object.create(null) }
        });
        this.buildTemplate();
        this.addBindings();
        this.appendDOM(this.html.parent, this.domTemplate);
        this.boundElements = Object.create(null, {
            parent: { writable: false, value: this.html.parent },
            window: { writable: false, value: window },
            document: { writable: false, value: document }
        });
        this.boundEvents = Object.create(null, {
            parent: {
                enumerable: true, writable: true, value: Object.create(null, {
                    mouseenter: { enumerable: true, writable: false, value: this.handleMouseEnter.bind(this) },
                    mouseleave: { enumerable: true, writable: false, value: this.handleMouseLeave.bind(this) },
                    mousedown: { enumerable: true, writable: false, value: this.handlerMouseDown.bind(this) },
                    click: { enumerable: true, writable: false, value: this.handlerClick.bind(this) }
                })
            },
            document: {
                enumerable: true, writable: true, value: Object.create(null, {
                    mousemove: { enumerable: true, writable: false, value: this.handlerMouseMove.bind(this) },
                    mouseup: { enumerable: true, writable: false, value: this.handlerMouseUp.bind(this) },
                    keyup: { enumerable: true, writable: false, value: this.handleKeyUp.bind(this) }
                })
            },
            window: {
                enumerable: true, writable: true, value: Object.create(null, {
                    resize: { enumerable: true, writable: false, value: this.handlerResize.bind(this) }
                })
            }
        });
        this.boundEvents.parent[supportedWheelEvent] = this.handlerScroll.bind(this);
        this.cursorStep = 50;
        this.keysmap = Object.create(null, {
            33: { writable: false, value: function () { return _this.setScroll(-_this.scroll.parent.height); } },
            34: { writable: false, value: function () { return _this.setScroll(_this.scroll.parent.height); } },
            38: { writable: false, value: function () { return _this.setScroll(-_this.cursorStep); } },
            40: { writable: false, value: function () { return _this.setScroll(_this.cursorStep); } },
            35: { writable: false, value: function () { return _this.scrollBottom(); } },
            36: { writable: false, value: function () { return _this.scrollTop(); } } // home
        });
        this.timeouts = Object.create(null, {
            scroll: { writable: true, value: null },
            resize: { writable: true, value: null }
        });
        this.movementType = "top";
        ["transform", "msTransform"].forEach(function (x) {
            if (x in _this.html.parent.style) {
                _this.movementType = x;
            }
        });
        this.observer = null;
        this.observerAvailable = typeof MutationObserver === "function";
        if (observable) {
            this.observe();
        }
        this.manageEventListeners("add");
        this.update();
    }
    /**
     * DOM
     */
    CustomScrollbar.prototype.applyAttrs = function (e, a) {
        for (var i in a) {
            if (a.hasOwnProperty(i)) {
                e.setAttribute(i, a[i]);
            }
        }
        return e;
    };
    CustomScrollbar.prototype.buildRecursively = function (o, parent) {
        var _this = this;
        var html = parent || this.domTemplate;
        if (Array.isArray(o)) {
            o.forEach(function (e) {
                var _e = document.createElement(e.type);
                if (e.attr) {
                    _this.applyAttrs(_e, e.attr);
                }
                return html.appendChild(_this.buildRecursively(e.content, _e));
            });
        }
        return html;
    };
    CustomScrollbar.prototype.buildTemplate = function () {
        return this.domTemplate = this.buildRecursively(this.template, this.domTemplate);
    };
    CustomScrollbar.prototype.addBindings = function () {
        Object.defineProperties(this.html, {
            scrollbar: { writable: false, value: this.domTemplate.querySelector("." + this.classes.base) },
            track: { writable: false, value: this.domTemplate.querySelector("." + this.classes.base + "-track") },
            thumb: { writable: false, value: this.domTemplate.querySelector("." + this.classes.base + "-thumb") }
        });
        return null;
    };
    CustomScrollbar.prototype.appendDOM = function (e, c) {
        e.appendChild(c);
        return null;
    };
    CustomScrollbar.prototype.getInnerHeight = function (el) {
        var clientHeight = el.clientHeight;
        var _a = getComputedStyle(el), paddingTop = _a.paddingTop, paddingBottom = _a.paddingBottom;
        return clientHeight - parseFloat(paddingTop) - parseFloat(paddingBottom);
    };
    /**
     * PAINT
     */
    CustomScrollbar.prototype.paint = function (t) {
        if (this.animationTimer - t > -17 || this.animationSuccess - t < -64) {
            this.setupScrollPosition();
            this.animationSuccess = t;
        }
        this.setupThumbPosition();
        this.animationTimer = t;
        return this;
    };
    CustomScrollbar.prototype.requestFrame = function (callback) {
        this.cancelFrame();
        this.animationFrame = requestAnimationFrame(callback.bind(this));
        return this;
    };
    CustomScrollbar.prototype.cancelFrame = function () {
        cancelAnimationFrame(this.animationFrame);
        return this;
    };
    /**
     * SCROLLING
     */
    CustomScrollbar.prototype.setupScrollHeights = function () {
        this.scroll.parent.height = this.getInnerHeight(this.html.parent);
        this.scroll.wrapper.height = this.getInnerHeight(this.html.wrapper);
        this.scroll.thumb.height = (this.scroll.parent.height > this.scroll.wrapper.height ?
            this.scroll.parent.height :
            Math.floor(this.scroll.parent.height *
                (this.scroll.parent.height / this.scroll.wrapper.height)));
        this.delta.ratio = this.scroll.wrapper.height / (this.scroll.parent.height + this.scroll.thumb.height);
        this.html.thumb.style.height = this.scroll.thumb.height + "px";
        return this;
    };
    CustomScrollbar.prototype.generate_topString = function (x) {
        return "top:" + x + "px";
    };
    CustomScrollbar.prototype.generate_msTransformString = function (x) {
        return this.generate_transformString(x);
    };
    CustomScrollbar.prototype.generate_transformString = function (x) {
        return "translate(0, " + x + "px)";
    };
    CustomScrollbar.prototype.generateDeltaString = function (x) {
        return this["generate_" + this.movementType + "String"](x);
    };
    CustomScrollbar.prototype.setupThumbPosition = function () {
        this.html.thumb.style[this.movementType] = this.generateDeltaString(this.scroll.thumb.current);
        return this;
    };
    CustomScrollbar.prototype.setupScrollPosition = function () {
        this.html.wrapper.style[this.movementType] = this.generateDeltaString(this.scroll.wrapper.current);
        return this;
    };
    CustomScrollbar.prototype.setupScrollMinMax = function () {
        this.scroll.min = 0;
        this.scroll.max = this.scroll.parent.height - this.scroll.wrapper.height;
        return this;
    };
    CustomScrollbar.prototype.setupCalculations = function () {
        this.setupScrollHeights().setupScrollMinMax();
        return this;
    };
    CustomScrollbar.prototype.setScroll = function (delta, timer) {
        var _this = this;
        if (this.enabled) {
            var t = this.scroll.wrapper.current + delta * -1, p = void 0, d = void 0;
            this.scroll.wrapper.current = t;
            this.scroll.start = false;
            this.scroll.end = false;
            if (t >= 0) {
                this.scroll.wrapper.current = this.scroll.min;
                this.scroll.start = true;
            }
            if (t < 0 && this.scroll.wrapper.current <= this.scroll.max) {
                this.scroll.wrapper.current = this.scroll.max;
                this.scroll.end = true;
            }
            p = this.scroll.wrapper.current / this.scroll.max;
            d = this.scroll.thumb.height * p;
            this.scroll.thumb.current = this.scroll.parent.height * p + d * -1;
            this.requestFrame(function (t) { _this.paint(t); });
        }
        return this;
    };
    CustomScrollbar.prototype.scrollTop = function () { this.setScroll(this.scroll.max); return this; };
    CustomScrollbar.prototype.scrollBottom = function () { this.setScroll(-this.scroll.max); return this; };
    CustomScrollbar.prototype.scrollTo = function (o) {
        var t = typeof o === "object" ? o.offsetTop : o;
        if (this.scroll.wrapper.current === -t) {
            return this;
        }
        this.setScroll(t += this.scroll.wrapper.current);
        return this;
    };
    /**
     * Event listeners
     */
    CustomScrollbar.prototype.handlerScroll = function (e) {
        if (typeof this.wheelDelta === "undefined") {
            if (e.wheelDelta) {
                this.wheelDelta = "wheelDelta";
                this.wheelDeltaMultiplier = 1;
            }
            else {
                this.wheelDelta = "deltaY";
                this.wheelDeltaMultiplier = -32;
            }
        }
        var d = e[this.wheelDelta] * this.wheelDeltaMultiplier;
        if (!this.cache.wheelDelta[d]) {
            this.cache.wheelDelta[d] = 1 / 2 * d * -1;
        }
        var delta = this.cache.wheelDelta[d];
        if (this.enabled && (delta < 0 && !this.scroll.start || delta > 0 && !this.scroll.end)) {
            e.stopPropagation();
            e.preventDefault();
        }
        this.setScroll(delta, 2);
        return null;
    };
    CustomScrollbar.prototype.handlerMouseUp = function (e) {
        this.delta.initial = 0;
        this.drag = false;
        this.html.parent.classList.remove(this.classes.scrolling);
        return null;
    };
    CustomScrollbar.prototype.handlerMouseMove = function (e) {
        if (this.drag) {
            e.stopPropagation();
            e.preventDefault();
            var c = e.pageY || (e.clientY + document.body.scrollTop + document.documentElement.scrollTop);
            this.delta.current = (c - this.delta.initial);
            this.delta.initial = c;
            var t = (this.delta.current / (this.scroll.parent.height)) * this.scroll.parent.height;
            t = t + ((this.delta.ratio - .5) * (this.delta.current || 1));
            this.setScroll(t, 1);
        }
        return null;
    };
    CustomScrollbar.prototype.handlerMouseDown = function (e) {
        if (e.target === this.html.thumb) {
            e.stopPropagation();
            e.preventDefault();
            this.delta.initial = e.clientY;
            this.drag = true;
            this.html.parent.classList.add(this.classes.scrolling);
        }
        return null;
    };
    CustomScrollbar.prototype.handleMouseLeave = function (e) {
        if (e.target === this.html.parent) {
            this.html.parent.blur();
            this.html.parent.classList.remove(this.classes.focused);
        }
        return null;
    };
    CustomScrollbar.prototype.handleMouseEnter = function (e) {
        if (e.target === this.html.parent) {
            this.html.parent.classList.add(this.classes.focused);
        }
        return null;
    };
    CustomScrollbar.prototype.handlerClick = function (e) {
        if (e.target === this.html.track) {
            var d = e.offsetY;
            if (!this.cache.clickDelta[d]) {
                this.cache.clickDelta[d] = (this.scroll.max *
                    e.offsetY / this.scroll.parent.height *
                    -1);
            }
            this.setScroll(this.scroll.wrapper.current + this.cache.clickDelta[d]);
        }
        return null;
    };
    CustomScrollbar.prototype.handlerResize = function (e) {
        var _this = this;
        clearTimeout(this.timeouts.resize);
        this.timeouts.resize = setTimeout(function () { _this.update(); }, 50);
        return null;
    };
    CustomScrollbar.prototype.handleKeyUp = function (e) {
        if (e.target === this.html.parent || this.html.parent.classList.contains(this.classes.focused)) {
            if (typeof this.keysmap[e.keyCode] === "function") {
                this.keysmap[e.keyCode](e);
            }
        }
        return null;
    };
    CustomScrollbar.prototype.observe = function () {
        var _this = this;
        if (this.observerAvailable) {
            this.observer = new MutationObserver(function (m, o) {
                if (m[0].addedNodes.length || m[0].removedNodes.length) {
                    _this.update();
                }
                return null;
            });
            this.observer.observe(this.html.parent, { childList: true, subtree: true });
        }
        else {
            this.boundEvents.parent.DOMNodeInserted = this.update.bind(this);
            this.boundEvents.parent.DOMNodeRemoved = this.update.bind(this);
        }
        return null;
    };
    CustomScrollbar.prototype.manageEventListeners = function (type) {
        type += "EventListener";
        for (var i in this.boundEvents) {
            for (var j in this.boundEvents[i]) {
                this.boundElements[i][type](j, this.boundEvents[i][j], true);
            }
        }
        return this;
    };
    CustomScrollbar.prototype.clearProps = function (name) {
        return this.cache[name] = Object.create(null);
    };
    CustomScrollbar.prototype.destroy = function () {
        this.manageEventListeners("remove");
        if (this.observerAvailable && this.observer) {
            this.observer.disconnect();
        }
        this.html.parent.removeChild(this.html.scrollbar);
        Object.setPrototypeOf(this, null);
        for (var i in this) {
            delete this[i];
        }
        Object.defineProperties(this, {
            enabled: { writable: false, value: false },
            destroyed: { writable: false, value: true }
        });
        return null;
    };
    CustomScrollbar.prototype.update = function () {
        var _this = this;
        this.requestFrame(function (t) {
            var action;
            _this.setupCalculations();
            _this.enabled = _this.scroll.wrapper.height > _this.scroll.parent.height;
            action = _this.enabled ? "add" : "remove";
            Object.keys(_this.cache)
                .filter(function (x) {
                return x !== "wheelDelta";
            })
                .forEach(_this.clearProps.bind(_this));
            _this.html.parent.classList[action](_this.classes.enabled);
            _this.setScroll(0);
        });
        return this;
    };
    return CustomScrollbar;
}());
//# sourceMappingURL=customScrollbar.js.map