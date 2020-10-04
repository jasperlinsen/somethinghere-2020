// https://stackoverflow.com/questions/27846392/access-microphone-from-a-browser-javascript

import { clamp } from "./general";

let CONTEXT: AudioContext;
let STREAM: MediaStream;
let GAIN: GainNode;
let MICROPHONE: MediaStreamAudioSourceNode;
export let ACCESS: boolean = false;
let ACCESS_TIME: number = 0;
let ACTIVE: boolean = false;
let ANALYSER: AnalyserNode;
let ANALYSER_DATA: Uint8Array; 
let WIDTH: number = 200;
let HEIGHT: number = 200;

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

    if( CONTEXT ){
        
        ACTIVE = false;
        STREAM.getTracks().forEach(track => track.stop());
        STREAM = null;
        ANALYSER = null;

        CONTEXT.close().then(() => {
            
            CONTEXT = null;

        });

    }

}
export async function start( withMessage?:string, withWidth?: ){

    return new Promise((resolve, reject) => {

        if( requestAPIAccess( withMessage ) && !CONTEXT ){

            function onStreamReady( stream ){

                ACTIVE = true;
                CONTEXT = new (window.webkitAudioContext || window.AudioContext)();
                STREAM = stream;

                GAIN = CONTEXT.createGain();
                MICROPHONE = CONTEXT.createMediaStreamSource( stream );

                GAIN.gain.setValueAtTime( 0, CONTEXT.currentTime );

                ANALYSER = CONTEXT.createAnalyser();
                ANALYSER.smoothingTimeConstant = .06;
                ANALYSER.fftSize = 256;
                ANALYSER_DATA = new Uint8Array( ANALYSER.frequencyBinCount );

                GAIN.connect( CONTEXT.destination );
                MICROPHONE.connect( GAIN );
                MICROPHONE.connect( ANALYSER );
                ANALYSER.connect( GAIN );

                resolve();

            }

            const constraints = { audio:true };

            if( navigator.getUserMedia ) navigator.getUserMedia( constraints, onStreamReady, reject );
            else if( navigator.mediaDevices.getUserMedia ) navigator.mediaDevices.getUserMedia( constraints ).then( onStreamReady, reject );

        }

    });

}
export function setPathAttributes( attributes:any ){

    svgPathAttributes = '';

    for( const key in attributes ){

        svgPathAttributes += ` ${key}="${attributes[key]}"`;

    }

}
export function setSize( width:number, height:number ){

    WIDTH = width || WIDTH;
    HEIGHT = height || HEIGHT;

}

function updateAudioFrame(){

    if( ANALYSER && ACTIVE ){

        ANALYSER.getByteFrequencyData( ANALYSER_DATA );

        const PADD = 24;
        const coordinates = ANALYSER_DATA.reduce((r,v,i) => {

            const x = i / ANALYSER_DATA.length * WIDTH
            const y = PADD + ((v / 256  * 2 - 1) * (HEIGHT - PADD * 2)) + HEIGHT / 2;
            
            r.push( `${x.toFixed(1)} ${y.toFixed(1)}` );
            
            return r;

        }, []);

        const svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}px" height="${HEIGHT}px" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M ${coordinates.join( ' L')}" ${svgPathAttributes} />
        </svg>`;

        const url = `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(svg.trim())}")`;
        const max = clamp( Math.max( ...ANALYSER_DATA.slice( 50 )  ) / ANALYSER.frequencyBinCount ).toString();

        document.body.style.setProperty( '--audio-input-svg', url );
        document.body.style.setProperty( '--audio-input-max', max );

    }

    window.requestAnimationFrame( updateAudioFrame );

}

window.requestAnimationFrame( updateAudioFrame );