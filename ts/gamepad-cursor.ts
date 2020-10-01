import { clamp } from "./general";

const gamePadCursor = document.createElement( 'div' );
const gamePadScrollZone = 40;

gamePadCursor.id = 'gamepad-cursor';

let gamePadCursorX = 50;
let gamePadCursorY = 50;
let gamePadCanAction = false;
let gamePadAnimationFrame;

function onGamepadEvent( event:GamepadEvent ){

    const pads = Array.from( navigator.getGamepads() ).filter( Boolean );

    if( pads.length ){

        document.body.classList.add( 'gamepad-active' );
        document.body.appendChild( gamePadCursor );
        gamePadCanAction = false;
        gamePadAnimationFrame = window.requestAnimationFrame( evaluateInputs );

        // Does this work? Who knows. Analytics is for data analysers only. 
        // Its jargon and its ancient code that nobody wants to change, because they're used to it..
        // Absolute Garbage.
        window['gtag']( 'set', 'GamePad', pads[0].id );
        window['gtag']( 'send', 'hit' );

    } else {

        gamePadCursor.remove();
        document.body.classList.remove( 'gamepad-active' );
        window.cancelAnimationFrame( gamePadAnimationFrame );

    }

}
function confirmPopover( html:string ){

    const popover = document.createElement( 'div' );
    const close = event => {

        popover.remove();
        document.body.style.overflow = '';

    };

    popover.classList.add( 'popover' );
    popover.innerHTML = `<div role="alert">${html}</div>`;

    const links = popover.querySelectorAll( 'a, button' );

    if( links.length ){

        links.forEach(link => link.addEventListener( 'click', close, { once: true }));

    } else {

        const close = document.createElement( 'a' );

        close.classList.add( 'close-popover' );

        popover.appendChild( close );

    }

    document.body.style.overflow = 'hidden';
    document.body.appendChild( popover );

    return popover;

}
function evaluateInputs(){

    const pads = Array.from( navigator.getGamepads() ).filter( Boolean );

    if( pads.length ){

        let scrollX = 0;
        let scrollY = 0;
        let cursorX = 0;
        let cursorY = 0;
        let action = false;

        pads.forEach(gamepad => {
            
            cursorX = !choicsMenuHasControl && Math.abs(gamepad.axes[0]) > .2 ? gamepad.axes[0] : cursorX;
            cursorY = !choicsMenuHasControl && Math.abs(gamepad.axes[1]) > .2 ? gamepad.axes[1] : cursorY;
            scrollX = Math.abs(gamepad.axes[2]) > .2 ? gamepad.axes[2] : scrollX;
            scrollY = Math.abs(gamepad.axes[3]) > .2 ? gamepad.axes[3] : scrollY;

            if( gamepad.buttons[0].pressed || gamepad.buttons[1].pressed ) action = true;
    
        });

        gamePadCursorX = clamp( gamePadCursorX + cursorX, 0, 100 );
        gamePadCursorY = clamp( gamePadCursorY + cursorY, 0, 100 );
        
        const clientX = innerWidth * gamePadCursorX / 100;
        const clientY = innerHeight * gamePadCursorY / 100;
        const target = document.elementFromPoint( clientX, clientY );
        const choicsMenuHasControl = !!document.querySelector( '#speech .choices' ) && !!target && !!target.closest( 'header' );

        document.querySelectorAll( '.gamepad-target' ).forEach(e => {

            if( e !== target ) e.classList.remove( 'gamepad-target' );

        });

        gamePadCursor.classList.toggle( 'hidden', choicsMenuHasControl );

        if(
            target && (
            target.classList.contains( 'button' )
            || target.classList.contains( 'link' )
            || target.closest( '.gamepad-focusable, .gallery' )
            || (target.tagName === 'A' && target.closest( 'p' ))
        )){

            const sizeTarget = (target.closest( '.gallery, .gamepad-focusable' ) || target) as HTMLElement;
            const bb = sizeTarget.getBoundingClientRect();
            const borderRadius = window.getComputedStyle( sizeTarget ).getPropertyValue( 'border-radius' );

            gamePadCursor.style.width = bb.width + 'px';
            gamePadCursor.style.height = bb.height + 'px';
            
            gamePadCursor.style.left = bb.left + bb.width / 2 + 'px';
            gamePadCursor.style.top = bb.top + bb.height / 2 + 'px';

            gamePadCursor.style.backgroundPosition = `
                ${(clientX - bb.left) / bb.width * 100}% 
                ${(clientY - bb.top) / bb.height * 100}%
            `;

            gamePadCursor.classList.add( 'target-acquired' );

            target['focus']();
            sizeTarget.classList.add( 'gamepad-target' );

            if( borderRadius ) gamePadCursor.style.borderRadius = borderRadius;
            else gamePadCursor.style.borderRadius = '';

        } else {

            gamePadCursor.style.width = '';
            gamePadCursor.style.height = '';

            gamePadCursor.style.left = gamePadCursorX + '%';
            gamePadCursor.style.top = gamePadCursorY + '%';

            gamePadCursor.classList.remove( 'target-acquired' );

            gamePadCursor.style.backgroundPosition = '';
            gamePadCursor.style.borderRadius = '';


        }

        // Execute click when action is pressed
        // Block further clicks until the action button is released

        if( target && action && gamePadCanAction ){
                
            gamePadCanAction = false;

            if( target.tagName === 'A' && target.getAttribute( 'target' ) === '_blank' ){

                const href = target.getAttribute( 'href' );
                const site = href.split( '.' ).slice(1).join( '.' );
                
                confirmPopover(`
                    <p><strong>You are about to visit an external site, do you want to continue?</strong></p>
                    <ul>
                        <li><button class="link cancel">Cancel</button></li>
                        <li><a href="${target.getAttribute( 'href' )}" class="link">Visit <em>${site}</em></a></li>
                    </ul>
                    <p class="small">Technically, I can't open a popup when you are using the gamepad, so I have to directly forward you to allow this to work. This popup is here to tell people that they should put the gameepad down and move over to another input method. A little cumbersome, but I get it. I wouldn't want a site to hijack my browser for popups either.</p>
                `);

            } else {

                target.dispatchEvent( new MouseEvent( 'click', { clientX, clientY, bubbles: true }) );

            }

        }

        // Release action button to allow new input

        if( !gamePadCanAction && !action ){

            gamePadCanAction = true;

        }

        // Dispatch the cursor move event to the document
        // So anyone can listen in 

        if( target && (cursorX || cursorY) ){

            target.dispatchEvent( new MouseEvent( 'mousemove', { clientX, clientY, bubbles: true }) );

        }

        if(
            (clientX < gamePadScrollZone && cursorX < 0)
            || (clientX > innerWidth - gamePadScrollZone && cursorX > 0)
        ){

            scrollX = scrollX || cursorX;
            gamePadCursor.classList.add( 'scroll-x' );

        }

        if(
            (clientY < gamePadScrollZone && cursorY < 0)
            || (clientY > innerHeight - gamePadScrollZone && cursorY > 0)
        ){

            scrollY = scrollY || cursorY;
            gamePadCursor.classList.add( 'scroll-y' );

        }

        if( document.body.style.overflow !== 'hidden' ){
            
            document.body.scrollLeft += scrollX * 100;
            document.documentElement.scrollLeft += scrollX * 20;
            document.body.scrollTop += scrollY * 100;
            document.documentElement.scrollTop += scrollY * 20;

        }
    
    }

    gamePadAnimationFrame = window.requestAnimationFrame( evaluateInputs );

}

window.addEventListener( 'gamepadconnected', onGamepadEvent );
window.addEventListener( 'gamepaddisconnected', onGamepadEvent );