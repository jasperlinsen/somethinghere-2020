function onGamepadEvent( event:GamepadEvent ){

    window.cancelAnimationFrame( gamepadAnimationFrame );
    gamepadAnimationFrame = null;

    // To work easily with the gamepads, we will have to turn them into an Array
    // Also, Chrome returns `null` for any player without a gamepad, so be sure to filter them out.

    const pads = Array.from( navigator.getGamepads() ).filter( Boolean );

    if( pads.length ){

        // Start the animation frame to read the inputs

        gamepadAnimationFrame = window.requestAnimationFrame( onGamepadAnimationFrame );
        gamepadActionButtonDown = true;
        document.body.classList.add( 'gamepad-connected' );

        console.log(
            `%cGamepads Connected: ${pads.map(pad => pad.id).join( ', ' )} (${pads.length})`,
            'color: white; background: green;'
        );

    } else {

        document.body.classList.remove( 'gamepad-connected' );
        console.log(
            `There are no gamepads!`,
            'color: white; background: red;'
        );

    }

}
function onGamepadAnimationFrame( time:number ){

    const delta = time - gamepadAnimationFrameTime;

    gamepadAnimationFrameTime = time;

    const pads = Array.from( navigator.getGamepads() ).filter( Boolean );
    const axesLeft: Coordinate = { x: 0, y: 0 };
    const moveCursorSpeed = delta / gamepadCursorSpeed;

    let actionButtonDown = false;
    
    pads.forEach(pad => {

        axesLeft.x = pad.axes[0];
        axesLeft.y = pad.axes[1];

        actionButtonDown = pad.buttons[0].pressed || pad.buttons[1].pressed;

    });

    gamepadCursorPosition.x = clamp( gamepadCursorPosition.x + axesLeft.x * moveCursorSpeed, 0, 1 );
    gamepadCursorPosition.y = clamp( gamepadCursorPosition.y + axesLeft.y * moveCursorSpeed, 0, 1 );

    gamepadCursorDOMElement.style.left = `${gamepadCursorPosition.x * 100}%`;
    gamepadCursorDOMElement.style.top = `${gamepadCursorPosition.y * 100}%`;

    const clientX = gamepadCursorPosition.x * innerWidth;
    const clientY = gamepadCursorPosition.y * innerHeight;
    const bubbles = true;
    const target = document.elementFromPoint( clientX, clientY )  as HTMLElement;

    if( target ){

        target.dispatchEvent( new MouseEvent( 'mousemove', { clientX, clientY, bubbles } ) );

    }

    if( target && gamepadCursorTargetTagNames.indexOf( target.tagName ) >= 0 ){

        // Either mark a parent with .gamepad-target to select that visually
        // or use the actual target.

        const visualTarget = target.closest( '.gamepad-target' ) || target;
        const { width, height, top, left } = visualTarget.getBoundingClientRect();

        gamepadCursorDOMElement.style.setProperty( '--left', `${(clientX - left) / width * 100}%`);
        gamepadCursorDOMElement.style.setProperty( '--top', `${(clientY - top) / height * 100}%`);
        gamepadCursorDOMElement.style.backgroundPosition = `
            ${(clientX - left) / width * 100}%
            ${(clientY - top) / height * 100}%
        `;
        gamepadCursorDOMElement.style.width = `${width}px`;
        gamepadCursorDOMElement.style.height = `${height}px`;
        gamepadCursorDOMElement.style.left = `${left + width / 2}px`;
        gamepadCursorDOMElement.style.top = `${top + height / 2}px`;
        gamepadCursorDOMElement.style.borderRadius = window.getComputedStyle( visualTarget ).borderRadius;
        gamepadCursorDOMElement.classList.add( 'hover' );

        visualTarget.classList.add( 'gamepad-hover' );

    } else {

        gamepadCursorDOMElement.style.removeProperty( '--left' );
        gamepadCursorDOMElement.style.removeProperty( '--top' );
        gamepadCursorDOMElement.style.backgroundPosition =
        gamepadCursorDOMElement.style.width =
        gamepadCursorDOMElement.style.borderRadius =
        gamepadCursorDOMElement.style.height = '';
        gamepadCursorDOMElement.classList.remove( 'hover' );

        document.querySelectorAll( '.gamepad-hover' ).forEach(el => el.classList.remove( 'gamepad-hover' ));

    }

    if( !gamepadActionButtonDown && actionButtonDown && target ){

        gamepadActionButtonDown = true;

        target.dispatchEvent( new MouseEvent( 'click', { clientX, clientY, bubbles } ) );

    } else if( gamepadActionButtonDown && !actionButtonDown ){

        gamepadActionButtonDown = false;

    }

    if(
        (clientX < gamepadAutoScrollPageZoneSize
        || clientX > innerWidth - gamepadAutoScrollPageZoneSize)
        && axesLeft.x !== 0
    ){

        document.body.scrollLeft += moveCursorSpeed * axesLeft.x * innerWidth;
        document.documentElement.scrollLeft += moveCursorSpeed * axesLeft.x * innerWidth;

    }

    if(
        (clientY < gamepadAutoScrollPageZoneSize && axesLeft.y < 0)
        || (clientY > innerHeight - gamepadAutoScrollPageZoneSize && axesLeft.y > 0)
    ){

        console.log( moveCursorSpeed * axesLeft.y )
        document.body.scrollTop += moveCursorSpeed * axesLeft.y * innerHeight;
        document.documentElement.scrollTop += moveCursorSpeed * axesLeft.y * innerHeight;

    }

    gamepadAnimationFrame = window.requestAnimationFrame( onGamepadAnimationFrame );

}

interface Coordinate { x:number; y:number };

const gamepadCursorPosition: Coordinate = { x: .5, y: .5 };
const gamepadCursorDOMElement: HTMLElement = document.getElementById( 'gamepad-cursor' );
const gamepadCursorSpeed = 1000;
const gamepadCursorTargetTagNames = [ 'A', 'LABEL' ];
const gamepadAutoScrollPageZoneSize = 100;

const clamp = (value:number, min:number, max:number) => (value < min ? min : (value > max ? max : value));

// This will hold the id  of the animationFrame,
// so we can cancel it whenever we want.
// Since it can change, we will store it in a `let`.

let gamepadAnimationFrame: number;
let gamepadAnimationFrameTime: number = 0;
let gamepadActionButtonDown: boolean = true;

window.addEventListener( 'gamepadconnected', onGamepadEvent );
window.addEventListener( 'gamepaddisconnected', onGamepadEvent );

for( let i = 0; i < 4; i++ ) document.body.appendChild( document.querySelector('main').cloneNode( true ) );