import * as API from "../core";
import { Group, Color, SpotLight, LoopPingPong, AnimationClip, PointLight, Object3D, PerspectiveCamera, MathUtils, Vector3, NormalAnimationBlendMode, Texture, TextureLoader, Material, MeshBasicMaterial, Raycaster, Vector2, Mesh } from "three";

export function animateScrollBody( toElement:HTMLElement, duration ?: number ){

    const start = document.body.scrollTop || document.documentElement.scrollTop || 0;
    const end = toElement.getBoundingClientRect().top + start - innerHeight / 3
    
    let progress = 0;
    let time = 0;

    duration = duration || Math.abs(end - start) * 10;

    function animate( t ){

        if( time === 0 ){
            
            time = t;
        
        } else {

            progress += (t - time);

            document.body.scrollTop = document.documentElement.scrollTop = MathUtils.lerp( start, end, Math.pow(progress / duration, 2) )

        }

        if( progress < duration ){
            
            window.requestAnimationFrame( animate )

        }

    }

    window.requestAnimationFrame( animate );

}
export function phoney(){

    // Confuse the JS parsers a bit!
    // No bots please.
    return '+1' + `(${Number(971).toString()})570${'-1'[0]}${5678 - 1}`‬;

}
export function mailey(){

    return `hello${'at'.replace('at','@')}somethinghere.net‬${"" || '?' + ''}subject=Hello`;

}

export default async function( scene: API.Scene, saveData:any = {} ){

    const utils = API.LEVELUTILITIES( scene, saveData );
    const glb = await utils.loadGLTFMap( './models/titlescreen2.glb' );
    const model = glb.scene as Group;
    const camera = glb.cameras.shift() as PerspectiveCamera;
    const spotLight = new SpotLight( 0xffffff, .8, 100, Math.PI / 30, 1, 0 );
    const pointLight = new PointLight( 0xffffff, .4, 20 );

    spotLight.position.set( 0, 50, 0 );
    pointLight.position.set( 0, 5, 3 );
    spotLight.target = model;

    scene.add( spotLight );
    scene.add( model );
    scene.add( pointLight );

    model.updateMatrixWorld();

    let EYEMATERIAL: MeshBasicMaterial;
    let MOUTHMATERIAL: MeshBasicMaterial;

    model.traverse(object => {

        if( object instanceof Mesh ){

            switch( object.material.name ){
                case 'EYES': EYEMATERIAL = object.material; break;
                case 'MOUTH': MOUTHMATERIAL = object.material; break;
            }

        }
        
    });

    // This guarantees that any properties set in blender for this texture copy over
    // to other loaded textures for the eyes, for example.

    async function textureMaker( src ){

        const texture = EYEMATERIAL.map.clone();
        const newImage = await textureLoader.loadAsync( src );

        texture.image = newImage.image;
        texture.needsUpdate = true;

        return texture;

    }

    const textureLoader = new TextureLoader;
    const EYESTATES = {
        normal: await textureMaker('./textures/eyes/normal.png' ),
        angry: await textureMaker('./textures/eyes/angry.png' ),
        giddy: await textureMaker('./textures/eyes/giddy.png' ),
        lazy: await textureMaker('./textures/eyes/lazy.png' ),
        closed: await textureMaker('./textures/eyes/closed.png' ),
        sad: await textureMaker('./textures/eyes/sad.png' ),
        sleepy: await textureMaker('./textures/eyes/sleepy.png' )
    };
    const MOUTHSTATES = {
        smile: await textureMaker('./textures/mouth/smile.png' ),
    };

    let mixerActionDuration = 5;
    let mixerTransitionDuration = 1;
    let mixerAction = 'SITSLEEP';
    let zoom = 1;
    let zoomDuration = 1000;
    let focusTarget = model.getObjectByName( 'head' );
    let focusDuration = 1000;
    let eyeState: Texture = EYESTATES.closed;
    let eyeBlinkTimer = 0;
    let eyeBlinkBeforestate: Texture = eyeState;
    let pointerOver = [];
    let animationToCancel: Function;

    let mouthState: Texture = MOUTHSTATES.smile;
    
    const ui = document.getElementById( 'ui' );
    const raycaster = new Raycaster;
    const pointer = new Vector2;
    const mixer = new API.AnimationMixer( model );
    const icons = model.getObjectByName( 'icons' );
    const head = model.getObjectByName( 'head' );
    const astroman = model.getObjectByName( 'astroman' );;
    const iconLocation = utils.replaceObject( icons, new Object3D  );
    const focusPosition = focusTarget.getWorldPosition( new Vector3 );
    const focusPositionLerper = new Vector3;

    scene.maps.ANIMATIONMIXERS.set( model, mixer );
    scene.maps.UPDATE.add( model );

    function updateAction( event:API.UpdateEvent ){

        const action = mixer.getActionByName( mixerAction );

        if( action ){

            mixer.playOnce( action, mixerActionDuration, mixerTransitionDuration );

        }

    }
    function updateZoom( event:API.UpdateEvent ){

        if( zoom !== camera.zoom ){

            camera.zoom = MathUtils.lerp( camera.zoom, zoom, event.delta / zoomDuration );
            
            if( Math.abs(camera.zoom - zoom) < .01){
                
                camera.zoom = zoom;
                zoomDuration = 1000;

            }

            camera.updateProjectionMatrix();

        }

    }
    function updateFocus( event:API.UpdateEvent ){

        focusTarget.getWorldPosition( focusPosition )

        camera.lookAt( focusPositionLerper.lerp( focusPosition, event.delta / focusDuration ) );

    }
    function updateEyeState( event:API.UpdateEvent ){

        if( eyeBlinkTimer <= 0 && eyeState === EYESTATES.closed ){

            eyeBlinkTimer = 2000 + Math.random() * 2000;
            eyeState = eyeBlinkBeforestate;

        } else if( eyeBlinkTimer <= 0 ){

            eyeBlinkTimer = 100;
            eyeBlinkBeforestate = eyeState;
            eyeState = EYESTATES.closed;

        } else {

            eyeBlinkTimer -= event.delta;

        }

        if( EYEMATERIAL.map !== eyeState ){
            
            EYEMATERIAL.map = eyeState;
            EYEMATERIAL.needsUpdate = true;

        }

    }
    function onUpdateMouthState( event:API.UpdateEvent ){

        if( MOUTHMATERIAL.map !== mouthState ){
            
            MOUTHMATERIAL.map = mouthState;
            MOUTHMATERIAL.needsUpdate = true;

        }

    }
    function updatePointerState( event:API.UpdateEvent ){

        raycaster.setFromCamera( pointer, camera );

        pointerOver = raycaster.intersectObject( astroman, true );

        if( pointerOver.length ){

            ui.style.cursor = 'pointer';

        } else {

            ui.style.cursor = '';

        }

    }

    model.addEventListener( 'update', updatePointerState );
    model.addEventListener( 'update', updateAction );
    model.addEventListener( 'update', updateZoom );
    model.addEventListener( 'update', updateFocus );
    model.addEventListener( 'update', updateEyeState );
    model.addEventListener( 'update', onUpdateMouthState );

    // Configure animations

    glb.animations.forEach((clip:AnimationClip) => {
        
        // The breathing animation should be combined with any other animation.
        // Because blender always exports all tracks, we need to filter manually.
        // Best not do this too often, because blender changes would mean a lot of changes.

        if( clip.name === 'SITBREATHE' ){

            clip.tracks = clip.tracks.filter(track => {

                return track.name.startsWith( 'upperSpine' );

            });
            
        } else if( clip.name === 'TURNAROUND' ){

            clip.tracks = clip.tracks.filter(track => {

                return !track.name.startsWith( 'upperSpine' );

            });

        }

        const action = mixer.clipAction( clip );

        if( clip.name === 'SITBREATHE' ){

            action.setLoop( LoopPingPong, Infinity ).setDuration( 2 ).play();
        
        }
    
    });

    scene.background = new Color( 'black' );

    function onHide(){
        
        mixerAction = 'SITLOOK';
        mixerActionDuration = 2;
        mixerTransitionDuration = .2;
        eyeState = EYESTATES.normal;

        if( animationToCancel ) animationToCancel = animationToCancel();
    
    }
    function onPointerMove( event:MouseEvent|TouchEvent ){

        const touch: Touch|MouseEvent = event['changedTouches'] ? event['changedTouches'][0] as Touch : event as MouseEvent;
        const bb = (event.target as HTMLElement).getBoundingClientRect();

        pointer.set(
            (touch.clientX - bb.left) / bb.width,
            (touch.clientY - bb.top) / bb.height
        );
        pointer.x = pointer.x * 2 - 1;
        pointer.y = -pointer.y * 2 + 1;

    }

    async function Introduction(){

        await API.TextSpeech(
            {
                text: "Oh!",
                className: ['sudden'],
                onShow(){
                    mixerTransitionDuration = .2;
                    mixerAction = 'SITLOOK';
                    eyeState = EYESTATES.normal;
                },
                onHide,
                dismissWithButtons: [],
                duration: 1000
            },
            {
                text: "...",
                onShow(){ mixerAction = 'SITLOOK'; eyeState = EYESTATES.sleepy; },
                dismissWithButtons: [],
                duration: 2000
            },
            {
                text: "Oh, hello there..!",
                onShow(){ mixerAction = 'SITWAVE'; eyeState = EYESTATES.normal; },
                onHide
            },
            {
                text: "My name is... [<strong>SOMETHING HERE</strong>]."
            },
            {
                text: "I'm a developer. Programmer. Coder.<br />Whichever you prefer.",
                onShow(){ mixerAction = 'SITEXPLAIN'; eyeState = EYESTATES.lazy; },
                onHide
            },
            {
                text: "Focusing on the front-end side of things, I try - and succeed - to make clear, concise, simple code.",
                onShow(){  eyeState = EYESTATES.giddy; },
                onHide
            },
            {
                text: "I've worked with things like Angular, THREE.js, SASS, React, Web Components, PHP, Typescript, Javascript, Web APIs...",
                async onShow(){
                    
                    mixerAction = 'HOLDUP';
                    eyeState = EYESTATES.giddy;
                    focusTarget = icons;
                    animationToCancel = await sparkleSparkle();

                    await API.delay(1_000);
                },
                onHide(){

                    focusTarget = head;
                    onHide();

                }
            },
            {
                text: "The list goes on, actually, so you might want to get in touch.",
                onShow(){ mixerAction = 'SITPRAY'; },
                onHide
            }
        );

        MainMenu();

    }
    async function MainMenu(){

        let choice;

        await API.TextSpeech(
            {
                text: "What can I help you with today?", 
                onShow(){ mixerAction = 'SITPRAY'; eyeState = EYESTATES.giddy; },
                onHide,
                choice: [{
                    name: "Show me some of your work!",
                    onConfirm(){ choice = 'work'; }
                }, { 
                    name: "Tell me about your background...",
                    onConfirm(){ choice = 'about'; }
                }, { 
                    name: "How can I get in touch?",
                    onConfirm(){ choice = 'contact'; }
                }]
            },
        );

        switch( choice ){
            case 'work': await ShowWork(); break;
            case 'about': await ShowAbout(); break;
            case 'contact': await ShowContact(); break;
        }

        MainMenu();
            
    }
    async function ShowWork(){

        await API.TextSpeech({
            text: `Okay hold on, I'm going to send you there...`,
            dismissWithButtons: [],
            duration: 1000
        });

        animateScrollBody( document.getElementById( 'work' ) );

        MainMenu();

    }
    async function ShowAbout(){

        await API.TextSpeech({
            text: `Okay hold on, I'm going to send you there...`,
            dismissWithButtons: [],
            duration: 1000
        });

        animateScrollBody( document.getElementById( 'about' ) );

        MainMenu();
        
    }
    async function ShowContact(){

        let choice;

        zoom = 2;
        zoomDuration = 400;

        await API.TextSpeech(
            {
                text: "You made the right choice! Now what?", 
                onShow(){ mixerAction = 'EXCITE'; eyeState = EYESTATES.giddy },
                onHide,
                choice: [{
                    name: "Ring me!",
                    onConfirm(){ choice = 'phone'; }
                }, { 
                    name: "Email me!",
                    onConfirm(){ choice = 'email'; }
                }, {
                    name: 'Back',
                    className: [ 'cancel' ]
                }]
            },
        );

        zoom = 1;
        zoomDuration = 400;

        switch( choice ){
            case 'phone':
            case 'email': {

                mixerAction = 'BEINTOUCH';

                await API.delay(500);

                location.href = choice === 'phone'
                    ? 'tel:' + phoney()
                    : 'mailto:' + mailey();
                
                await new Promise(r => window.addEventListener( 'focus', r, { once: true }));
                
                await API.TextSpeech({
                    text: "We'll be in touch! Nice.",
                    duration: 2000,
                    dismissWithButtons: []
                });

            } break;
            default: {

                zoomDuration = 2000;
                mixerAction = 'SITDISAPPOINT';
                eyeState = EYESTATES.sad;

                await API.TextSpeech({
                    text: "Aw that's a bit disappointing...",
                    duration: 2000,
                    dismissWithButtons: []
                });

            } break;
        }

        onHide();
        MainMenu();

    }

    API.camera.next( camera );

    ui.addEventListener( 'mousemove', onPointerMove );
    ui.addEventListener( 'touchmove', onPointerMove );
    ui.addEventListener( 'touchstart', onPointerMove );

    async function clickOnCharacter(){

        return new Promise(resolve => {

            function onClick( event:MouseEvent ){

                if( pointerOver.length ){

                    ui.removeEventListener( 'click', onClick );

                    resolve();

                }
                    
            }

            ui.addEventListener( 'click', onClick );

        });

    }
    async function sparkleSparkle(){

        const shiningObject = await utils.shiningObject( iconLocation )

        return function(){

            shiningObject.parent.remove( shiningObject );

        }

    }
    async function sleepZzzzz(){

        function onUpdate( event ){

            head.getWorldPosition( position );
            position.project( camera );

            dom.style.left = (position.x + 1) / 2 * ui.clientWidth + 'px';
            dom.style.top = (position.y + 1) / 2 * ui.clientHeight + 'px';

        }

        const dom = document.createElement( 'div' );
        const position = new Vector3;

        dom.classList.add( 'zzz' );
        dom.innerHTML = `<i>Z</i><i>Z</i><i>Z</i><i>Z</i>`;

        ui.appendChild( dom );

        model.addEventListener( 'update', onUpdate );

        return function(){

            dom.remove();
            model.removeEventListener( 'update', onUpdate );

        }

    }

    // Prevent scrolling until clicking on character
    // unless the page was loaded with a pre-existing offset

    const lockbody = !document.body.scrollTop && !document.documentElement.scrollTop;

    if( lockbody ) document.body.style.overflow = 'hidden';

    API.delay(2000).then(async () => {

        animationToCancel = await sleepZzzzz();

        clickOnCharacter().then(() => {
    
            if( lockbody ) document.body.style.overflow = '';

            onHide();
            Introduction();
    
        });

    });

}