import { MathUtils, Quaternion } from "three";
import { RADIAN, SETTINGS, AXES, TMP } from "./constants";

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
/** Utility methods that returns a random rgb() color string */
export function randomColor(){

    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);

    return `rgb(${r},${g},${b})`;

}

export function animateScrollBody( toElement:HTMLElement, duration ?: number ){

    return new Promise(resolve => {

        const start = document.body.scrollTop || document.documentElement.scrollTop || 0;
        const end = toElement.getBoundingClientRect().top + start - innerHeight / 3
        
        let progress = 0;
        let time = 0;
        
        duration = duration || Math.abs(end - start) * 10;
        duration = document.body.classList.contains( 'accessibility-enabled' ) ? 0 : duration;

        function animate( t ){

            if( time === 0 ){
                
                time = t;
            
            } else {

                progress += (t - time);

                document.body.scrollTop = document.documentElement.scrollTop = MathUtils.lerp( start, end, Math.pow(progress / duration, 2) )

            }

            if( progress < duration ){
                
                window.requestAnimationFrame( animate )

            } else {

                document.body.scrollTop = document.documentElement.scrollTop = end;
                toElement.setAttribute( 'tabindex', '1' );
                toElement.focus();
                toElement.removeAttribute( 'tabindex' );
                resolve();
                
            }

        }

        window.requestAnimationFrame( animate );

            
    });

}
export function phoney(){

    // Confuse the JS parsers a bit!
    // No bots please.
    const start = '971';
    const end = 5678 - 1;

    return `+1 (${start})570-${end}`;

}
export function mailey(){

    // Confuse the JS parsers a bit!
    // No bots please.
    return `hello${'at'.replace('at','@')}somethinghere.net‬${"" || '?' + ''}subject=Hello`;

}