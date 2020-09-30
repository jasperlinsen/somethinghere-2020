#Creating a cursor with the GamePad API

Recently I started working on develeoping a video game with Three.js, and that of course requires access to gamepads and controllers. Afteer a while, I wanted to use this on my website to show off what I had done, but I ran into a sort-of problem: people who have a controller in their hand would not like to put it down just to mouse around. So how do we tie the GamePad in with a website? Let's have a look.

I wanted to approach it in the way apple approached using a mouse on iPads: a cursor would appear and be dragged around, and it woukd focus itself on interactable elements. First of, let's add simple cursor to our page:

    <div id="gamepad-cursor"></div>

And let's style it a bit so we can see it. Use `position:fixed`, as we want it to control our page, not be part of it.

    #gamepad-cursor {

        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        width: 1em;
        height: 1em;
        pointer-events: none;
        border-radius: 50%;
        box-shadow: 0 0 10px black;
        z-index: 2000;

    }

Now let's hook up the gamepad in Javascript. I will be using typescript here, only because it adds an extra layer of clarity to what is what, but feel free to remove the types, it will just work. We will also not care for multiple players here, we will assume any input from _any_ controller can trigger the same interactions.

Another thing to note is that Gamepads do not generate events - this is because they are intended to be part of your game loop, where you can check the state of your inputs before deciding what actions to take and what to draw. This means we are best off tying this to the `requestAnimationFrame` API. To do that, we need a method that we are, for now, just going to add a log to so we can see that it happens every frame. The resulting code looks like this, and you should be able to run it:

    // Global
    function onGamepadEvent( event:GamepadEvent ){

        window.cancelAnimationFrame( gamepadAnimationFrame );

        // To work easily with the gamepads, we will have to turn them into an Array
        // Also, Chrome returns `null` for any player without a gamepad, so be sure to filter them out.

        const pads = Array.from( navigator.getGamepads() ).filter( Boolean );

        if( pads.length ){

            gamepadAnimationFrame = window.requestAnimationFrame( onGamepadAnimationFrame );
            document.body.classList.add( 'gamepad-connected' );

            console.log(
                `%cGamepads Connected: ${pads.map(pad => pad.id).join( ', ' )} (${pads.length})`,
                'color: white; background: green;'
            );

        } else {

            console.log(
                `There are no gamepads!`,
                'color: white; background: red;'
            );
            document.body.classList.remove( 'gamepad-connected' );

        }

    }
    function onGamepadAnimationFrame( time:number ){

        console.log( 'Gamepads are connected!' );

        gamepadAnimationFrame = window.requestAnimationFrame( onGamepadAnimationFrame )

    }

    let gamepadAnimationFrame;
    
    window.addEventListener( 'gamepadconnected', onGamepadEvent );
    window.addEventListener( 'gamepaddisconnected', onGamepadEvent );

When connecting, we also use this opportunity to tell our page that there's a gamepad connected. This could be sueful to increase sizing and padding on some elements, and we will be use using it display our cursor only when it is relevant:

    body:not(.gamepad-connected) #gamepad-cursor {

        opacity: 0;

    }

Now let's move our cursor around and basically simulate a mouse in our `GamepadAnimationFrame` method. To do this, we want to store a global variable (in a `const` because we will never change the object, only the values in that object, so it's a safe way to define your object). We also need a refence to our gamepad cursor domelemeent, so let's also store that in a `const`:

    const gamepadCursorPosition: { x:number; y:number } = { x: innerWidth / 2, y: innerHeight / 2 };
    const gamepadCursorDOMElement: HTMLElement = document.getElementById( 'gamepad-cursor' );

We give it an initial position of `.5` and `.5` to match what we did in our CSS earlier: `left: 50%; top: 50%;`, but it doesn't matter nearly as much as you might expect as we will start moving our cursor around. We also will need a `clamp` method, to make it eaasier to limit the position of our cursor within the bounds. A simple method looks like this:

    const clamp = (value:number, min:number, max:number) => (value < min ? min : (value > max ? max : value));

To limit the speed of the cursor, we will also have to calculate a `delta` for our frame. It simple tells us how many milliseconds have passed since the last frame, and combined with a `gamepadCursorSpeed` we can tell it how many milliseconds need to pass to move to cursor across the entire screen. Our animation frame loop now looks like this, and your cursor should move when you move the left stick:

    // Global
    function onGamepadAnimationFrame( time:number ){

        const delta = time - gamepadAnimationFrameTime;

        gamepadAnimationFrameTime = time;

        const pads = Array.from( navigator.getGamepads() ).filter( Boolean );
        const axesLeft: Coordinate = { x: 0, y: 0 };
        const moveCursorSpeed = delta / gamepadCursorSpeed;
        
        pads.forEach(pad => {

            axesLeft.x = pad.axes[0];
            axesLeft.y = pad.axes[1];

        });

        gamepadCursorPosition.x = clamp( gamepadCursorPosition.x + axesLeft.x * moveCursorSpeed, 0, 1 );
        gamepadCursorPosition.y = clamp( gamepadCursorPosition.y + axesLeft.y * moveCursorSpeed, 0, 1 );

        gamepadCursorDOMElement.style.left = `${gamepadCursorPosition.x * 100}%`;
        gamepadCursorDOMElement.style.top = `${gamepadCursorPosition.y * 100}%`;

        gamepadAnimationFrame = window.requestAnimationFrame( onGamepadAnimationFrame );

    }

    const gamepadCursorPosition: Coordinate = { x: .5, y: .5 };
    const gamepadCursorDOMElement: HTMLElement = document.getElementById( 'gamepad-cursor' );
    const gamepadCursorSpeed = 1000;
    
    let gamepadAnimationFrameTime: number = 0;

Great! What is going on though? As you read along the following steps are computed:

- Read the current intensity the stick is pushed in over the X and Y axis. This is accomplished by reading the input of the GamePad.axes[ 0 through 4 ], where the order is `leftStick:x, leftStick:y, rightStick:x, rightStick:y`
- Apply the changes in a delta limited fashion to our global cursor position to make our stick move at a consistent speed
- Apply the calculated cursor position to our DOM element

We now have a functional cursor, but we still want it to be able to interact with the DOM, so we are simply going to simulate some mouse events to allow for this. To do that we can leverage a method called `document.elementFromPoint`, which will give us any element at that position in the viewport. However, since we are moving our cursor to that point we would always get back our cursor. However, in `css` we can set `pointer-events: none`, which will ignore this element altogether, as if it did not exist. Then we simply dispatch a couple of mouse events to the element we find under our cursor. Note that we only calculate the `clientX` and `clientY`, so any mouse events _must_ make use of these coordinates, as no other coordinates will be computed and thus available.

    // GamepadAnimationFrame
    const clientX = gamepadCursorPosition.x * innerWidth;
    const clientY = gamepadCursorPosition.y * innerHeight;
    const bubbles = true;
    const target = document.elementFromPoint( clientX, clientY );

    if( target ){

        target.dispatchEvent( new MouseEvent( 'mouseenter', { clientX, clientY, bubbles } ) );
        target.dispatchEvent( new MouseEvent( 'mousemoves', { clientX, clientY, bubbles } ) );
        
    }

Of course, a mouse can click, so we want either the A or B button to click. I am saying _either_ because some controllers (like Nintendo's) actually switch around the default configuration from the Xbox gamepad, but will maintain the same layout. Because we only need one button, that's not really an issue and it gives the user choice. Globally, we want to add one more variable to indicate a button has been pressed:

    let gamepadActionButtonDown: boolean = false;

Inside our loop, we will check for `pad.buttons[0]` and `pad.buttons[1]`, and specifically their `.pressed` state. We will only dispatch a click event in some circumstances, namely that the button has to be down and it has to have been released before this press occurs.

So we will use `gamepadActionButtonDown` to store our current expected state of the button. Once we click, we set it to `true`. Then no click events will occur anymore until we note that no button is held down, and release the button by setting `gamepadActionButtonDown` variable back to `false`, paving the path for our next button press. In our `onGamepadEvent` handler, we will also set the `gamepadActionButtonDown` to true, this is because when we connect a gamepad to the browser a button has to be pressed, but we want to ignore this first input so the user doesn't accidentally click a link and gets sent away - if you look in our example, the cursor starts in the middle of the screen and there's a link there.

    // GamepadAnimationFrame
    let actionButtonDown = false;

    pads.forEach(pad => {

        actionButtonDown = pad.buttons[0].pressed || pad.buttons[1].pressed;

    });

    if( !gamepadActionButtonDown && actionButtonDown && target ){

        gamepadActionButtonDown = true;

        target.dispatchEvent( new MouseEvent( 'click', { clientX, clientY, bubbles } ) );

    } else if( gamepadActionButtonDown && !actionButtonDown ){

        gamepadActionButtonDown = false;

    }

    // Global
    let gamepadActionButtonDown: boolean = true;

Great, but we don't really know if it worked. Let's add a quick test case where we will move a background position on the body and change the color when you click. This is the simplest test case:

    // Global
    function onTestBody( event ){

        switch( event.type ){
            case 'mousemove':
                // Move our background square
                event.target.style.backgroundPosition = `${event.clientX}px ${event.clientY}px`;
                break;
            case 'click':
                // Change background color to random color
                event.target.style.backgroundColor = `rgb(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)})`;
                break;
        }

    }

    document.body.addEventListener( 'click', onTestBody );
    document.body.addEventListener( 'mousemove', onTestBody );

And don't forget to include this bit of CSS:

    html, body {
        height: 100%;
    }
    body {
        background: url('data:image/svg+xml;charset=utf8,<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"><rect x=".1" y=".1" width=".9" height=".9" stroke="black" stroke-width=".1" fill="white" /></svg>') no-repeat 50% 50% / 200px auto gray;
        padding: 0;
        margin: 0;
    }

If all is well, you should now be able to to move a cursor around your page, click and see the effect on the body when moving and clicking. Great! Now for the last refinement, we want the cursor to stretch itself to the elemnt it is hovering over when it is interactable. Let's make the gamepad at least detect and select these elements in a nice visual way.

    // GamepadAnimationFrame
    if( target && gamepadCursorTargetTagNames.indexOf( target.tagName ) >= 0 ){

        // Either mark a parent with .gamepad-target to select that visually
        // or use the actual target.

        const visualTarget = target.closest( '.gamepad-target' ) || target;
        const { width, height, top, left } = visualTarget.getBoundingClientRect();

        gamepadCursorDOMElement.style.backgroundPosition = `
            ${(clientX - left) / width * 100}%
            ${(clientY - top) / height * 100}%
        `;
        gamepadCursorDOMElement.style.width = `${width}px`;
        gamepadCursorDOMElement.style.height = `${height}px`;
        gamepadCursorDOMElement.style.left = `${left + width / 2}px`;
        gamepadCursorDOMElement.style.top = `${top + height / 2}px`;
        gamepadCursorDOMElement.classList.add( 'hover' );
        gamepadCursorDOMElement.style.borderRadius = window.getComputedStyle( visualTarget ).borderRadius;

        visualTarget.classList.add( 'gamepad-hover' );

    } else {

        gamepadCursorDOMElement.style.backgroundPosition =
        gamepadCursorDOMElement.style.width =
        gamepadCursorDOMElement.style.borderRadius =
        gamepadCursorDOMElement.style.height = '';
        gamepadCursorDOMElement.classList.remove( 'hover' );

        document.querySelectorAll( '.gamepad-hover' ).forEach(el => el.classList.remove( 'gamepad-hover' ));

    }

You might notice we are setting `left` and `top` again, and that's because we want our visual overlay to not move when it's over an object. To indicate how far you can move before you leave this zone we move around a little dot inside the indicator itself using `background-position`. That way there are no surprises when you get kicked of an element. We also don't want to focus on just _any_ elements, so we made a list of `tagNames` we can check against, which currently only checks against links. Lets quickly add some links and a grid to the page so we can see what this looks like. Also remove our earlier testing method again, as it can be confusing and it's no longer useful. So here are all our CSS changes:


    body {
        background: black;
    }
    main {

        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr 1fr 1fr;
        justify-items: center;
        align-items: center;
        
    }
    a {

        padding: 40px;

    }
    main > a,
    main > ul {

        width: 80%;
        height: 80%;
        box-sizing: border-box;
        border-radius: 10vmax;
        margin: 0;
        border: 2px solid #666;
        background: #ececec;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

    }
    #gamepad-cursor {

        background: url('data:image/svg+xml;charset=utf8,<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"><circle cx=".5" cy=".5" r=".5" stroke="none" fill="black" /></svg>') no-repeat 50% 50% / 10px auto rgba(255,255,255,.5);
        transition: width .3s, height .3s, border-radius .4s;

    }

Sometimes you might want a focusable element to not directly be the area to select, so in that case this script expects you to define it with `.gamepad-target`. An example for this is a gallery where clicking an individual image might trigger a popover with a larger version, but in general you want it to select the gallery and not the image itself. For our HTML bit, I have added the following to test it out:

    <main>
        <a href="https://somethinghere.net">Something Here</a>
        <a href="https://somethinghere.net">Something Here</a>
        <a href="https://somethinghere.net">Something Here</a>
        
        <a href="https://somethinghere.net">Something Here</a>
        <a href="https://somethinghere.net">Something Here</a>
        <a href="https://somethinghere.net">Something Here</a>

        <ul class="gamepad-target">
            <li><a href="https://somethinghere.net">Something Here</a></li>
            <li><a href="https://somethinghere.net">Something Here</a></li>
            <li><a href="https://somethinghere.net">Something Here</a></li>
        </ul>
        <a href="https://somethinghere.net">Something Here</a>
        <a href="https://somethinghere.net">Something Here</a>
    </main>

And there we go, you can easily move the cursor and select items, as well as click around. You could add many more events, or event make the events specific to gamepad actions if you prefer that over using a game loop to check inputs. There are also other caveats, like `click` not being allowed on links that open new windows, as our `click` is actually triggered by a script, and the browser has no way of knowing it was triggered by the user. To solve that, I added a popover and simple forwarded people to the next site if they agreed to it. But this allowed my main header to be clickable (as required in for my interaction), even if you start out with the gamepad.

One last bit that might be useful however, is the code I used to make the page scroll when the cursor hits the end zone on the page. It's rather simple, but incredibly useful. Let's just duplicate the last html we added a couple of times to test a longer, scrolling page:

    for( let i = 0; i < 4; i++ ) document.body.appendChild( document.querySelector('main').cloneNode( true ) );

Lastly we will need two things: a value that tells us what zone is scrollable (lets call it `gamepadAutoScrollPageZoneSize`), and a check to see if we are pushing the stick in the right direction and are in the zone. Here is the code:

    // GamepadAnimationFrame
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

    // Global
    const gamepadAutoScrollPageZoneSize = 100;

And as we hit the edge of the page, the page will start scrolling up and down! Now to make this work with the right stick is an excercise I am going to leave up to you, handsome reader, as all the tools you need have been touched upon and it's definitely an interesting excercise. It's a great way to start with Gamepads, or make something somewhat accessible to Gamepad users, but there's a lot moree to a full working implementation, like triggering `.focus()` on the correct elements and creating popovers and edge cases.