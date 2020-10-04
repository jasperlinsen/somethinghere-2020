import { AudioAnalyser } from "three";

let CONTEXT: AudioContext;
let STREAM: MediaStream;
export let ACCESS: boolean = false;
let ACCESS_TIME: number = 0;
let ACTIVE: boolean = false;
let ANALYSER: AnalyserNode;
let ANALYSER_DATA: Uint8Array; 

let svgPathAttributes = 'stroke="red" stroke-width="1px" fill="none"';

export function requestAPIAccess( withMessage?:string ){

    const now = Date.now();

    if( ACCESS_TIME < now - 1000 ){

        ACCESS_TIME = now;
        ACCESS = ACCESS || confirm( withMessage || `You'll need to grant access to the microphone.\
        We will not collect any of the data, although using speech recognition might usee external serevers based on your Browser.` );

    }

    return ACCESS;

}
export function stop(){

    if( CONTEXT && STREAM ){
        
        ACTIVE = false;
        STREAM.getTracks().forEach(track => track.stop());
        STREAM = null;
        ANALYSER = null;

        CONTEXT.close().then(() => {
            
            CONTEXT = null;

        });

    }

}
export function start( withMessage?:string ){

    if( requestAPIAccess( withMessage ) && !CONTEXT && !STREAM ){

        navigator.getUserMedia({ audio:true }, stream => {

            ACTIVE = true;
            CONTEXT = new AudioContext();
            STREAM = stream;

            const gain = CONTEXT.createGain();
            const microphone = CONTEXT.createMediaStreamSource( stream );

            gain.connect( CONTEXT.destination );
            gain.gain.setValueAtTime( 0, CONTEXT.currentTime );

            microphone.connect( gain );

            ANALYSER = CONTEXT.createAnalyser();
            ANALYSER.smoothingTimeConstant = .06;
            ANALYSER.fftSize = 256;
            ANALYSER_DATA = new Uint8Array( ANALYSER.frequencyBinCount );

            microphone.connect( ANALYSER );
            ANALYSER.connect( gain );

        }, error => {

            console.error( error );

        });


    }

}
export function setPathAttributes( attributes:any ){

    svgPathAttributes = '';

    for( const key in attributes ){

        svgPathAttributes += ` ${key}="${attributes[key]}"`;

    }

}

function updateAudioFrame(){

    if( ANALYSER && ACTIVE ){
                        
        ANALYSER.getByteFrequencyData( ANALYSER_DATA );

        const svg = `<svg viewBox="0 0 ${ANALYSER_DATA.length} ${128}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M ${ANALYSER_DATA.reduce((r,v,i) => {

                r.push( `${ANALYSER_DATA.length - i} ${v}` );

                return r;

            }, []).join( ' L ')}" ${svgPathAttributes} />
        </svg>`;

        const url = `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(svg.trim())}")`;

        document.body.style.setProperty( '--audio-input-svg', url );

    }

    window.requestAnimationFrame( updateAudioFrame );

}

window.requestAnimationFrame( updateAudioFrame );