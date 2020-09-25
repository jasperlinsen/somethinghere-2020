import { loadLevel, delay, clamp } from "./core";
import { animateScrollBody, mailey, phoney } from "./levels/titlescreen";

loadLevel( 'Titlescreen' );

document.querySelectorAll( '.disabled' ).forEach(link => {

    link.addEventListener( 'click', async event => {

        event.preventDefault();

        link.classList.add( 'click' );

        await new Promise(r => link.addEventListener( 'animationend', r, { once: true }));

        link.classList.remove( 'click' );

    });

});
document.querySelectorAll( 'a[href^="#"]' ).forEach(link => {

    const element: HTMLElement = document.querySelector( link.getAttribute( 'href') );

    if( element ) link.addEventListener( 'click', event => {

        event.preventDefault();
        animateScrollBody( element );

    });

});
document.querySelectorAll( 'a[href^="http"]' ).forEach(link => {

    link.setAttribute( 'target', '_blank' );

});
document.querySelectorAll( 'a[href="tel:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `tel:${phoney()}` );

});
document.querySelectorAll( 'a[href="mailto:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `mailto:${mailey()}` );

});
document.querySelectorAll( 'a[href="twitter:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `twitter:@jasperlinsen` );

});
document.querySelectorAll( '.full-year' ).forEach(year => {

    year.textContent = '2018-' + new Date().getFullYear().toString();

});
document.querySelectorAll( 'blockquote' ).forEach(quote => {

    quote.addEventListener( 'click', event => {

        document.querySelectorAll( 'blockquote' ).forEach(q => {

            if( quote !== q ) q.classList.remove( 'expanded' );

        });

        quote.classList.toggle( 'expanded' );

    });

});
document.querySelectorAll( '.gallery' ).forEach(async (gallery:HTMLElement, index:number) => {

    const images: HTMLImageElement[] = Array.from( gallery.querySelectorAll( 'img' ) );
    const rotateGallery = () => gallery.style.setProperty( '--rotate', (Math.random() * 8 - 4).toFixed(3) + 'deg' );
    
    await delay( 500 * index );
    
    gallery.addEventListener( 'mouseenter', rotateGallery );

    while( true ) for( let img of images ){

        img.classList.add( 'selected' );

        await Promise.race([
            delay( parseInt( gallery.getAttribute( 'duration' ) || '5000' ) ),
            new Promise(resolve => img.addEventListener( 'click', event => {

                resolve();
                rotateGallery();

            }, { once: true }))
        ]);

        img.classList.remove( 'selected' );

    }

});

const gamePadCursor = document.createElement( 'div' );
let gamePadCursorX = 50;
let gamePadCursorY = 50;
let gamePadLastAction = 0;
let gamepadTarget;


window.requestAnimationFrame( function scrollWithGamePad(){

    const pads = navigator.getGamepads();

    if( pads.length ){

        let scrollY = 0;
        let cursorX = 0;
        let cursorY = 0;
        let action = false;
        
        pads.forEach(gamepad => {
    
            scrollY = gamepad.axes[3];
            cursorX = gamepad.axes[0];
            cursorY = gamepad.axes[1];

            if( gamepad.buttons[1].pressed ) action = true;
    
        });

        gamePadCursorX = clamp( gamePadCursorX + cursorX, 0, 100 );
        gamePadCursorY = clamp( gamePadCursorY + cursorY, 0, 100 );
        
        gamePadCursor.style.display = 'none';

        const target = document.elementFromPoint(
            innerWidth * gamePadCursorX / 100,
            innerHeight * gamePadCursorY / 100,
        );

        gamePadCursor.style.display = '';

        if(
            target && (
            target.classList.contains( 'button' )
            || target.classList.contains( 'link' )
            || target.closest( '.gallery' )
            || (target.tagName === 'A' && target.closest( 'p' ))
        )){

            const bb = target.getBoundingClientRect();

            gamePadCursor.style.width = bb.width + 'px';
            gamePadCursor.style.height = bb.height + 'px';
            
            gamePadCursor.style.left = bb.left + bb.width / 2 + 'px';
            gamePadCursor.style.top = bb.top + bb.height / 2 + 'px';

            gamePadCursor.classList.add( 'target-acquired' );

            if( action && gamePadLastAction + 200 < Date.now() ){
                
                target.dispatchEvent( new CustomEvent( 'click' ) );
                gamePadLastAction = Date.now();

            }

            target?.focus();

        } else {

            gamePadCursor.style.width = '';
            gamePadCursor.style.height = '';

            gamePadCursor.style.left = gamePadCursorX + '%';
            gamePadCursor.style.top = gamePadCursorY + '%';

            gamePadCursor.classList.remove( 'target-acquired' );

        }
    
        document.body.scrollTop += scrollY * 100;
        document.documentElement.scrollTop += scrollY * 20;

        if( !gamePadCursor.parentNode ){

            gamePadCursor.id = 'gamepad-cursor';
            document.body.appendChild( gamePadCursor );

        }
    
    } else {

        gamePadCursor.remove();

    }

    window.requestAnimationFrame( scrollWithGamePad );

});