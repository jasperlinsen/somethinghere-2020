import * as API from "../core";
import { Group, Color, SpotLight, LoopPingPong, AnimationClip, PointLight, Object3D, PerspectiveCamera, MathUtils, Vector3 } from "three";

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
    const glb = await utils.loadGLTFMap( './models/titlescreen.glb' );
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

    let mixerAction = 'SITLOOK';
    let zoom = 1;
    let zoomDuration = 1000;
    let focusTarget = model.getObjectByName( 'head' );
    let focusDuration = 1000;
    
    const mixer = new API.AnimationMixer( model );
    const icons = model.getObjectByName( 'icons' );
    const head = model.getObjectByName( 'head' );;
    const iconLocation = utils.replaceObject( icons, new Object3D  );
    const focusPosition = focusTarget.getWorldPosition( new Vector3 );
    const focusPositionLerper = new Vector3;

    scene.maps.ANIMATIONMIXERS.set( model, mixer );
    scene.maps.UPDATE.add( model );

    model.addEventListener( 'update', event => {

        const action = mixer.getActionByName( mixerAction );

        if( action ){

            mixer.playOnce( action, 2, .2 );

        }

        if( zoom !== camera.zoom ){

            camera.zoom = MathUtils.lerp( camera.zoom, zoom, event.delta / zoomDuration );
            
            if( Math.abs(camera.zoom - zoom) < .01){
                
                camera.zoom = zoom;
                zoomDuration = 1000;

            }

            camera.updateProjectionMatrix();

        }

        focusTarget.getWorldPosition( focusPosition )

        camera.lookAt( focusPositionLerper.lerp( focusPosition, event.delta / focusDuration ) );

    })

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

    const onHide = () => mixerAction = 'SITLOOK';

    API.camera.next( camera );

    async function Introduction(){

        let shiningObject;

        await API.TextSpeech(
            {
                text: "Hello!",
                onShow(){ mixerAction = 'SITWAVE'; },
                onHide
            },
            {
                text: "My name is <strong>Jasper Linsen</strong>."
            },
            {
                text: "I'm a developer. Programmer. Coder. Whichever you prefer.",
                onShow(){ mixerAction = 'SITEXPLAIN'; },
                onHide
            },
            {
                text: "Focusing on the front-end side of things, I try - and succeed - to make clear, concise, simple code."
            },
            {
                text: "I've worked with things like Angular, THREE.js, SASS, React, Web Components, PHP, Typescript, Javascript, Web APIs...",
                async onShow(){
                    
                    mixerAction = 'HOLDUP';
                    focusTarget = icons;
                    shiningObject = await utils.shiningObject( iconLocation )
                
                },
                onHide(){

                    focusTarget = head;
                    shiningObject.parent.remove( shiningObject );

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
                onShow(){ mixerAction = 'SITPRAY'; },
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
            text: `So yeah, working on this 'Show me work' thing. Hold on.`,
            onShow(){ mixerAction = 'SITDISAPPOINT'; },
            onHide
        });

        MainMenu();

    }
    async function ShowAbout(){

        await API.TextSpeech({
            text: `So yeah, working on this 'About me' thing. Hold on.`,
            onShow(){ mixerAction = 'SITDISAPPOINT'; },
            onHide
        });

        MainMenu();
        
    }
    async function ShowContact(){

        let choice;

        zoom = 2;
        zoomDuration = 400;

        await API.TextSpeech(
            {
                text: "You made the right choice! Now what?", 
                onShow(){ mixerAction = 'EXCITE'; },
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

    API.delay(2000).then(() => {

        Introduction();

    });

}