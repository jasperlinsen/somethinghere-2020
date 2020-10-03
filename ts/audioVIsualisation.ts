
const BUFFER_SIZE = 16384;

let CONTEXT;
let active = true;
let audioAccess = false;

export function stopAudioVisual(){

    active = false;

}
export function startAudioVisual(){

    if( !audioAccess ){

        navigator.getUserMedia({ audio:true }, stream => {

            audioAccess = true;
            CONTEXT = new AudioContext();

            const gain = CONTEXT.createGain();

            gain.connect( CONTEXT.destination );
            gain.gain.setValueAtTime( 0, CONTEXT.currentTime );

            const microphone = CONTEXT.createMediaStreamSource( stream );
            
            microphone.connect( gain );

            const fft = CONTEXT.createScriptProcessor( 2048, 1, 1 );
            
            fft.connect( gain );

            const analyser = CONTEXT.createAnalyser();

            analyser.smoothingTimeConstant = 0;
            analyser.fftSize = 256;

            microphone.connect( analyser );

            analyser.connect( fft );

            fft.addEventListener( 'audioprocess', event => {

                if( active ){
                    
                    // get the average for the first channel
                    var array = new Uint8Array( analyser.frequencyBinCount );
                    
                    analyser.getByteFrequencyData( array );

                    const max = Math.max( ...array.map(a => Math.abs(a)) );
                    const clip = `polygon(0 100%, ${array.reduce((r,v,i,a) => {

                        const x = (i / a.length) * 100;
                        const y = 100 - (v / max) * 100;

                        r.push( `${x.toFixed()}% ${y.toFixed()}%` );

                        return r;

                    }, []).join( ', ')}, 100% 100%, 0% 100% )`;

                    document.body.style.setProperty( '--audio-input-clip', clip );


                }

            });

        }, error => {

            console.error( error );

        });

    }

    active = true;

}