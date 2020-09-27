/** This is highly stripped down version of my game engine for the purposes of displaying my site. This code is not perfect, but was written to be functional and performant. Some things have not been removed that could be removed. */

import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene as THREEScene,
    Object3D,
    Vector3,
    Vector2,
    Quaternion,
    Raycaster,
    PCFShadowMap,
    Box3,
    Color,
    Intersection,
    Camera,
    AnimationMixer as THREEAnimationMixer,
    AnimationAction,
    LoopOnce,
    Ray,
    Plane
} from "three";

import { BehaviorSubject } from "rxjs";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

/** Collection of specific strings that can be passed in to be disabled */
export type KeyDisable = 'POSITION' | 'GRAVITY';

/** Represents a keyboard key state, like a GamepadButton */
export class Key {

    releasedSince = 0;
    pressedSince = 0;

    get duration(){ return getTime() - this.releasedSince; }
    get pressed(){ return this.releasedSince < this.pressedSince; }

    constructor(
        public code: string
    ){}

}
/** Represents a group of choices to be made in the textbox */
export interface TextSpeechChoiceOptions {
    onConfirm?: Function;
    onCancel?: Function;
    name: string;
    button?: string;
    className?: string[];
    selected?: boolean;
    onShow?: Function; // Method to call when text box is shown
    onHide?: Function; // MMethod to call when the text box is hidden
}
/** Represents a single line of dialog as a textbox */
export class TextSpeechOptions implements TextSpeechOptions {
    
    constructor(
        public text: string,
        public duration: number = 0,
        public disable: KeyDisable[] = [ 'POSITION', 'GRAVITY' ],
        public className: string[] = [],
        public dismissWithButtons: string[] = [ 'Action', 'Cancel' ],
        public choice: TextSpeechChoiceOptions[] = [],
        public onShow: Function = () => {},
        public onHide: Function = () => {}
    ){}
    
    static fromObject( object:any ){

        return new TextSpeechOptions(
            object.text,
            object.duration,
            object.disable,
            object.className,
            object.dismissWithButtons,
            object.choice,
            object.onShow,
            object.onHide
        );

    }

}
export class Scene extends THREEScene {

    /** Store the maps and sets of object groups (layers?) */
    data = {

    }

    /** Store the maps and sets of object groups (layers?) */
    maps = {
        /** Contains all the current players in the scene */
        PLAYERS: new Set<Object3D>(),
        /** Contains a set of all objects requesting an event to update. */
        UPDATE: new Set<Object3D>(),
        /** Contains a set of all objects capable of colliding. */
        COLLISION: new Set<Object3D>(),
        /** Contains a set of all objects capable of obstructing the camera. */
        OBSTRUCT_CAMERA: new Set<Object3D>(),
        /** Contains a set of all objects that can receive shadows (combined with COLLISION objects) */
        RECEIVES_SHADOW: new Set<Object3D>(),
        /** Contains a map of objects and their current boundingbox. Gets updated once per frame. */
        BOUNDINGBOX: new Map<Object3D, Box3>(),
        /** Contains a map of objects and their reset positions. */
        RESET: new Map<Object3D, Vector3>(),
        /** Contains all active AnimationMixers */
        ANIMATIONMIXERS: new Map<Object3D, AnimationMixer>(),
        /** Defines all warpable positions in the scene */
        WARPPOINTS: new Set<Object3D>(),
        /** Defines all objects that a plyer can hit with an attack. */
        HITABLES: new Set<Object3D>(),
        /** Defines all loading zones currently active */
        LOADINGZONES: new Set<Box3>(),
        /** Defines all objects that can be interacted with */
        INTERACTABLES: new Set<Object3D>(),
        /** Defines all objects that can receive 'overlap' and the objects it needs to check */
        OVERLAPS: new Map<Object3D,Set<Object3D>>()
    }

    /** Stores the enabled state of the game */
    enabled = {
        ALL: true,
        /** Toggles whether inputs should be updated every frame. */
        INPUTS: true,
        /** Toggles updating position with maps.POSITION (SimpleMove) */
        POSITION: true,
        /** Toggles objects on or off */
        OBJECTS: true,
        /** Toggles gravity on and off for this scene */
        GRAVITY: true,
        /** Toggles whether gravity and positioining affects the up axes of a model internally */
        GRAVITY_ADJUST_UP_AXIS: false,
        /** Toggles 'overlap' events */
        OVERLAPS: true
    }

    private intersectBoundingBoxSetTMPBox = new Box3;

    intersectBoundingBoxSet( target:Object3D, set:Set<Object3D>, expandByScaler = 1.2 ){

        const b1 = this.intersectBoundingBoxSetTMPBox;

        if( this.maps.BOUNDINGBOX.has( target ) ){

            b1.copy( this.maps.BOUNDINGBOX.get( target ) );

        } else {

            b1.setFromObject( target );

        }
        
        b1.expandByScalar( expandByScaler );

        return Array.from( set ).filter(object => {

            if( object === target ) return false;

            const b2 = this.maps.BOUNDINGBOX.has( object )
                ? TMP.b3.copy( this.maps.BOUNDINGBOX.get( object ) )
                : TMP.b3.setFromObject( object );

            return b1.intersectsBox( b2 );

        });

    }
    /** Returns all objects with either an intersecting bounding box, or no bounding box defined.
     * Use this method to get the objects to raycaster in case we are calculating collisions */
    intersectBoundingBoxCollision( target:Object3D, expandByScaler = 1 ){

        return this.intersectBoundingBoxSet( target, this.maps.COLLISION, expandByScaler );

    }
    /** Removes a certain object (and by default also its descendants) from all maps this scene currently holds.
     * Useful to remove an object from the scene, as well as all its interactions and ependencies. */
    removeFromMaps( root: Object3D, deep = true ){

        const objects = new Set([ root ]);

        if( deep ){

            root.traverse(o => objects.add( o ));

        }

        for( const object of Array.from( objects ) ){
        for( const map in this.maps ){

            this.maps[map].delete( object );

        }}

        return this;

    }

    /** Clears scene of objects and clears aall associated `.maps` */
    async clear(){

        const objects = new Set<Object3D>();

        this.traverse((object: Object3D) => objects.add( object ));

        for( const object of Array.from( objects ) ){

            await dispatch( object, { type: 'dispose' });

        }

        for( const child of this.children.slice() ){
            
            this.remove( child );

        }

        for( const map in this.maps ){

            this.maps[map].clear();

        }

        await dispatch( this, { type: 'clear' });

        return this;

    }

    /** Updates all bounding boxes stored in `scene.maps.BOUNDINGBOX`
     * If an object contains a 'staticBoundingBox' property, it will be used and not recalculated instead.
     * @param {number} delta Delta in milliseconds for this frame
     * @return {Set<Object3D>} Set containing all objects whose boundingBoxes were updated. */
    async updateBoundingBoxes( delta:number ){
        
        let updatedCount = new Set;

        this.maps.BOUNDINGBOX.forEach((box, object) => {
            
            if( object[ 'staticBoundingBox' ] && box !==  object[ 'staticBoundingBox' ] ){

                updatedCount.add( object );
                object[ 'staticBoundingBox' ].set( object, object[ 'staticBoundingBox' ] );

            } else if( !object[ 'staticBoundingBox' ] ){

                updatedCount.add( object );
                box.setFromObject( object );

            }
        
        });
        
        return updatedCount;

    }

    async updateOverlaps( delta:number ){

        if( this.enabled.OVERLAPS ){

            for( const target of Array.from( this.maps.OVERLAPS.keys() ) ){

                const targetList = this.maps.OVERLAPS.get( target );
                const overlaps = this.intersectBoundingBoxSet( target, targetList, 1 );

                if( overlaps.length ){

                    const array = [ ...overlaps, target ];

                    for( const dispatchTarget of array ){

                        await dispatch( dispatchTarget, {
                            type: 'overlap',
                            targets: new Set( targetList ),
                            origin: target
                        } as OverlapEvent);

                    }

                }

            }

        }

    }

    /** Sends an `UpdateEvent` to all objects in `MAP.UPDATE` */
    async updateEvents( delta:number  ){
    
        let updateCount = 0;
    
        if( this.enabled.OBJECTS ){
    
            const EVENT: UpdateEvent = {
                type: 'update',
                scene: renderPass.scene as Scene,
                renderer,
                camera: renderPass.camera,
                delta,
                time: TIME
            };
    
            for( let object of Array.from(this.maps.UPDATE) ){
    
                if( !(await dispatch( object, EVENT )) ) break;
    
            }
    
        }
    
        return updateCount;
    
    }

    async updateAnimationMixers( delta:number ){

        this.maps.ANIMATIONMIXERS.forEach(mixer => {

            mixer.update( delta / 1000 );

        });

    }
    
    /** Call all update methods sequentially */
    async update( delta:number ){

        if( this.enabled.ALL ){
            
            await this.updateBoundingBoxes( delta );
            await this.updateOverlaps( delta );
            await this.updateEvents( delta );
            await this.updateAnimationMixers( delta );

        }

    }

}
export class AnimationMixer extends THREEAnimationMixer {

    constructor( root ){

        super( root );

        // this.addEventListener( 'finished', event => {

        //     const action = event.action as AnimationAction;
            
        //     action.stop().reset();
        //     this.lastAction = event.action;
        //     this.currentAction = null;

        // });

    }

    currentAction: AnimationAction;
    lastAction: AnimationAction;

    getActionByName( name: string ){

        const actions: AnimationAction[] = this['_actions'];

        return actions.find(v => v['_clip'].name === name);

    }

    playOnce( action: AnimationAction, duration: number, fade = 0 ){

        action.clampWhenFinished = true;

        if( this.currentAction === action && action.isRunning() ){

            return;

        }

        if( fade && this.currentAction && this.currentAction !== action ){

            action.reset().setLoop( LoopOnce, 1 ).setDuration( duration ).crossFadeFrom( this.currentAction, fade, false ).play();

        } else {

            action.reset().setLoop( LoopOnce, 1 ).setDuration( duration ).play();
            
        }

        this.currentAction = action;

        return this.currentAction;

    }

    stopAllAction(){
        
        super.stopAllAction();

        this.currentAction = null;

        return this;

    }

}

/** Interface for minimum requirement EVENT */
export interface TypedEvent {
    type: string;
    target?: Object3D;
    preventDefault?: Function;
}
/** Interface for minimum requirement for COLLISION event */
export interface CollisionEvent extends TypedEvent {
    intersection?: Intersection;
    origin?: Object3D;
    ignoreCollision?: Function;
}
/** Interface for minimum requirement for UPDATE event */
export interface UpdateEvent extends TypedEvent {
    scene: Scene;
    renderer?: WebGLRenderer;
    camera?: Camera;
    delta: number;
    time: number;
}
/** Interface for minimum requirement for HIT (damage) event */
export interface HitEvent extends CollisionEvent {
    boxes?: any;
    cancelHit?: boolean
}
/** Interface for minimum requirement for LOADINGZONE event */
export interface LoadingZoneEvent extends CollisionEvent {
    boxes: any;
    zone: Object3D;
    cancelLoadingZone?: () => {};
}
export interface InteractionEvent extends TypedEvent {
    originator: Object3D;
}
export interface VoidOutEvent extends TypedEvent {
    preventVoidOut?: Function;
    source: 'water'|'bounds'; // Add more types here
}
export interface OverlapEvent extends TypedEvent {
    origin: Object3D;
    targets: Set<Object3D>;
}

// UTILITIES

/** Utility method to get the current timestamp */
export function getTime(){

    return window.performance ? window.performance.now() : Date.now()

}
/** Utility method to clamp number in a range of values. Defaults to clamping between 0 and 1 */
export function clamp( value: number, ...range: number[] ){

    while( range.length < 2 ) range.push( range.length );

    const min = Math.min( ...range );
    const max = Math.max( ...range );

    return value < min ? min : (value > max ? max : value);

}
/** Utility method to rotate certain unit vector to another using quaternions */
export function lerpUnitVectors( vectorA: Vector3, vectorB: Vector3, t: number, inverseAngularDirection = false ){

    const q1 = new Quaternion().setFromUnitVectors( AXES.Z, vectorA );
    const q2 = new Quaternion().setFromUnitVectors( AXES.Z, vectorB );

    if( inverseAngularDirection ) q2.inverse();

    vectorA.copy( AXES.Z ).applyQuaternion( q1.slerp( q2,  t ) );

    return vectorA;

}
/** Utility method to await a certain condition */
export async function whentrue( handler: Function ){

    return new Promise(resolve => {

        function wrapper(){

            const result = handler();

            if( result ) resolve( result );
            else window.requestAnimationFrame( wrapper );

        }

        wrapper();

    });

}
/** Utility method to await a certain delay in milliseconds */
export async function delay( time: number ){

    return new Promise(resolve => setTimeout( resolve, time ));

}
/** Dispatch an event and await its handlers to complete asynchronously
 * @param {Object3D} object Event target (event.target)
 * @param {TypedEvent} event Event to dispatch to the target. Requires at least a type.
 */
export async function dispatch( object: Object3D, event: TypedEvent ){

    const listeners =  (object['_listeners'] && object['_listeners'][ event.type ]) || [];

    for( const handler of listeners ){

        let CANCELLED = false;

        try { await handler({
            ...event,
            target: object,
            cancel(){ CANCELLED = true; }
        }); } catch(e){

            CANCELLED = true;

            console.error( 'cancelling event', event, e );

        }

        if( CANCELLED ){

            return false;

        }

    }

    return true;

}
/** Updates static inputs to be read. This should be called first every frame.
 * _(called by `onAnimationFrame()`)_ */
export async function updateInputs(){

    const scene = renderPass.scene as Scene;

    let updateCount = 0;

    if( scene.enabled.INPUTS ){

        const gamePads = navigator.getGamepads();

        for( let i = 0; i < gamePads.length; i++ ){

            const gamePad = gamePads[i];

            if( gamePad ){
                
                GAMEPAD = gamePad;
                break;

            }

        }


        //GAMEPAD = navigator.getGamepads().find(v => v.id === GAMEPADID);
        /* Update all inputs here */

    }

    return updateCount;

}
/** Utility method to await fadeout of the #renderer DOM. */
export async function globalRendererFadeOut(){

    document.body.classList.add( 'fadeout' );

    await delay(1000);

}
/** Utility method to await fadein of the #renderer DOM. */
export async function globalRendererFadeIn(){

    document.body.classList.remove( 'fadeout' );

    await delay(1000);

}
/** Utility to replace on object with another while preserving its matrices. */
export function replaceObject( object:Object3D, newObject:Object3D ){

    newObject.position.copy( object.position );
    newObject.quaternion.copy( object.quaternion );
    newObject.scale.copy( object.scale );
    newObject.userData = object.userData;

    object.parent.add( newObject );
    object.parent.remove( object );
    
    return newObject;

}

/** Render the canvas and interface
 * _(called by `onAnimationFrame()`)_ */
async function render(){

    effectComposer.render();

}
/** Called every animation frame, controlled by `stop()`  and `start()` */
async function onAnimationFrame( time: number = 1 ){

    if( time !== TIME ){

        FRAMEID = null;
        DELTA = (time - TIME) * FASTFORWARD;
        TIME += DELTA;

        if( saveFile.value ){

            saveFile.value.playTime += DELTA;

        }

        await updateInputs();

        if( !SETTINGS.FRAME_STEPPING ){
            
            await onFrameStep().catch(error => {

                pause();
                console.warn( 'interrupted because of error in the animation frame')
                console.error( error );

            });
        
        }

        if( PAUSED ) return;

        if( getTime() - time < 1000 / SIMULATE_FPS ) await delay( 1000 / SIMULATE_FPS - (getTime() - time) );

        FRAMEID = window.requestAnimationFrame( onAnimationFrame );

    } else if( FRAMEID == AWAITINGFRAMEID ){

        console.warn( 'animationFrame already called!' );

        FRAMEID = window.requestAnimationFrame( onAnimationFrame );
        
    }

}

/** Execute a single step in the animation frame. Available for HTML button access. */
async function onFrameStep(){

    const scene = renderPass.scene as Scene;

    FPS.frames.push( DELTA );

    await scene.update( DELTA );
    await onResize();
    await render();
    await Promise.all( Array.from( afterFrameStep ).map(method => new Promise(async resolve => {

        if( await method( DELTA ) === false ){

            afterFrameStep.delete( method );

        }

        resolve();

    })) );

    while( FPS.duration > FPS.timePeriod ) FPS.frames.shift();

}

/** Resize the canvas to it's current boundingRect size.
 * _NOTE: If defined in CSS, use `!important` if defining width and heigh directly.
 * When using `flex` or `grid`, sizing should function as expected._ */
function onResize(){

    const dom = renderer.domElement;
    const bb = dom.getBoundingClientRect();
    const size = renderer.getSize( TMP.v2 );

    if( bb.width !== size.width || bb.height !== size.height || camera.value['aspect'] !== bb.width / bb.height ){

        effectComposer.setSize( bb.width, bb.height );
        renderer.setSize( bb.width, bb.height );

        if( camera.value instanceof PerspectiveCamera ){

            camera.value.aspect = bb.width / bb.height;
            camera.value.updateProjectionMatrix();

        }
        
    }

}
/** Register the gamepad to our global `GAMEPAD`. Will remove itself until `gamepaddisconnected`. */
function onGamepadConnected( event: GamepadEvent ){

    GAMEPADID = event.gamepad.id;
    GAMEPADTYPE = [ 'xbox', 'playstation', 'pro' ].find(type => GAMEPADID.toLowerCase().indexOf( 'xbox' ) >= 0) || 'generic';

    window.removeEventListener( 'gamepadconnected', onGamepadConnected );
    window.addEventListener( 'gamepaddisconnected', onGamepadDisconnected );

    TextNotification( `Gamepad connected: ${GAMEPADID}`, 'background: limegreen; color: black;' );

    document.body.setAttribute( 'gamepad-type', GAMEPADTYPE );

}
/** Dergister the gamepad to our global `GAMEPAD` if it matches. Will remove itself until `gamepadconnected`. */
function onGamepadDisconnected( event: GamepadEvent ){

    TextNotification( `Gamepad disconnected: ${GAMEPADID}`, 'background: red; color: white;' );

    GAMEPADID = null;

    window.addEventListener( 'gamepadconnected', onGamepadConnected );
    window.removeEventListener( 'gamepaddisconnected', onGamepadDisconnected );    

    document.body.removeAttribute( 'gamepad-type' );

}
/** Register the pressed key to our global `KEYBOARD`. */
function onKeyDown( event:KeyboardEvent ){

    const key = KEYBOARD[ event.code ] = KEYBOARD[ event.code ] || new Key( event.code );

    if( !key.pressed ){

        key.pressedSince = getTime();

    }

}
/** Register the pressed key change to our global `KEYBOARD`. */
function onKeyUp( event:KeyboardEvent ){

    const key = KEYBOARD[ event.code ] = KEYBOARD[ event.code ] || new Key( event.code );

    if( key.pressed ){

        key.releasedSince = getTime();

    }

}
/** Sets all .pressed properties to false */
function onKeyReleaseAll(){

    for( let label in KEYBOARD ){

        const key = KEYBOARD[label];

        if( key.pressed ) key.releasedSince = getTime();

    }

}
/** Handles the new warp object to transfer the player there */
function onWarpChange( warp:Object3D ){

    if( warp && warp.userData.warp ){
        
        scene.value.maps.PLAYERS.forEach(player => {

            const playerWorld = warp.getWorldPosition( new Vector3 );

            player.position.copy( player.parent.worldToLocal( playerWorld ) );
            player.quaternion.copy( warp.quaternion );

        });

    }

}
/** Raycasts the current scene */
function onContextMenu( event:MouseEvent ){

    event.preventDefault();

    const raycaster = new Raycaster();

    raycaster.setFromCamera( new Vector2(
        event.offsetX / event.target['clientWidth'] * 2 - 1,
        -event.offsetY / event.target['clientHeight'] * 2 + 1,
    ), camera.value );

    console.log( raycaster.intersectObject( scene.value, true ) );

}

/** Start the animation frame */
async function start(){

    await pause();

    PAUSED = false;
    TIME = getTime();

    if( !FRAMEID ){
        
        FRAMEID = AWAITINGFRAMEID;

        await onAnimationFrame( window.performance ? window.performance.now() : Date.now() );

        document.body.classList.remove( 'paused' );

    }

}
/** Stop the animation frame */
async function pause(){

    PAUSED = true;

    if( FRAMEID && FRAMEID !== AWAITINGFRAMEID ){
        
        window.cancelAnimationFrame( FRAMEID as number );

        FRAMEID = null;

    }

    document.body.classList.add( 'paused' );

    await new Promise(r => window.requestAnimationFrame(r));

}
/** Reset the scene and the renderer, execute imported script */
export async function loadLevel( key:string, warpPoint?:string ){

    if( key && !LEVEL_MODULES[ key ] ){
        
        LEVEL_MODULES[ key ] = import( key );
    
    }

    if( LEVEL_MODULES[ key ] ){

        await globalRendererFadeOut();
        await pause();
        
        effectComposer.passes.forEach(pass => pass.enabled = false);
        renderPass.enabled = true;

        const module = await LEVEL_MODULES[ key ];
        
        let awaitErrorResolve: Promise<any>;

        Array.from( document.querySelector( '#ui' ).children ).forEach(child => {

            if( !child.classList.contains( 'permanent' ) ) child.remove();

        });

        if( module.default ){

            const oldScene = scene.value;
            const oldCamera = camera.value;
            const newScene = new Scene;
            const saveData = saveFile.value.customData[key] || {};

            saveFile.value.customData[key] = saveData;

            newScene.name = key;
            
            const result = await module.default( newScene, saveData ).catch(error => {

                console.log( error );

                return "ERROR";

            });

            if( result === "ERROR" ){

                camera.next( oldCamera );
                scene.next( oldScene );

                awaitErrorResolve = TextSpeech( "An error has occured loading this level" );

            } else {

                newScene.updateMatrixWorld();

                scene.next( newScene );

                const warps = Array.from( newScene.maps.WARPPOINTS );
                const hash = warpPoint || localStorage.getItem( 'selected-warp' ) || location.hash.replace( '#', '' );
                const firstWarp = warps.find(v => v.userData.warp === hash) || warps.shift();

                if( firstWarp ) warp.next( firstWarp );
                
                await oldScene.clear();

            }

        
        }

        await start();
        await onResize();

        scene.value.enabled.POSITION = false;
        scene.value.enabled.GRAVITY = false;

        await awaitErrorResolve;

        await delay(1000);
        
        await globalRendererFadeIn();

        scene.value.enabled.POSITION = true;
        scene.value.enabled.GRAVITY = true;

    }

}
export async function resetLevel(){

    await loadLevel( scene.value.name, warp.value.userData.warp );

}
/** Displays a notification in the notification area as well as a log in the console */
export async function TextNotification( text: string, style?: string ){

    const span = document.createElement( 'span' );

    span.innerHTML = `<span>${text}</span>`;
    span.addEventListener( 'click', event => {

        if( span.style.animationName ){

            span.style.animationName = '';

        } else {

            span.style.animationName = 'none';

        }

    });
    span.addEventListener( 'animationend', event => {

        if( event.animationName === 'slideout' ){

            span.remove();

        }

    });

    if( style ){

        span.setAttribute( 'style', style );

        console.log( `%c${text}`, style );

    } else {

        console.log( text );

    }

    const notifications = document.getElementById( 'notifications' );

    if( notifications.children.length ) notifications.insertBefore( span, notifications.children[0] );
    else notifications.appendChild( span );

}
/** Display a speech bubble in the UI area. Only one speech bubble can be active at any time. */
export async function TextSpeech( ...texts: Array<string|TextSpeechOptions|any> ){

    const scene = renderPass.scene as Scene;
    const ui = document.getElementById( 'ui' );
    const span: HTMLSpanElement = document.getElementById( 'speech' ) || document.createElement( 'span' );
    const content = (span.children[0] || span.appendChild( document.createElement( 'span') )) as HTMLSpanElement;
    const conversationId = Symbol();

    // If these don't match,
    // a new conversation has begun and we should back out of this one
    CONVERSATION = conversationId;

    span.id = 'speech';

    let ended = false;
    let event = { cancelSpeech(){
        
        ended = true;
        span.remove();
    
    } };

    conversation: while( texts.length ){

        if( ended ) break;

        const text = texts.shift();
        const options = typeof text === 'string'
            ? new TextSpeechOptions( text )
            : TextSpeechOptions.fromObject( text );
        const enabledBefore = options.disable.map(term => scene.enabled[term]);

        options.disable.forEach(term => scene.enabled[term] = false);

        span.classList.remove( 'ready' );
        content.innerHTML = options.text;

        ui.appendChild( span );

        if( texts.length === 0 ) span.classList.add( 'final' );
        if( options.className ) span.classList.add( ...options.className );
        if( options.onShow ) await options.onShow( event );

        await delay( options.duration || content.innerHTML.split( ' ' ).length * 20 );
        
        if( options.dismissWithButtons.length ){

            span.classList.add( 'ready' );

            await Promise.all(options.dismissWithButtons.map(action => {
                return whentrue(() => !INPUT_MAPPING[action])
            }));

            if( CONVERSATION !== conversationId ) break conversation;

            await Promise.race(options.dismissWithButtons.map(action => {
                return whentrue(() => INPUT_MAPPING[action]);
            }).concat([
                new Promise(resolve => {

                    const click = e => {

                        if( !PAUSED && INVIEW ){

                            e.preventDefault();
                            resolve();

                        } else {

                            ui.addEventListener( 'click', click, { once: true })

                        }

                    }

                    ui.addEventListener( 'click', click, { once: true })

                })
            ]));

            if( CONVERSATION !== conversationId ) break conversation;

        }

        if( options.choice.length ){

            span.classList.add( 'choosing' );

            const choicesList = document.createElement( 'ul' );

            let selected = options.choice.findIndex(v => v.selected);
                selected = selected < 0 ? 0 : selected;

            choicesList.classList.add( 'choices' );

            for( const choice of options.choice ){

                const listItem = document.createElement( 'li' );

                listItem.textContent = choice.name;
                listItem.className = (choice.className || []).join( ' ' );

                if( options.choice[ selected ] === choice ) listItem.classList.add( 'selected' );
                
                choicesList.appendChild( listItem );

            }

            span.appendChild( choicesList );

            let returnValue = 1000;

            await whentrue(() => !INPUT_MAPPING.Action)

            while( returnValue !== 1 ){

                if( span.parentNode !== ui ) break conversation;

                await delay(300);

                if( span.parentNode !== ui ) break conversation;

                returnValue = await Promise.race([
                    whentrue(() => INPUT_MAPPING.Action && 1),
                    whentrue(() => INPUT_MAPPING.Cancel && 2),
                    whentrue(() => INPUT_MAPPING.LeftAxis.y > .7 && 3),
                    whentrue(() => INPUT_MAPPING.LeftAxis.y < -.7 && 4),
                    new Promise(resolve => {

                        choicesList.addEventListener( 'click', event => {

                            event.preventDefault();

                            if( event.target['classList'].contains( 'selected' ) ){

                                resolve(1);

                            } else if( event.target['tagName'] === 'LI' ){

                                choicesList.children[ selected ].classList.remove( 'selected' );
                                selected = Array.from( choicesList.children ).indexOf( event.target as HTMLSpanElement );
                                resolve(5);

                            }

                        }, { once: true });

                    })
                ]) as number;

                if( span.parentNode !== ui ) break conversation;
                
                choicesList.children[ selected ].classList.remove( 'selected' );

                await Promise.all([
                    whentrue(() => !INPUT_MAPPING.Action),
                    whentrue(() => INPUT_MAPPING.LeftAxis.y < .7 && INPUT_MAPPING.LeftAxis.y > -.7)
                ]);

                if( span.parentNode !== ui ) break conversation;

                switch( returnValue ){
                    case 1: await options.choice[ selected ].onConfirm?.( event ); break;
                    case 3: selected += 1; break;
                    case 4: selected -= 1; break;
                };

                if( span.parentNode !== ui ) break conversation;

                selected = selected >= options.choice.length ? 0 : selected;
                selected = selected < 0 ? options.choice.length - 1 : selected;

                choicesList.children[ selected ].classList.add( 'selected' );
                //choicesList.children[ selected ].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

            }

            choicesList.remove();

            span.classList.remove( 'choosing' );

            if( CONVERSATION !== conversationId ) break conversation;

        }

        options.disable.forEach((term, index) => scene.enabled[term] = enabledBefore[index]);

        if( options.className ) span.classList.remove( ...options.className );

        if( options.onHide ) await options.onHide( event );
        
    }

    if( CONVERSATION === conversationId ){
        
        span.classList.remove( 'choosing', 'ready', 'final' );
        span.remove();
    
    }

}

/** A full radian. */
export const RADIAN = Math.PI * 2;
/** Contains all general settings. */
export const SETTINGS = {
    QWERTY: true,
    WIREFRAME: false,
    FRAME_STEPPING: false // step trhough frame by frame
};
/** Defines useful default axes. */
export const AXES = {
    ORIGIN: new Vector3,
    X: new Vector3( 1, 0, 0 ), 
    X_NEG: new Vector3( -1, 0, 0 ),
    Y: new Vector3( 0, 1, 0 ),
    Y_NEG: new Vector3( 0, -1, 0 ),
    Z: new Vector3( 0, 0, 1 ), 
    Z_NEG: new Vector3( 0, 0, -1 ),
    POSITIVE: new Vector3( 1, 1, 1 ),
    NEGATIVE: new Vector3( -1, -1, -1 )
};
/** Provides temporary objects. Use, but do not rely on their values being correct in out-of-order execution */
export const TMP = {
    v2: new Vector2,
    v3: new Vector3,
    q: new Quaternion,
    b3: new Box3,
    r: new Ray,
    c: new Color,
    p: new Plane
};
/** Contains general 'input' states.
 * Returns boolean if a button, returns Vector2 if an axis. */
export const INPUT_MAPPING = {
    get Shift(){
        
        return !PAUSED && (KEYBOARD[ 'ShiftLeft' ] && KEYBOARD[ 'ShiftLeft' ].pressed) || (KEYBOARD[ 'ShiftRight' ] && KEYBOARD[ 'ShiftRight' ].pressed);

    },
    get Action(){
        
        // A, Enter
        
        return !PAUSED && (
            (KEYBOARD[ 'Enter' ] && KEYBOARD[ 'Enter' ].pressed)
            || (GAMEPAD && GAMEPAD.buttons[1].pressed)
        );

    },
    get Cancel(){

        // B, Space

        return !PAUSED && (
            (KEYBOARD[ 'Space' ] && KEYBOARD[ 'Space' ].pressed)
            || (GAMEPAD && GAMEPAD.buttons[0].pressed)
        );

    },
    get SecondaryAction(){

        // Y
        return !PAUSED && (
            (KEYBOARD[ 'KeyY' ] && KEYBOARD[ 'KeyY' ].pressed)
            || (GAMEPADTYPE && GAMEPAD.buttons[2])
        );

    },
    get TertiaryAction(){

        // X
        return !PAUSED && (
            (KEYBOARD[ 'KeyX' ] && KEYBOARD[ 'KeyX' ].pressed)
            || (GAMEPADTYPE && GAMEPAD && GAMEPAD.buttons[3])
        );

    },
    get StartButton(){

        // Escape, +, START
        return (
            (!this.Shift && KEYBOARD[ 'Escape' ] && KEYBOARD[ 'Escape' ].pressed)
            || (GAMEPAD && GAMEPAD.buttons[8].pressed)
        );

    },
    get SelectButton(){

        // Shift+Escape, -, SELECT
        return (
            (this.Shift && KEYBOARD[ 'Escape' ] && KEYBOARD[ 'Escape' ].pressed)
            (GAMEPADTYPE && GAMEPAD.buttons[8])
        );

    },
    get LeftAxis(){

        const modifier = (KEYBOARD['AltLeft'] && KEYBOARD['AltLeft'].pressed)
            || KEYBOARD['AltRight'] && KEYBOARD['AltRight'].pressed;

        const [ up, right, down, left ] = KEYBOARD.Layout;

        const y =
            (GAMEPAD && GAMEPAD.axes[1])
            || (!modifier && KEYBOARD['ArrowUp'] && KEYBOARD['ArrowUp'].pressed ? -1 : 0)
            || (!modifier && KEYBOARD['ArrowDown'] && KEYBOARD['ArrowDown'].pressed ? 1 : 0)
            || (KEYBOARD[up] && KEYBOARD[up].pressed ? -1 : 0)
            || (KEYBOARD[down] && KEYBOARD[down].pressed ? 1 : 0);
        const x =
            (GAMEPAD && GAMEPAD.axes[0])
            || (!modifier && KEYBOARD['ArrowLeft'] && KEYBOARD['ArrowLeft'].pressed ? -1 : 0)
            || (!modifier && KEYBOARD['ArrowRight'] && KEYBOARD['ArrowRight'].pressed ? 1 : 0)
            || (!modifier && KEYBOARD[left] && KEYBOARD[left].pressed ? -1 : 0)
            || (!modifier && KEYBOARD[right] && KEYBOARD[right].pressed ? 1 : 0);

        const result = new Vector2( x, y );

        if( !GAMEPAD ) result.normalize();

        return result;

    },
    get RightAxis(){

        const modifier = (KEYBOARD['AltLeft'] && KEYBOARD['AltLeft'].pressed)
            || KEYBOARD['AltRight'] && KEYBOARD['AltRight'].pressed;

        const y =
            (GAMEPAD && GAMEPAD.axes[3])
            || (modifier && KEYBOARD['ArrowUp'] && KEYBOARD['ArrowUp'].pressed ? 1 : 0)
            || (modifier && KEYBOARD['ArrowDown'] && KEYBOARD['ArrowDown'].pressed ? -1 : 0);
        const x =
            (GAMEPAD && GAMEPAD.axes[2])
            || (modifier && KEYBOARD['ArrowLeft'] && KEYBOARD['ArrowLeft'].pressed ? 1 : 0)
            || (modifier && KEYBOARD['ArrowRight'] && KEYBOARD['ArrowRight'].pressed ? -1 : 0);

        return new Vector2( x, y );

    },
    get RightFrontTrigger(){

        return (KEYBOARD['ShiftRight'] && KEYBOARD['ShiftRight'].pressed) || (GAMEPAD && GAMEPAD.buttons[5].pressed);

    },
    get LeftFrontTrigger(){

        return (KEYBOARD['ShiftLeft'] && KEYBOARD['ShiftLeft'].pressed) || (GAMEPAD && GAMEPAD.buttons[7].pressed);

    }
};
/** Stores keyboard key states */
export const KEYBOARD = {
    get Layout(){
        return SETTINGS.QWERTY
            ? [ 'KeyW', 'KeyD', 'KeyS', 'KeyA' ]
            : [ 'KeyZ', 'KeyD', 'KeyS', 'KeyQ' ];
    }
};
/** Allows the page to interact with the module */
export const LEVEL_MODULES = {};
/** Symbol used to tell the renderer to not render until a frame ID is found */
export const AWAITINGFRAMEID = Symbol();
/** Holds methods that will be called every frame */
export const afterFrameStep = new Set<(delta:number)=>boolean|void>();
export const UTILITIES = {
    getTime,
    clamp,
    lerpUnitVectors
}
export const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas: document.querySelector( '#renderer canvas' ) as HTMLCanvasElement,
    preserveDrawingBuffer: true
});
export const effectComposer = new EffectComposer( renderer );
export const raycaster = new Raycaster;
export const wrapper = document.createElement( 'div' );
export const scene = new BehaviorSubject<Scene>( new Scene );
export const camera = new BehaviorSubject<Camera>( new PerspectiveCamera );
export const warp = new BehaviorSubject<Object3D>( null );
export const saveFile = new BehaviorSubject<any>({ customData: {} });

const FPS = {
    frames: [],
    critical: 10,
    timePeriod: 10 * 1000,
    get duration(){
        return this.frames.reduce((c,v) => c + v, 0);
    },
    get average(){
        return this.frames.length / (this.duration / 1000);
    }
};
const renderPass = new RenderPass( scene.value, camera.value );
const intersectionObserver = new IntersectionObserver(entries => {

    if( !PAUSED && entries[0].intersectionRatio <= 0 ) pause();
    else if( PAUSED && entries[0].intersectionRatio > .0 ) start();

    INVIEW = entries[0].intersectionRatio > 0;

});

/** Tries to limit animation frame calls to the desired framerate to test differences in framerates */
let SIMULATE_FPS = 60;
let FASTFORWARD = 1;
let PAUSED = false;
let INVIEW = false;

let DELTA = 0;
let TIME = 0;
let FRAMEID: number|symbol = 0;

let GAMEPADID: string;
let GAMEPADTYPE: string;
let GAMEPAD: Gamepad;

let CONVERSATION;

scene.subscribe( onResize );
scene.subscribe( scene => {
    
    if( scene ){

        renderPass.scene = scene;
        
    }
    
});

camera.subscribe( onResize );
camera.subscribe( camera => renderPass.camera = camera );

warp.subscribe( onWarpChange );

intersectionObserver.observe( renderer.domElement );
effectComposer.addPass( renderPass );

window.addEventListener( 'keydown', onKeyDown );
window.addEventListener( 'keyup', onKeyUp );
window.addEventListener( 'focus', e => INVIEW && PAUSED ? start() : null );
window.addEventListener( 'blur', e => INVIEW && !PAUSED ? pause() : null );
window.addEventListener( 'blur', onKeyReleaseAll );
window.addEventListener( 'gamepadconnected', onGamepadConnected );
window.addEventListener( 'click', e => INVIEW && PAUSED ? start() : (!PAUSED && !INVIEW ? pause() : null) );

renderer.setClearColor( 0xffffff, 0 );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

document.querySelector( '#ui' ).addEventListener( 'contextmenu', onContextMenu );

LEVEL_MODULES[ 'Titlescreen' ] = import( './levels/titlescreen' );