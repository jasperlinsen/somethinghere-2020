import * as AUDIOVISUAL from "./ts/audio-visualisation";
import { loadLevel } from "./ts/header";
import { initContent, initPage } from  "./ts/page";

document.addEventListener( 'DOMContentLoaded', event => {

    loadLevel( 'Titlescreen' );

    const voiceIllustration = document.getElementById( 'voice-illustration' );

    voiceIllustration.addEventListener( 'click', (event:MouseEvent) => {
        
        if( AUDIOVISUAL.requestAPIAccess() && voiceIllustration.classList.toggle( 'active' ) ){

            AUDIOVISUAL.setPathAttributes({
                stroke: 'white',
                ['stroke-width']: '2px',
                fill: 'none',
                ['stroke-linecap']: 'round',
            });
            AUDIOVISUAL.start();

        } else {


            AUDIOVISUAL.stop();

        }

    })

});

initPage();
initContent( document.body );