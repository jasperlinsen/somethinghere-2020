import { connectableObservableDescriptor } from "rxjs/internal/observable/ConnectableObservable";

const BUFFER_SIZE = 16384;

let CONTEXT;
let analyser;
let active = true;
let audioAccess = false;
let svgPathAttributes = 'stroke="red" stroke-width="1px" fill="none"';

export function stopAudioVisual(){

    active = false;

}
export function startAudioVisual(){

    if( !audioAccess ){

        navigator.getUserMedia({ audio:true }, stream => {

            audioAccess = true;
            CONTEXT = new AudioContext();

            const gain = CONTEXT.createGain();
            const microphone = CONTEXT.createMediaStreamSource( stream );

            analyser = CONTEXT.createAnalyser();

            gain.connect( CONTEXT.destination );
            gain.gain.setValueAtTime( 0, CONTEXT.currentTime );

            microphone.connect( gain );

            analyser.smoothingTimeConstant = .06;
            analyser.fftSize = 256;

            microphone.connect( analyser );
            analyser.connect( gain );

        }, error => {

            console.error( error );

        });

    }

    active = true;

}
export function setPathAttributes( attributes:any ){

    svgPathAttributes = '';

    for( const key in attributes ){

        svgPathAttributes += ` ${key}="${attributes[key]}"`;

    }

}

function updateAudioFrame(){

    if( analyser && active ){
                        
        const array = new Uint8Array( analyser.frequencyBinCount ); 

        analyser.getByteFrequencyData( array );

        const half = Math.max( ...array.map(a => Math.abs(a)) );
        const svg = `<svg viewBox="0 0 ${array.length} ${128}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M ${array.reduce((r,v,i) => {

                r.push( `${array.length - i} ${v}` );

                return r;

            }, []).join( ' L ')}" ${svgPathAttributes} />
        </svg>`;

        const url = `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(svg.trim())}")`;

        document.body.style.setProperty( '--audio-input-svg', url );

    }

    window.requestAnimationFrame( updateAudioFrame );

}

window.requestAnimationFrame( updateAudioFrame );