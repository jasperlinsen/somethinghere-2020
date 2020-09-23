import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene as THREEScene,
    Object3D,
    Vector3,
    Vector2,
    Mesh,
    BoxGeometry,
    Quaternion,
    Raycaster,
    PCFShadowMap,
    MeshPhongMaterial,
    Box3,
    Color,
    Intersection,
    Camera,
    AnimationMixer as THREEAnimationMixer,
    AnimationClip,
    AnimationAction,
    LoopPingPong,
    LoopOnce,
    MeshBasicMaterial,
    Euler,
    Texture,
    LoopRepeat,
    CylinderBufferGeometry,
    Ray,
    TextureLoader,
    RepeatWrapping,
    CylinderGeometry,
    Face3,
    BoxBufferGeometry,
    SphereBufferGeometry,
    BackSide,
    ArrowHelper,
    BufferGeometry,
    SphereGeometry,
    Light,
    PlaneGeometry,
    Group,
    CanvasTexture,
    Sprite,
    SpriteMaterial,
    Plane,
    DoubleSide,
    CircleGeometry,
    Box2
} from "three";

import { BehaviorSubject, async } from "rxjs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { PyroclasticExplosionShaderMaterial } from "./shaders/pyroclastic-explosion.shader";
import { Water } from "three/examples/jsm/objects/Water";
import { getWorldDistance } from "./utilities/world-distance";
import { getWorldDirection } from "./utilities/world-direction";
import { getWorldPosition } from "./utilities/world-position";
import { SaveFile, saveFile as SAVE } from "./code/fileManager";
import { resolve } from "path";

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
/** Represents a single line of dialog as a textbox */
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
/** Represents a single line of dialog as a textbox */
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
        /** Contains a map of objects and their current movement state. */
        POSITION: new Map<Object3D, VelocityVector>(),
        /** Contains a map of objects and their current gravity state. */
        GRAVITY: new Map<Object3D, GravityVelocityVector>(),
        /** Contains a map of objects and their current boundingbox. Gets updated once per frame. */
        BOUNDINGBOX: new Map<Object3D, Box3>(),
        /** Contains a map of objects and their current jumping state. */
        JUMP: new Map<Object3D, JumpingVelocityVector>(),
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

    /** Updates all objects in `scene.maps.GRAVITY` according to their GravityVelocityVector every frame.
     * @event `CollisionEvent` When an object is on the floor, it will dispatch this event and not count as updated.
     * Call cancel() to prevent gravity froom correcting this position.
     * @param {number} delta Delta in milliseconds for this frame
     * @return {Set<Object3D>} Set containing all updated objects that gravity has moved (no collision)
     */
    async updateGravity( delta:number ){
    
        const updateCount = new Set;
    
        if( this.enabled.GRAVITY )
        for( const object of Array.from( this.maps.GRAVITY.keys() ) ){

            const gravity = this.maps.GRAVITY.get( object );
            
            if( !gravity.enabled ) continue;

            // Too much gravity, reset

            if( gravity.strength > 100 ){

                gravity.strength = 1;

                let defaultPrevented = false;

                await dispatch( object, {
                    type: 'reset',
                    preventDefault(){ defaultPrevented = true; }
                });

                if( !defaultPrevented ){

                    object.position.copy( warp.value.position );
                    object.quaternion.copy( warp.value.quaternion );
                    warp.next( warp.value );

                }

            }

            // Gravity is active for this object

            if( gravity.strength ){

                const box = this.maps.BOUNDINGBOX.get( object );
                const collision = this.intersectBoundingBoxCollision( object );
                const max = Math.max( ...box.getSize( TMP.v3 ).toArray() )
                const offset = .1;
                
                raycaster.set( object.position.clone(), gravity.direction );
                raycaster.near = 0;
                raycaster.far = gravity.strength + offset + max;
                raycaster.ray.recast( -offset - max );

                const floor = raycaster.intersectObjects( collision ).shift();

                if( floor && floor.distance < gravity.strength * delta / 1000 + max ){

                    floor['time'] = getTime();

                    let ignoreCollision = false;
                    
                    const event = {
                        type: 'collision',
                        origin: object,
                        intersection: gravity.intersection,
                        ignoreCollision(){ ignoreCollision = true; }
                    } as CollisionEvent;

                    await dispatch( object, event );
                    await dispatch( floor.object, event );

                    if( !ignoreCollision ){

                        gravity.intersection = floor;
                        gravity.strength = 5;
                        raycaster.ray.at( floor.distance + offset, object.position )
                        
                    }
                    
                } else {

                    if( gravity.intersection ) gravity.intersection['old'] = getTime();

                    gravity.strength = clamp( gravity.strength + gravity.strength * (delta / 200), 0, 100 );
                    
                    object.position.add(
                        TMP.v3.copy( gravity.direction ).multiplyScalar( gravity.strength * delta / 1000 )
                    );
                    updateCount.add( object );

                }

            }
    
        }
    
        return updateCount;
    
    }

    /** Updates all objects in `scene.maps.JUMP` according to their JumpingVelocityVector every frame.
     * @event `CollisionEvent` When an object is hitting the ceiling, it will dispatch this event and not count as updated.
     * Call cancel() to prevent the ceiling froom correcting this position.
     * @param {number} delta Delta in milliseconds for this frame
     * @return {Set<Object3D>} Set containing all updated objects that jummping has move */
    async updateJumps( delta ){
        
        const updateCount = new Set;

        if( this.enabled.POSITION )
        for( const object of Array.from( this.maps.JUMP.keys() ) ){

            const jump = this.maps.JUMP.get( object );
            
            if( !jump.enabled ) continue;
            // This prevents bouncing, but its not ideal

            const gravity = this.maps.GRAVITY.get( object );

            if( gravity.strength > jump.strength && gravity.intersection ){

                jump.strength = 0;

            }

            // This applies the jump

            if( jump.strength ){

                const bb = this.maps.BOUNDINGBOX.get( object );
                const center = bb ? bb.getCenter( new Vector3 ) : object.position;

                raycaster.set( center, jump.direction );
                raycaster.near = 0;

                const far = raycaster.ray.intersectBox( bb, new Vector3 );
                const dist = jump.height * jump.strength * (delta / 1000);

                raycaster.far = dist + far.distanceTo( center );
                
                const collisions = this.intersectBoundingBoxCollision( object );
                const ceiling = raycaster.intersectObjects( collisions ).find(v => v.object !== object);

                if( !ceiling ){

                    object.position.add( jump.direction.clone().multiplyScalar( dist ) );
                    updateCount.add( object );

                } else {

                    const event = {
                        type: 'collision',
                        origin: object,
                        intersection: jump.intersection
                    } as CollisionEvent;

                    await dispatch( object, event );
                    
                    jump.strength = 0;
                    jump.intersection = ceiling;

                }

            }

        };

        return updateCount;
        
    }

    /** Updates all objects in `scene.maps.POSITION` according to their VelocityVector every frame.
     * @event `CollisionEvent` When an object is hitting a wall, it will dispatch this event and not count as updated.
     * Call cancel() to prevent the wall froom correcting this position.
     * Position _ignores_ the y value (like Unity SimpleMove). Use jump for that.
     * @param {number} delta Delta in milliseconds for this frame
     * @return {Set<Object3D>} Set containing all updated objects whose positions has moved
     */
    async updatePositions( delta:number ){
        
        const updateCount = new Set;

        if( this.enabled.POSITION ){
        for( const object of Array.from( this.maps.POSITION.keys() ) ){

            const add = this.maps.POSITION.get( object );

            if( !add.enabled ) continue;

            //console.log( object, add );
            // Ignore any Y values
            if( add.direction.y !== 0 ) add.direction.y = 0;

            object.position.add( add.direction.clone().multiplyScalar( add.strength * delta / 1000 ) );

            const newQuaternion = new Quaternion().setFromUnitVectors( AXES.Z, add.direction );

            if( add.strength ){

                /* Update all scene.maps.COLLISIONs for this object moving that much here */

                const bb = this.maps.BOUNDINGBOX.get( object );
                const collisions = this.intersectBoundingBoxCollision( object );
                
                for( let i = 0, a = 1; i < a; i++ ){
                    
                    const radian = i / a * RADIAN;
                    const center = bb ? bb.getCenter( new Vector3 ) : object.position.clone();
                    const direction = add.direction.clone().applyQuaternion( TMP.q.setFromAxisAngle( AXES.Y, radian ) )

                    raycaster.set( center.setY( center.y ), direction );
                    raycaster.near = 0;
                    
                    const far = raycaster.ray.intersectBox( bb, new Vector3 ) || center.clone();

                    raycaster.far = add.strength * delta / 1000 + far.distanceTo( center );
                    
                    const forward = raycaster.intersectObjects( collisions ).find(v => v.object !== object);
                    
                    if( forward ){

                        forward[ 'time' ] = getTime();

                        const event = {
                            type: 'collision',
                            intersection: forward,
                            origin: object,
                            ignoreCollision(){ ignoreCollision = true; }
                        } as CollisionEvent;
                    
                        let ignoreCollision = false;

                        await dispatch( object, event );
                        await dispatch( forward.object, event );

                        if( i === 0 ){

                            add.intersection = forward;

                        }
                        
                        if( !ignoreCollision ){

                            const moveBackByDistance = Math.abs( raycaster.far - center.distanceTo( forward.point ) );

                            object.position.sub( direction.multiplyScalar( moveBackByDistance ) );

                        }

                    }  else {

                        add.intersection = null;
                    
                    }  

                }
    

            }
            // Update the upwards position of the target object
            // based on gravity. If no gravity, the object will be returned to AXES.Y

            if( this.enabled.GRAVITY_ADJUST_UP_AXIS ){
                    
                const gravity = this.maps.GRAVITY.get( object );

                if( gravity && gravity.intersection && gravity.strength <  4 ){

                    newQuaternion.setFromUnitVectors(
                        AXES.Y, gravity.intersection.face.normal
                    ).multiply( TMP.q.setFromUnitVectors(
                        AXES.Z, add.direction
                    ) );

                }
                
            }

            object.quaternion.slerp( newQuaternion, delta / 100 );

        }}

        return updateCount;
        
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
            
            await this.updateGravity( delta );
            await this.updatePositions( delta );
            await this.updateJumps( delta );
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

/** Interface for storing information about velocity */
export interface VelocityVector {
    direction: Vector3;
    strength: number;
    enabled: boolean;
    intersection?: Intersection;
}
/** Interface for storing information about jumping */
export interface JumpingVelocityVector extends VelocityVector {
    height: number;
    double: number;
    enabled: boolean;
    allowDoubleJump?: boolean;
    doubleJumpDelay?: number;
    doubleJumpDelayCounter?: number;
}
/** Interface for storing information about gravity */
export interface GravityVelocityVector extends VelocityVector {
    world: Vector3;
}
export interface IntersectionBoxes {
    box1: Box3;
    box2: Box3,
    object1: Object3D,
    object2: Object3D
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
    boxes?: IntersectionBoxes;
    cancelHit?: boolean
}
/** Interface for minimum requirement for LOADINGZONE event */
export interface LoadingZoneEvent extends CollisionEvent {
    boxes: IntersectionBoxes;
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

/** Defines default and global gravity. */
export const GRAVITY = new Vector3( 0, -.98 * 2, 0 );
/** Defines the deoth of the KILLPLANE */
const KILLPLANE_DEPTH = -250;
/** General movement speed of objects (in milliseconds per unit) */
const SPEED_MS_PER_UNIT = 350;
/** Dead zone on thumb sticks */
const THUMBSTICK_TRESHOLD = .1;
/** Trigger treshold for FPS warning */
const FPS_CRITICAL_LIMIT = 30;

/** Contains general 'input' states.
 * Returns boolean if a button, returns Vector2 if an axis. */
export const INPUT_MAPPING = {
    get Shift(){
        
        return (KEYBOARD[ 'ShiftLeft' ] && KEYBOARD[ 'ShiftLeft' ].pressed) || (KEYBOARD[ 'ShiftRight' ] && KEYBOARD[ 'ShiftRight' ].pressed);

    },
    get Action(){
        
        // A, Enter
        
        return (
            (KEYBOARD[ 'Enter' ] && KEYBOARD[ 'Enter' ].pressed)
            || (GAMEPAD && GAMEPAD.buttons[1].pressed)
        );

    },
    get Cancel(){

        // B, Space

        return (
            (KEYBOARD[ 'Space' ] && KEYBOARD[ 'Space' ].pressed)
            || (GAMEPAD && GAMEPAD.buttons[0].pressed)
        );

    },
    get SecondaryAction(){

        // Y
        return (
            (KEYBOARD[ 'KeyY' ] && KEYBOARD[ 'KeyY' ].pressed)
            || (GAMEPADTYPE && GAMEPAD.buttons[2])
        );

    },
    get TertiaryAction(){

        // X
        return (
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
export const AWAITINGFRAMEID = Symbol();

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

/** Tries to limit animation frame calls to the desired framerate to test differences in framerates */
let SIMULATE_FPS = 60;
let FASTFORWARD = 1;
let PAUSED = false;
let INVIEW = false;
let CURRENTLEVEL: string;
let DEVELOPER_ENABLED = !localStorage.getItem( 'developer' );

let DELTA = 0;
let TIME = 0;
let FRAMEID: number|symbol = 0;

let GAMEPADID: string;
let GAMEPADTYPE: string;
let GAMEPAD: Gamepad;


// UTILITIES

/** Helper method to select a query and immediately fills out its text content if provided.
 * @return {HTMLElement} The requested element for further modification.
 */
function setQuerySelectorSetText( query, content?: string ){

    const element = document.querySelector( query );

    if( content !== null && element ) element.textContent = content;

    return element;

}
/** Utility method to get the current timestamp */
export function getTime(){

    return window.performance ? window.performance.now() : Date.now()

}
export function clamp( value: number, ...range: number[] ){

    while( range.length < 2 ) range.push( range.length );

    const min = Math.min( ...range );
    const max = Math.max( ...range );

    return value < min ? min : (value > max ? max : value);

}
export function lerpUnitVectors( vectorA: Vector3, vectorB: Vector3, t: number, inverseAngularDirection = false ){

    const q1 = new Quaternion().setFromUnitVectors( AXES.Z, vectorA );
    const q2 = new Quaternion().setFromUnitVectors( AXES.Z, vectorB );

    if( inverseAngularDirection ) q2.inverse();

    vectorA.copy( AXES.Z ).applyQuaternion( q1.slerp( q2,  t ) );

    return vectorA;

}
/** raycaster returns a raycaster from an object with given targets, return an intersection where:
 *  `intersection.point` also account for the boundingbox of the object. The returned points therefor
 *  qualify as safe places to move to for this object to not intersect with the given targets.
 */
export function raycast( object:Object3D, targets:Object3D[], direction = GRAVITY, near = 0, far = 500 ){

    raycaster.set( object.position, direction );
    raycaster.near = near;
    raycaster.far = far;
    
    return raycaster.intersectObjects( targets, true ).map(target => {

        raycaster.set( target.point, direction );
        
        const intersect = raycaster.ray.intersectBox( TMP.b3.setFromObject( object ), new Vector3 );

        if( intersect ) target.point.sub( intersect.sub( target.point ) );

        return target;

    });

}
export async function slide( object:Object3D, from:Vector3, to:Vector3, duration:number, onProgress?:Function ){

    return new Promise(resolve => {
            
        const helper = new Object3D;

        let progress = 0;

        object.position.copy( from )
        scene.value.maps.UPDATE.add( helper );

        helper.addEventListener( 'update', e => {

            progress += e.delta;

            object.position.copy( from ).lerp( to, clamp(progress / duration) );

            if( progress > duration ){

                scene.value.removeFromMaps( helper );
                resolve();

            } else if( onProgress ){

                onProgress();

            }

        });

    });

}
export async function slideIn( object:Object3D, durationPerUnit = 1000 ){

    const to = object.position.clone();
    const from = object.position.clone();
    const size = Math.max( ...TMP.b3.setFromObject( object ).getSize( TMP.v3 ).toArray() );
    
    from.y -= size;

    return slide( object, from, to, size * durationPerUnit );

}

export const UTILITIES = {
    getTime,
    clamp,
    lerpUnitVectors
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
export async function countDistance( character: Object3D, distance: number ){

    const previousPosition = character.position.clone();

    let progress = 0;

    return whentrue(function(){

        progress += character.position.distanceTo( previousPosition );
        previousPosition.copy( character.position );

        if( progress > distance ) return distance;

    });

}
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

export const afterFrameStep = new Set<(delta:number)=>boolean|void>();

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

    const type = document.querySelector( '#gamepad-type' );

    if( type && type !== 'generic' ){

        type.querySelector( 'option[selected]' ).selected = false;
        type.querySelector( 'option[value="' + GAMEPADTYPE + '"]' ).selected = true;

    }

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

            const playerWorld = getWorldPosition( warp );

            player.position.copy( player.parent.worldToLocal( playerWorld ) );
            player.quaternion.copy( warp.quaternion );

            const grav = scene.value.maps.GRAVITY.get( player );
            const jump = scene.value.maps.JUMP.get( player )

            if( grav ) grav.strength = 0.05;
            if( jump ) jump.strength = 0;
            
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
export async function start(){

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
export async function pause(){

    PAUSED = true;

    if( FRAMEID && FRAMEID !== AWAITINGFRAMEID ){
        
        window.cancelAnimationFrame( FRAMEID as number );

        FRAMEID = null;

    }

    document.body.classList.add( 'paused' );

    await new Promise(r => window.requestAnimationFrame(r));

}
export async function globalRendererFadeOut(){

    document.body.classList.add( 'fadeout' );

    await delay(1000);

}
export async function globalRendererFadeIn(){

    document.body.classList.remove( 'fadeout' );

    await delay(1000);

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
    const content: HTMLSpanElement = (span.children[0] || span.appendChild( document.createElement( 'span') )) as ;
    
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

        await delay( options.duration || content.innerHTML.split( ' ' ).length * 20 );
        
        if( options.onShow ) await options.onShow( event );

        if( options.dismissWithButtons.length ){

            span.classList.add( 'ready' );

            await Promise.all(options.dismissWithButtons.map(action => {
                return whentrue(() => !INPUT_MAPPING[action])
            }));

            if( span.parentNode !== ui ) break conversation;

            await Promise.race(options.dismissWithButtons.map(action => {
                return whentrue(() => INPUT_MAPPING[action]);
            }).concat([
                new Promise(resolve => {

                    const click = e => {

                        if( !PAUSED && INVIEW ){

                            e.preventDefault();
                            resolve();

                        } else {

                            document.addEventListener( 'click', click, { once: true })

                        }

                    }

                    document.addEventListener( 'click', click, { once: true })

                })
            ]));

            if( span.parentNode !== ui ) break conversation;

        }

        if( options.choice.length ){

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
                                selected = Array.from( choicesList.children ).indexOf( event.target );
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

        }

        options.disable.forEach((term, index) => scene.enabled[term] = enabledBefore[index]);

        if( options.className ) span.classList.remove( ...options.className );

        if( options.onHide ) await options.onHide( event );
        
    }

    span.remove();

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

const intersectionObserver = new IntersectionObserver(entries => {

    if( !PAUSED && entries[0].intersectionRatio <= 0 ) pause();
    else if( PAUSED && entries[0].intersectionRatio > .0 ) start();

    INVIEW = entries[0].intersectionRatio > 0;

});

intersectionObserver.observe( renderer.domElement );

const renderPass = new RenderPass( new Scene, new PerspectiveCamera );

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

/** Switch the renderes camera to this camera */

export const scene = new BehaviorSubject<Scene>( renderPass.scene as Scene );
export const camera = new BehaviorSubject<Camera>( renderPass.camera as Camera );
export const warp = new BehaviorSubject<Object3D>( null );
export const saveFile = new BehaviorSubject<SaveFile>({ customData: {} });

scene.subscribe( onResize );
scene.subscribe( scene => {
    
    if( scene ){

        renderPass.scene = scene;
        
    }
    
});

camera.subscribe( onResize );
camera.subscribe( camera => renderPass.camera = camera );

warp.subscribe( onWarpChange );

/** When called for a scene, returns a bunch of useful methods to set up quick and simple scenes. */
export const LEVELUTILITIES = function( scene: Scene, saveData:any = {} ){

    const gltfLoader = new GLTFLoader;
    const makers = {};
    const dustCloudGeometry = gltfLoader.loadAsync( './models/dustcloud.glb' ).then(glb => {

        let geometry;

        glb.scene.traverse(f => {

            if( f instanceof Mesh ) geometry = f.geometry;

        });

        return geometry;

    });
    
    async function dustCloud( position: Vector3, size = .5, duration = 1000, color: string|number|Color = 'white', alpha = 1, reverse = false ){

        // Only if we have decent FPS
        if( FPS.average < FPS.critical ) return;
        
        dustCloudGeometry.then(geometry => {

            const cloud = new Mesh( geometry, new MeshPhongMaterial({
                color,
                transparent: true,
                emissive: new Color( color ),
                emissiveIntensity: .5,
                opacity: 1
            }));
            const startPosition = position.clone();
    
            let progress = 0;
    
            cloud.rotation.set( Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
            cloud.position.copy( position );
            cloud.scale.set( size, size, size );
    
            scene.maps.UPDATE.add( cloud );
            scene.add( cloud );
    
            cloud.addEventListener( 'update', e => {
    
                progress += e.delta;
    
                const p = clamp( progress / duration );
    
                if( p === 1 ){
    
                    scene.removeFromMaps( cloud );
                    scene.remove( cloud );
    
                } else {
    
                    cloud.material.opacity = (1-p) * alpha;
                    cloud.position.y = startPosition.y + size * p * 2 * (reverse ? -1 : 1);
    
                }
    
            });

        })

    }
    async function shiningObject( object:Object3D, colors?: Array<Color|string|number> ){

        const group = new Group;

        colors = colors || [ 'white', 'gold' ].map(c => new Color( c ));

        for( let i = 0, l = colors.length; i < l; i++ ){

            const shine = new Sprite( new SpriteMaterial({
                color: colors[i],
                alphaMap: new TextureLoader().load( './models/shine.png' ),
                //alphaMap: null,
                rotation: 0,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0
            }) );
            const clockwise = i % 2 === 1;
            const duration = Math.random() * 4000 + 3000;

            scene.maps.UPDATE.add( shine );

            const scale = (1 - i / l) * 5 + 1;

            shine.scale.set( scale, scale, scale );
            shine.addEventListener( 'update', (event:UpdateEvent) => {
                
                const dif = event.delta / duration * RADIAN;

                shine.material.rotation += clockwise ? dif : -dif;
                shine.material.opacity = clamp( shine.material.opacity + event.delta / 400 );

            });

            group.add( shine );

        }

        object.add( group );

        return group;

    }

    function replaceObject( object:Object3D, newObject:Object3D ){

        newObject.position.copy( object.position );
        newObject.quaternion.copy( object.quaternion );
        newObject.scale.copy( object.scale );
        newObject.userData = object.userData;

        object.parent.add( newObject );
        object.parent.remove( object );
        
        return newObject;

    }

    /**
     * Load a .glb file and apply all the flags and makers that are defined on the mesh foremost, the material second. You can pass in your own flag processing or makers using an object with string keys and Function values.
     * 
     * ## Flags:
     * - `obstruct` If found, considers that object an obstruction to the camera
     * - `collision` If found, considers that object an object that is part of collisions
     * - `warp` If found, considers that object to be a warp. (`userData.warp`)
     * - `hit` If found, this object can receive hit events from any object.
     * - `invisible` If found, marks the object as invisible. Other flags still apply.
     * - `loadingzone` If found, marks the Box3 around it as a loading zone when a PLAYER enters it. (`userData.level` Name of level defined in `core.js`, `userData.warp` Warp location to place player at (defined by FLAG.warp))
     * - `water` If found, renders the area with a water effect and resets the player to a safe space if it enters the Box3 around it.
     * - `interact` If found, adds the object to INTERACTABLE so it can receive interact events.
     * 
     * ## Makers:
     * - `SmackerVine` If found, loads the routines and object data for a SmackerVine
     * - `MainCollectible` If found, loads the routines and object data for the MainCollectible
     * 
     * @param source Path to GLB File
     * @param bindToScene optional Scene to bind update events to
     * @param additionalFlags optional Check if the object is flagged, call related mthod
     * @param additionalMakers  optional Check if the object can have maker methods, call related mthod
     */
    async function loadGLTFMap(
        source,
        bindToScene?: Scene,
        additionalFlags?:{[key:string]:Function},
        additionalMakers?:{[key:string]:Function}
    ){

        const level = await new GLTFLoader().loadAsync( source );
        const objects = new Array<Object3D>();
        
        level.scene.updateMatrixWorld();
        level.scene.traverse(object => objects.push( object ));

        for( let object of objects ){
            
            const options: any = {};

            if( object["material"] ){
                
                Object.assign( options, object["material"].userData );
            
            }

            Object.assign(options, object.userData);

            const _makers: any[] = (options.MAKERS && options.MAKERS.split( ',' )) || [];

            for( let maker of _makers ){

                let newObject: Object3D;

                if( additionalMakers && additionalMakers[maker] ){

                    newObject = await additionalMakers[maker]( object, scene, options );

                } else if( makers[maker] ){

                    newObject = await makers[maker]( object, scene, options ) as Object3D;

                } else {

                    console.warn( `Cannot evaluate maker '${maker}'` );

                }

                if( newObject && newObject !== object ){
                    
                    // newObject.position.copy( object.position );
                    // newObject.quaternion.copy( object.quaternion );
                    // newObject.scale.copy( object.scale );

                    // object.parent.add( newObject );
                    // object.parent.remove( object );
                    object = replaceObject( object, newObject );

                    if( bindToScene ) bindToScene.maps.UPDATE.add( newObject );

                }

            }

            const _flags: any[] = (options.FLAGS && options.FLAGS.split( ',' )) || [];

            if( _flags.indexOf( 'glb' ) >= 0 ){

                object = await loadGLTFMap( options.glb );

            }

            for( let flag of _flags ){

                if( additionalFlags && additionalFlags[flag] ){

                    await additionalFlags[flag]( object, scene );
                    continue;

                }
                
            }

            object.userData = options;

        }

        return level;

    }

    return {
        loadGLTFMap,
        loadLevel,
        shiningObject,
        dustCloud,
        replaceObject
    };

};

// REGISTER LEVELS
// This is done because Parcel will otherwise not allow deferred import statements.
// You need to define all available scripts here.

LEVEL_MODULES[ 'Titlescreen' ] = import( './levels/titlescreen' );