import { loadLevel, delay, clamp } from "./core";
import { animateScrollBody, mailey, phoney } from "./levels/titlescreen";
import "./gamepad-cursor.ts";

function randomColor(){

    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);

    return `rgb(${r},${g},${b})`;

}

if( localStorage.getItem( 'accessibility-enabled' ) === 'true' ){

    document.body.classList.add( 'accessibility-enabled' );

}

document.querySelectorAll( '.accessibility-toggle' ).forEach((toggle: HTMLInputElement, i, allToggles) => {

    toggle.checked = localStorage.getItem( 'accessibility-enabled' ) === 'true';
    toggle.addEventListener( 'change', event => {

        localStorage.setItem( 'accessibility-enabled', toggle.checked.toString() );
        
        allToggles.forEach((otherToggle:HTMLInputElement) => {

            otherToggle.checked = toggle.checked;

        });

        document.body.classList.toggle( 'accessibility-enabled', toggle.checked );

    });

});
document.querySelectorAll( '.disabled' ).forEach(link => {

    link.addEventListener( 'click', async event => {

        event.preventDefault();

        link.classList.add( 'click' );

        await new Promise(r => link.addEventListener( 'animationend', r, { once: true }));

        link.classList.remove( 'click' );

    });

});
document.querySelectorAll( 'a[href^="#"]' ).forEach(link => {

    const element: HTMLElement = document.querySelector( link.getAttribute( 'href') );

    if( element ) link.addEventListener( 'click', () => animateScrollBody( element ));
    link.addEventListener( 'click', event => event.preventDefault());


});
document.querySelectorAll( 'a[href^="http"]' ).forEach(link => {

    link.setAttribute( 'target', '_blank' );

});
document.querySelectorAll( 'a[href="tel:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `tel:${phoney()}` );

});
document.querySelectorAll( 'a[href="mailto:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `mailto:${mailey()}` );

});
document.querySelectorAll( 'a[href="twitter:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `twitter:@jasperlinsen` );

});
document.querySelectorAll( '.full-year' ).forEach(year => {

    year.textContent = '2018-' + new Date().getFullYear().toString();

});
document.querySelectorAll( 'blockquote' ).forEach(quote => {

    quote.addEventListener( 'click', event => {

        document.querySelectorAll( 'blockquote' ).forEach(q => {

            if( quote !== q ) q.classList.remove( 'expanded' );

        });

        quote.classList.toggle( 'expanded' );

    });

});
document.querySelectorAll( '.gallery' ).forEach(async (gallery:HTMLElement, index:number) => {

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
document.querySelectorAll( '.svg-replace' ).forEach(image => {

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
document.querySelectorAll( '.illustration' ).forEach((illustration:HTMLElement) => {

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
    
    new IntersectionObserver(entries => {

        illustration.classList.toggle( 'no-animate', entries[0].intersectionRatio <= 0 );

    }).observe( illustration );

});
document.addEventListener( 'DOMContentLoaded', event => {

    loadLevel( 'Titlescreen' );

    const script = document.createElement( 'script' );

    function gtag( ...args: any[] ){ window['dataLayer'].push( ...args ); }

    window['dataLayer'] = (window['dataLayer'] || []).concat([
        'js', new Date(),
        'config', 'UA-26289329-2'
    ]);
    window['gtag'] = gtag;

    script.async = true;
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