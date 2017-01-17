interface ICustomScrollbarTemplate {
    type: string;
    attr?: any;
    content?: Array<ICustomScrollbarTemplate>;
}

interface ICustomScrollbarDelta {
    initial: number;
    current: number;
    ratio: number;
}

interface ICustomScrollbarClasses {
    scrolling: string;
    focused: string;
    wrapper: string;
    enabled: string;
    track: string;
    thumb: string;
    base: string;
    main: string;
}

interface ICustomScrollbarScrollableElement {
    height?: number;
    current?: number;
}

interface ICustomScrollbarScroll {
    max: number;
    min: number;
    end: boolean;
    start: boolean;
    thumb: ICustomScrollbarScrollableElement;
    parent: ICustomScrollbarScrollableElement;
    wrapper: ICustomScrollbarScrollableElement;
}

interface ICustomScrollbarKeysMap {
    33: Function;
    34: Function;
    35: Function;
    36: Function;
    38: Function;
    40: Function;
}

interface ICustomScrollbarTimeouts {
    scroll: number;
    resize: number;
}

interface ICustomScrollbarBoundElements {
    parent: HTMLElement;
    document: Document;
    window: Window;
}

interface ICustomScrollbarParentEvents {
    DOMNodeInserted?: Function;
    DOMNodeRemoved?: Function;
    DOMMouseScroll?: Function;
    mousewheel?: Function;
    mouseenter: Function;
    mouseleave: Function;
    mousedown: Function;
    wheel?: Function;
    click: Function;
}

interface ICustomScrollbarWindowEvents {
    resize: Function;
}

interface ICustomScrollbarDocumentEvents {
    mousemove: Function;
    mouseup: Function;
    keyup: Function;
}

interface ICustomScrollbarBoundEvents {
    document: ICustomScrollbarDocumentEvents;
    parent: ICustomScrollbarParentEvents;
    window: ICustomScrollbarWindowEvents;
}

interface ICustomScrollbarHTML {
    scrollbar: HTMLElement;
    wrapper: HTMLElement;
    parent: HTMLElement;
    track: HTMLElement;
    thumb: HTMLElement;
}

interface ICustomScrollbarDynamicCache {
    clickDelta: any;
    wheelDelta: any;
    moveDelta: any;
}

"use strict";
class CustomScrollbar {
    private boundElements: ICustomScrollbarBoundElements;
    private template: Array<ICustomScrollbarTemplate>;
    private boundEvents: ICustomScrollbarBoundEvents;
    private observer: MutationObserver | undefined;
    private cache: ICustomScrollbarDynamicCache;
    private timeouts: ICustomScrollbarTimeouts;
    private classes: ICustomScrollbarClasses;
    private keysmap: ICustomScrollbarKeysMap;
    private scroll: ICustomScrollbarScroll;
    private wheelDelta: string | undefined;
    private domTemplate: DocumentFragment;
    private wheelDeltaMultiplier: number;
    private delta: ICustomScrollbarDelta;
    private html: ICustomScrollbarHTML;
    private observerAvailable: boolean;
    private animationSuccess: number;
    private animationTimer: number;
    private animationFrame: number;
    private movementType: string;
    private cursorStep: number;
    private enabled: boolean;
    private drag: boolean;
    private passiveEvent: { capture: true, passive: true } | boolean;

    constructor(
        element: HTMLElement,
        observable: boolean = false,
        template?: Array<ICustomScrollbarTemplate>
    ) {
        if ( typeof Object.setPrototypeOf === "function" ) {
            Object.setPrototypeOf( Object.getPrototypeOf( this ), null );
        }

        let passiveEvent = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function () {
                    passiveEvent = true;
                }
            });
            window.addEventListener("test", null, opts);
        } catch (e) { }

        this.passiveEvent = passiveEvent ? { capture: true, passive: true } : true;

        let supportedWheelEvent: string = "onwheel" in HTMLDivElement.prototype ? "wheel" :
            document.onmousewheel !== undefined ? "mousewheel" : "DOMMouseScroll";

        this.classes = Object.create( null, {
            wrapper: { configurable: true, writable: false, value: "-wrapper" },
            main: { configurable: true, writable: false, value: "scrollable" },
            base: { configurable: true, writable: false, value: "scrollbar" },
            track: { configurable: true, writable: false, value: "-track" },
            thumb: { configurable: true, writable: false, value: "-thumb" },
            enabled: { writable: false, value: "is-scrolling-enabled" },
            scrolling: { writable: false, value: "is-scrolling" },
            focused: { writable: false, value: "is-focused" },
        });

        this.html = Object.create( null, {
            parent: { writable: false, value: element },
            wrapper: { writable: false, value: element.querySelector( "." + this.classes.main + this.classes.wrapper ) }
        });

        this.template = Object.assign( [{
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
        }], template || {} );

        this.domTemplate = document.createDocumentFragment();

        this.drag = false;

        this.scroll = Object.create( null, {
            max: { writable: true, value: 0 },
            min: { writable: true, value: 0 },
            parent: {
                writable: false,
                value: Object.create( null, {
                    height: { writable: true, value: 0 }
                })
            },
            wrapper: {
                writable: false,
                value: Object.create( null, {
                    height: { writable: true, value: 0 },
                    current: { writable: true, value: 0 }
                })
            },
            thumb: {
                writable: false,
                value: Object.create( null, {
                    height: { writable: true, value: 0 },
                    current: { writable: true, value: 0 }
                })
            },
            end: { writable: true, value: false },
            start: { writable: true, value: false }
        });

        this.delta = Object.create( null, {
            initial: { writable: true, value: 0 },
            current: { writable: true, value: 0 },
            ratio: { writable: true, value: 0 }
        });

        this.enabled = false;
        this.animationTimer = 0;
        this.animationSuccess = 0;
        this.wheelDelta = undefined;
        this.wheelDeltaMultiplier = undefined;
        this.cache = Object.create( null, {
            wheelDelta: { enumerable: true, writable: true, value: Object.create( null ) },
            clickDelta: { enumerable: true, writable: true, value: Object.create( null ) },
            moveDelta: { enumerable: true, writable: true, value: Object.create( null ) }
        });

        this.buildTemplate();
        this.addBindings();

        this.appendDOM( this.html.parent, this.domTemplate );

        this.boundElements = Object.create( null, {
            parent: { writable: false, value: this.html.parent },
            window: { writable: false, value: window },
            document: { writable: false, value: document }
        });

        this.boundEvents = Object.create( null, {
            parent: {
                enumerable: true, writable: true, value: Object.create( null, {
                    mouseenter: { enumerable: true, writable: false, value: this.handleMouseEnter.bind( this ) },
                    mouseleave: { enumerable: true, writable: false, value: this.handleMouseLeave.bind( this ) },
                    mousedown: { enumerable: true, writable: false, value: this.handlerMouseDown.bind( this ) },
                    click: { enumerable: true, writable: false, value: this.handlerClick.bind( this ) }
                })
            },
            document: {
                enumerable: true, writable: true, value: Object.create( null, {
                    mousemove: { enumerable: true, writable: false, value: this.handlerMouseMove.bind( this ) },
                    mouseup: { enumerable: true, writable: false, value: this.handlerMouseUp.bind( this ) },
                    keyup: { enumerable: true, writable: false, value: this.handleKeyUp.bind( this ) }
                })
            },
            window: {
                enumerable: true, writable: true, value: Object.create( null, {
                    resize: { enumerable: true, writable: false, value: this.handlerResize.bind( this ) }
                })
            }
        });
        this.boundEvents.parent[supportedWheelEvent] = this.handlerScroll.bind( this );

        this.cursorStep = 50;

        this.keysmap = Object.create( null, {
            33: { writable: false, value: (): CustomScrollbar => { return this.setScroll( -this.scroll.parent.height ); } },// page up
            34: { writable: false, value: (): CustomScrollbar => { return this.setScroll( this.scroll.parent.height ); } }, // page down
            38: { writable: false, value: (): CustomScrollbar => { return this.setScroll( -this.cursorStep ); } },          // arrow - up
            40: { writable: false, value: (): CustomScrollbar => { return this.setScroll( this.cursorStep ); } },           // arrow - down
            35: { writable: false, value: (): CustomScrollbar => { return this.scrollBottom(); } },                         // end
            36: { writable: false, value: (): CustomScrollbar => { return this.scrollTop(); } }                             // home
        });

        this.timeouts = Object.create( null, {
            scroll: { writable: true, value: null },
            resize: { writable: true, value: null }
        });

        this.movementType = "top";
        ["transform", "msTransform"].forEach(( x: string ) => {
            if ( x in this.html.parent.style ) {
                this.movementType = x;
            }
        });

        this.observer = null;
        this.observerAvailable = typeof MutationObserver === "function";
        if ( observable ) {
            this.observe();
        }

        this.manageEventListeners( "add" );

        this.update();
    }

    /**
     * DOM
     */
    private applyAttrs( e: HTMLElement, a: Object ): HTMLElement {
        for ( let i in a ) {
            if ( a.hasOwnProperty( i ) ) {
                e.setAttribute( i, a[i] );
            }
        }
        return e;
    }
    private buildRecursively( o: Array<ICustomScrollbarTemplate>, parent: DocumentFragment | HTMLElement ): DocumentFragment | HTMLElement {
        let html: DocumentFragment | HTMLElement = parent || this.domTemplate;
        if ( Array.isArray( o ) ) {
            o.forEach(( e: ICustomScrollbarTemplate ) => {
                let _e: HTMLElement = document.createElement( e.type );
                if ( e.attr ) {
                    this.applyAttrs( _e, e.attr );
                }
                return html.appendChild( this.buildRecursively( e.content, _e ) );
            });
        }
        return html;
    }
    private buildTemplate(): DocumentFragment | HTMLElement {
        return this.domTemplate = this.buildRecursively( this.template, this.domTemplate );
    }
    private addBindings(): void {
        Object.defineProperties( this.html, {
            scrollbar: { writable: false, value: this.domTemplate.querySelector( "." + this.classes.base ) },
            track: { writable: false, value: this.domTemplate.querySelector( "." + this.classes.base + "-track" ) },
            thumb: { writable: false, value: this.domTemplate.querySelector( "." + this.classes.base + "-thumb" ) }
        });
        return null;
    }
    private appendDOM( e: HTMLElement | DocumentFragment, c: HTMLElement | DocumentFragment ): void {
        e.appendChild( c );
        return null;
    }

    private getInnerHeight( el: HTMLElement ): number {
        const { clientHeight }: any = el;
        const { paddingTop, paddingBottom }: any = getComputedStyle( el );
        return clientHeight - parseFloat( paddingTop ) - parseFloat( paddingBottom );
    }
    /**
     * PAINT
     */
    private paint( t?: number ): CustomScrollbar {
        if ( this.animationTimer - t > -17 || this.animationSuccess - t < -64) {
            this.setupScrollPosition();
            this.animationSuccess = t;
        }
        this.setupThumbPosition();
        this.animationTimer = t;
        return this;
    }
    private requestFrame( callback: any ): CustomScrollbar {
        this.cancelFrame();
        this.animationFrame = requestAnimationFrame( callback.bind( this ) );
        return this;
    }
    private cancelFrame(): CustomScrollbar {
        cancelAnimationFrame( this.animationFrame );
        return this;
    }

    /**
     * SCROLLING
     */
    private setupScrollHeights(): CustomScrollbar {
        this.scroll.parent.height = this.getInnerHeight( this.html.parent );
        this.scroll.wrapper.height = this.getInnerHeight( this.html.wrapper );
        this.scroll.thumb.height = (
            this.scroll.parent.height > this.scroll.wrapper.height ?
                this.scroll.parent.height :
                Math.floor( this.scroll.parent.height *
                    ( this.scroll.parent.height / this.scroll.wrapper.height ) )
            );
        this.delta.ratio = this.scroll.wrapper.height / ( this.scroll.parent.height + this.scroll.thumb.height );
        this.html.thumb.style.height = this.scroll.thumb.height + "px";
        return this;
    }
    private generate_topString( x: number ): string {
        return "top:" + x + "px";
    }
    private generate_msTransformString( x: number ): string {
        return this.generate_transformString( x );
    }
    private generate_transformString( x: number ): string {
        return "translate(0, " + x + "px)";
    }
    private generateDeltaString( x: number ): string {
        return this[ "generate_" + this.movementType + "String"]( x );
    }
    private setupThumbPosition(): CustomScrollbar {
        this.html.thumb.style[this.movementType] = this.generateDeltaString( this.scroll.thumb.current );
        return this;
    }
    private setupScrollPosition(): CustomScrollbar {
        this.html.wrapper.style[this.movementType] = this.generateDeltaString( this.scroll.wrapper.current );
        return this;
    }
    private setupScrollMinMax(): CustomScrollbar {
        this.scroll.min = 0;
        this.scroll.max = this.scroll.parent.height - this.scroll.wrapper.height;
        return this;
    }
    private setupCalculations(): CustomScrollbar {
        this.setupScrollHeights().setupScrollMinMax();
        return this;
    }
    private setScroll( delta: number, timer?: number ): CustomScrollbar {
        if ( this.enabled ) {
            let t: number = this.scroll.wrapper.current + delta * -1,
                p: number, d: number;

            this.scroll.wrapper.current = t;
            this.scroll.start = false;
            this.scroll.end = false;

            if ( t >= 0 ) {
                this.scroll.wrapper.current = this.scroll.min;
                this.scroll.start = true;
            }
            if ( t < 0 && this.scroll.wrapper.current <= this.scroll.max ) {
                this.scroll.wrapper.current = this.scroll.max;
                this.scroll.end = true;
            }

            p = this.scroll.wrapper.current / this.scroll.max;
            d = this.scroll.thumb.height * p;
            this.scroll.thumb.current = this.scroll.parent.height * p + d * -1;
            this.requestFrame(( t: number ) => { this.paint( t ); });
        }
        return this;
    }
    public scrollTop(): CustomScrollbar { this.setScroll( this.scroll.max ); return this; }
    public scrollBottom(): CustomScrollbar { this.setScroll( -this.scroll.max ); return this; }

    public scrollTo( o: HTMLElement | number ): CustomScrollbar {
        let t: number = typeof o === "object" ? o.offsetTop : o;
        if ( this.scroll.wrapper.current === -t ) { return this; }
        this.setScroll( t += this.scroll.wrapper.current );
        return this;
    }

    /**
     * Event listeners
     */
    private handlerScroll( e: WheelEvent ): void {
        if ( typeof this.wheelDelta === "undefined" ) {
            if ( e.wheelDelta ) {
                this.wheelDelta = "wheelDelta";
                this.wheelDeltaMultiplier = 1;
            } else {
                this.wheelDelta = "deltaY";
                this.wheelDeltaMultiplier = -32;
            }
        }

        let d: number = e[this.wheelDelta] * this.wheelDeltaMultiplier;
        if ( !this.cache.wheelDelta[d] ) {
            this.cache.wheelDelta[d] = 1 / 2 * d * -1;
        }
        let delta: number = this.cache.wheelDelta[d];
        if ( this.enabled && ( delta < 0 && !this.scroll.start || delta > 0 && !this.scroll.end ) ) {
            e.stopPropagation();
            !this.passiveEvent && e.preventDefault();
        }
        this.setScroll( delta, 2 );
        return null;
    }
    private handlerMouseUp( e: MouseEvent ): void {
        this.delta.initial = 0;
        this.drag = false;
        this.html.parent.classList.remove( this.classes.scrolling );
        return null;
    }
    private handlerMouseMove( e: MouseEvent ): void {
        if ( this.drag ) {
            e.stopPropagation();
            !this.passiveEvent && e.preventDefault();

            let c: number = e.pageY || (e.clientY + document.body.scrollTop + document.documentElement.scrollTop);

            this.delta.current = ( c - this.delta.initial );
            this.delta.initial = c;

            let t: number = (
                this.delta.current / (
                    this.scroll.parent.height
                )
            ) * this.scroll.parent.height;

            t = t + ( ( this.delta.ratio - .5 ) * ( this.delta.current || 1 ) );

            this.setScroll( t, 1 );
        }
        return null;
    }
    private handlerMouseDown( e: MouseEvent ): void {
        if ( e.target === this.html.thumb ) {
            e.stopPropagation();
            !this.passiveEvent && e.preventDefault();

            this.delta.initial = e.clientY;
            this.drag = true;
            this.html.parent.classList.add( this.classes.scrolling );
        }
        return null;
    }
    private handleMouseLeave( e: MouseEvent ): void {
        if ( e.target === this.html.parent ) {
            this.html.parent.blur();
            this.html.parent.classList.remove( this.classes.focused );
        }
        return null;
    }
    private handleMouseEnter( e: MouseEvent ): void {
        if ( e.target === this.html.parent ) {
            this.html.parent.classList.add( this.classes.focused );
        }
        return null;
    }
    private handlerClick( e: MouseEvent ): void {
        if ( e.target === this.html.track ) {
            let d: number = e.offsetY;
            if ( !this.cache.clickDelta[d] ) {
                this.cache.clickDelta[d] = (
                    this.scroll.max *
                    e.offsetY / this.scroll.parent.height *
                    -1
                );
            }
            this.setScroll( this.scroll.wrapper.current + this.cache.clickDelta[d] );
        }
        return null;
    }
    private handlerResize( e: Event ): void {
        clearTimeout( this.timeouts.resize );
        this.timeouts.resize = setTimeout(() => { this.update(); }, 50 );
        return null;
    }
    private handleKeyUp( e: KeyboardEvent ): void {
        if ( e.target === this.html.parent || this.html.parent.classList.contains( this.classes.focused ) ) {
            if ( typeof this.keysmap[e.keyCode] === "function" ) {
                this.keysmap[e.keyCode]( e );
            }
        }
        return null;
    }
    private observe(): void {
        if ( this.observerAvailable ) {
            this.observer = new MutationObserver( ( m: MutationRecord[], o: MutationObserver ): void => {
                if ( m[0].addedNodes.length || m[0].removedNodes.length ) {
                    this.update();
                }
                return null;
            });
            this.observer.observe( this.html.parent, { childList: true, subtree: true } );
        } else {
            this.boundEvents.parent.DOMNodeInserted = this.update.bind( this );
            this.boundEvents.parent.DOMNodeRemoved = this.update.bind( this );
        }
        return null;
    }
    private manageEventListeners( type: string ): CustomScrollbar {
        type += "EventListener";
        for ( let i in this.boundEvents ) {
            for ( let j in this.boundEvents[i] ) {
                this.boundElements[i][type](j, this.boundEvents[i][j], this.passiveEvent);
            }
        }
        return this;
    }

    private clearProps(name: string): Object {
        return this.cache[name] = Object.create( null );
    }

    public destroy(): void {
        this.manageEventListeners( "remove" );

        if ( this.observerAvailable && this.observer ) {
            this.observer.disconnect();
        }

        this.html.parent.removeChild( this.html.scrollbar );
        Object.setPrototypeOf( this, null );
        for ( let i in this ) {
            delete this[i];
        }
        Object.defineProperties( this, {
            enabled: { writable: false, value: false },
            destroyed: { writable: false, value: true }
        });
        return null;
    }
    public update(): CustomScrollbar {
        this.requestFrame(( t: number ) => {
            let action: string;

            this.setupCalculations();
            this.enabled = this.scroll.wrapper.height > this.scroll.parent.height;
            action = this.enabled ? "add" : "remove";

            Object.keys( this.cache )
                .filter((x: string) => {
                    return x !== "wheelDelta";
                })
                .forEach( this.clearProps.bind( this ) );

            this.html.parent.classList[action]( this.classes.enabled );
            this.setScroll( 0 );
        });
        return this;
    }
}