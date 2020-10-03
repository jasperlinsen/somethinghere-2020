import * as VISUAL from "./audio-visualisation";
import { randomColor } from "./general";

const speechRecognition: Function = window['webkitSpeechRecognition'] || window['SpeechRecognition'];
const speechGrammarList: Function = window['webkitSpeechGrammarList'] || window['SpeechGrammarList'];

export function initVoiceSearch( searchWrapper: HTMLElement ){

    if( !searchWrapper ) return;

    const searchInput: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( 'input' ) : null;
    const searchResults: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( '.results' ) : null;
    const searchTips: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( '.tips' ) : null;

    if( searchInput ){

        /** Input Textbox Event Listener */
        function onChange(){

            searchResults.innerHTML = '';

            const parser = new DOMParser();

            let count = 0;
        
            Array.from( document.querySelectorAll( 'section, aside' ) ).map((section:HTMLElement) => {

                if( count <= 3 && searchInput.value.trim().length > 2 ){

                    const text = section.textContent;
                    const find = searchInput.value;
                    
                    const result = new Set( text.match( new RegExp( `.+${find}.+`, 'gi' ) ) || [] );

                    result.forEach((r, i) => {

                        const li = parser.parseFromString( `
                            <li tabindex="0" aria-label="Click to go to result #${i}">${r.replace( new RegExp( find, 'gi' ), f => `<span class="highlight">${f}</span>`).slice( 0, 100 )}</li>
                        `, 'text/html' ).querySelector( 'li' )
                        const hit = li.querySelector( 'span' );

                        searchResults.appendChild( li );

                        if( hit ) hit.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'center' });
                        
                        li.addEventListener( 'click', event => {

                            event.preventDefault();

                            searchInput.blur();
                            li.blur();

                            animateScrollBody( section );

                        });
                        li.addEventListener( 'focus', eveent => {

                            searchTips.innerText = TIPS.result;

                        });

                        count++;

                    });

                }

            })

            searchResults.classList.toggle( 'empty', !count );

            if( count > 3 ) onEnd();

        }
        function onKeydown( event:KeyboardEvent ){

            if( searchInput ){
                
                switch( event.code ){
                    case 'KeyF': if( event.metaKey ){

                        event.preventDefault();
                        searchInput.focus();
                        onInit();

                    } break;
                    case 'Escape': {
                        event.preventDefault();
                        searchInput.blur();
                    } break;
                    case 'Enter': if( document.activeElement && document.activeElement.closest( '.results' ) ){
                            
                        event.preventDefault();
                        (document.activeElement as HTMLElement).click();

                    } else if( searchInput === document.activeElement ){
                        
                        event.preventDefault();
                        onInit();

                    } break;
                    case 'Soace': if( document.activeElement && document.activeElement.closest( '.results' ) ){

                        event.preventDefault();
                        (document.activeElement as HTMLElement).click()

                    } break;
                    default: if( grammarRecognition && (event.code.startsWith( 'Key' ) || event.code === 'Space') ){

                        event.preventDefault();
                        onEnd();

                    } break;
                }
        
            }

        }
        
        /** Speech Regonition Event Listener */
        function onResult( event:SpeechRecognitionEvent ){

            searchInput.value = event.results[0][0].transcript;
            onChange();  
            
            if( event.results[0].isFinal ){

                onEnd();

            }

        }
        function onStart( event: SpeechRecognitionEvent ){

            document.body.classList.add( 'speech-recognition' );

            const color = randomColor();

            searchTips.innerText = TIPS.during;
            searchInput.style.setProperty( '--accent', color );

            VISUAL.setPathAttributes({
                stroke: color,
                fill: 'none'
            });
            VISUAL.startAudioVisual();

        }
        function onEnd(){

            document.body.classList.remove( 'speech-recognition' );
            
            if( grammarRecognition ) grammarRecognition.stop();
            
            grammarRecognition = null;

            searchTips.innerText = TIPS.start;

            VISUAL.stopAudioVisual();

        }
        function onFocus(){

            searchTips.textContent = TIPS.focus;

        }
        function onInit(){

            if( speechRecognition ){

                hasConfirmedAccess = hasConfirmedAccess === null
                    ? confirm( `${TIPS.confirmHeader}
    ${TIPS.confirmContent}` )
                    : hasConfirmedAccess;
                
                if( hasConfirmedAccess &&  !grammarRecognition ){

                    const recognition: SpeechRecognition = new speechRecognition();
                    const grammarSet = new Set<string>();
                    const grammarList: SpeechGrammarList = new speechGrammarList();
                    
                    grammarRecognition = recognition;

                    Array.from( document.querySelectorAll( 'section, aside' ) ).map(section => {

                        section.textContent.split( ' ' ).forEach(s => grammarSet.add( s.toLowerCase() ));

                    });
                    
                    grammarList.addFromString(`'#JSGF V1.0; grammar colors; public <color> = ${Array.from( grammarSet ).join( ' | ')};`);

                    recognition.grammars = grammarList;
                    recognition.continuous = true;
                    recognition.lang = 'en-US';
                    recognition.interimResults = true;
                    recognition.maxAlternatives = 1;
                    recognition.addEventListener( 'result', onResult );
                    recognition.addEventListener( 'start', onStart );
                    recognition.addEventListener( 'end', onEnd );
                    recognition.start();

                } else if( grammarRecognition ){

                    grammarRecognition.stop();

                }

            }
            
        }

        const TIPS = {
            focus: `Press Escape to Leave, type to search, press Tab to go through results.`,
            start: `Press Enter to start voice search.`,
            during: `Speak now or press any key to cancel.`,
            result: `Press Enter to go to this result.`,
            confirmHeader: 'Do you want to enable Speech Search?',
            confirmContent: 'Speech Search might make use of external services to recognise speed based on your Browser.'
        };
        
        let grammarRecognition: SpeechRecognition;
        let hasConfirmedAccess = null;

        document.addEventListener( 'keydown', onKeydown );
        searchInput.addEventListener( 'input', onChange );
        searchInput.addEventListener( 'focus', onFocus );
        searchWrapper.addEventListener( 'focusout', onEnd );

        searchTips.textContent = TIPS.focus;

    }

}