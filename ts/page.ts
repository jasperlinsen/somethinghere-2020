import { delay, randomColor, animateScrollBody, mailey, phoney } from "./general";
import "./gamepad-cursor";
import "./audioVIsualisation";
import { startAudioVisual, stopAudioVisual } from "./audioVIsualisation";

export function initContent( rootElement:HTMLElement ){

    rootElement.querySelectorAll( '.accessibility-toggle' ).forEach((toggle: HTMLInputElement, i, allToggles) => {

        toggle.checked = localStorage.getItem( 'accessibility-enabled' ) === 'true';
        toggle.addEventListener( 'change', event => {

            localStorage.setItem( 'accessibility-enabled', toggle.checked.toString() );
            
            allToggles.forEach((otherToggle:HTMLInputElement) => {

                otherToggle.checked = toggle.checked;

            });

            document.body.classList.toggle( 'accessibility-enabled', toggle.checked );

        });

    });
    rootElement.querySelectorAll( '.disabled' ).forEach(link => {

        link.addEventListener( 'click', async event => {

            event.preventDefault();

            link.classList.add( 'click' );

            await new Promise(r => link.addEventListener( 'animationend', r, { once: true }));

            link.classList.remove( 'click' );

        });

    });
    rootElement.querySelectorAll( 'a[href^="#"]' ).forEach(link => {

        let element: HTMLElement;

        try { element = document.querySelector( link.getAttribute( 'href') )}
        catch(e){}

        if( element ) link.addEventListener( 'click', () => animateScrollBody( element ));
        link.addEventListener( 'click', event => event.preventDefault());


    });
    rootElement.querySelectorAll( 'a[href^="http"]' ).forEach(link => {

        link.setAttribute( 'target', '_blank' );

    });
    rootElement.querySelectorAll( 'a[href="tel:sorry-needs-javascript"]' ).forEach(tel => {

        tel.setAttribute( 'href', `tel:${phoney()}` );

    });
    rootElement.querySelectorAll( 'a[href="mailto:sorry-needs-javascript"]' ).forEach(tel => {

        tel.setAttribute( 'href', `mailto:${mailey()}` );

    });
    rootElement.querySelectorAll( 'a[href="twitter:sorry-needs-javascript"]' ).forEach(tel => {

        tel.setAttribute( 'href', `twitter:@jasperlinsen` );

    });
    rootElement.querySelectorAll( '.full-year' ).forEach(year => {

        year.textContent = '2018-' + new Date().getFullYear().toString();

    });
    rootElement.querySelectorAll( 'blockquote' ).forEach(quote => {

        quote.addEventListener( 'click', event => {

            document.querySelectorAll( 'blockquote' ).forEach(q => {

                if( quote !== q ) q.classList.remove( 'expanded' );

            });

            quote.classList.toggle( 'expanded' );

        });

    });
    rootElement.querySelectorAll( '.gallery' ).forEach(async (gallery:HTMLElement, index:number) => {

        const images: HTMLImageElement[] = Array.from( gallery.querySelectorAll( 'img' ) );
        const rotateGallery = () => gallery.style.setProperty( '--rotate', (Math.random() * 8 - 4).toFixed(3) + 'deg' );
        
        await delay( 500 * index );
        
        gallery.addEventListener( 'mouseenter', rotateGallery );

        while( true ) for( let img of images ){

            img.classList.add( 'selected' );

            await Promise.race([
                delay( parseInt( gallery.getAttribute( 'duration' ) || '5000' ) ),
                new Promise(resolve => img.addEventListener( 'click', event => {

                    resolve();
                    rotateGallery();

                }, { once: true }))
            ]);

            img.classList.remove( 'selected' );

        }

    });
    rootElement.querySelectorAll( '.svg-replace' ).forEach(image => {

        if( image instanceof HTMLImageElement ){

            const bb = image.getBoundingClientRect();
            const id = image.id || (image.closest( '[id]' ) || image).id;

            fetch( image.src ).then(r => r.text()).then(text => {

                const svgDocument = new DOMParser().parseFromString( text, 'image/svg+xml' );
                const svg = svgDocument.querySelector( 'svg' );

                svg.setAttribute( 'class', image.className );
                svg.setAttribute( 'id', image.id );
                svg.setAttribute( 'width', bb.width + 'px' );
                svg.setAttribute( 'height', bb.height + 'px' );
                svg.setAttribute( 'title', image.alt || '' );

                svg.classList.remove( 'svg-replace' );

                // Give a localised namespaced id based on the closest ID to this image

                const changedIdMap = {};

                svg.querySelectorAll( '[id]' ).forEach(element => {

                    const newId = id + '-' + element.id;

                    changedIdMap[ element.id ] = newId;

                    element.id = id + '-' + element.id;

                });
                svg.querySelectorAll( '[clip-path]' ).forEach(clip => {

                    const oldId = clip.getAttribute( 'clip-path' ).split( '#' ).pop().split( ')' ).shift();
                    const newId = changedIdMap[oldId];

                    clip.setAttribute( 'clip-path', `url(#${newId})`);

                })
                svg.querySelectorAll( '[style]' ).forEach(element => {

                    element.getAttribute( 'style' ).split( /\;/g ).forEach(attribute => {

                        const [ key, value ] = attribute.split( ':' );

                        if( key && value ) element.setAttribute( key, value );

                    });
                    element.removeAttribute( 'style' );

                });

                image.parentNode.insertBefore( svg, image );
                image.remove();

            });

        }

    });
    rootElement.querySelectorAll( '.illustration' ).forEach((illustration:HTMLElement) => {

        illustration.addEventListener( 'click', async function( event ){

            const clickEffect = document.createElement( 'span' );
            const lastColor = illustration.style.getPropertyValue( '--accent' );
            
            clickEffect.setAttribute( 'role', 'presentation' );
            clickEffect.classList.add( 'click-effect' );
            clickEffect.style.setProperty( '--accent', lastColor );
        
            illustration.style.setProperty( '--accent', randomColor() );
            illustration.style.setProperty( '--accent-alt', randomColor() );
            illustration.appendChild( clickEffect );
        
            await new Promise(resolve => clickEffect.addEventListener( 'animationend', resolve ));
        
            clickEffect.remove();
        
        });
        
    });
    rootElement.querySelectorAll( '.intersect, .illustration, blockquote, pre, code, ul, li' ).forEach((intersect:HTMLElement) => {

        new IntersectionObserver(entries => {

            intersect.classList.toggle( 'no-animate', entries[0].intersectionRatio <= 0 );

        }).observe( intersect );

    });
    
    
}
export function initPage(){

    const speechRecognition: Function = window['webkitSpeechRecognition'] || window['SpeechRecognition'];
    const speechGrammarList: Function = window['webkitSpeechGrammarList'] || window['SpeechGrammarList'];
    const searchWrapper: HTMLElement = document.getElementById( 'search' );
    const searchInput: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( 'input' ) : null;
    const searchResults: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( '.results' ) : null;
    const searchTips: HTMLInputElement = searchWrapper ? searchWrapper.querySelector( '.tips' ) : null;
    
    if( localStorage.getItem( 'accessibility-enabled' ) === 'true' ){

        document.body.classList.add( 'accessibility-enabled' );

    }

    document.addEventListener( 'DOMContentLoaded', event => {

        const script = document.createElement( 'script' );

        script.async = true;
        script.addEventListener( 'load', function(){

            // @ts-ignore
            window.dataLayer = window.dataLayer || [];
            // @ts-ignore
            function gtag(){ dataLayer.push( arguments ); }
            // @ts-ignore
            gtag('js', new Date());
            // @ts-ignore
            gtag('config', 'UA-26289329-2');
                
        });
        script.src = 'https://www.googletagmanager.com/gtag/js?id=UA-26289329-1';
        
        document.body.appendChild( script );

    });
    document.addEventListener( 'keyup', (event:KeyboardEvent) => {

        if( event.key === 'Tab'  && localStorage.getItem( 'accessibility-enabled' ) !== 'true' ){

            document.body.classList.add( 'accessibility-enabled' );
            document.body.style.overflow = '';

        }

    });
    document.addEventListener( 'click', (event:MouseEvent) => {

        if( localStorage.getItem( 'accessibility-enabled' ) !== 'true' ){

            document.body.classList.remove( 'accessibility-enabled' );

        }
        
    });
   
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

            searchTips.innerText = TIPS.during;

            startAudioVisual();

        }
        function onEnd(){

            document.body.classList.remove( 'speech-recognition' );
            
            if( grammarRecognition ) grammarRecognition.stop();
            
            grammarRecognition = null;

            searchTips.innerText = TIPS.start;

            stopAudioVisual();

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
        
        searchTips.textContent = TIPS.focus;

    }

}