import { loadLevel, delay, clamp } from "./core";
import { animateScrollBody, mailey, phoney } from "./levels/titlescreen";
import "./gamepad-cursor.ts";

loadLevel( 'Titlescreen' );

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

    if( element ) link.addEventListener( 'click', event => {

        event.preventDefault();
        animateScrollBody( element );

    });

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

        fetch( image.src ).then(r => r.text()).then(text => {

            const svgDocument = new DOMParser().parseFromString( text, 'image/svg+xml' );
            const svg = svgDocument.querySelector( 'svg' );

            svg.setAttribute( 'class', image.className );
            svg.setAttribute( 'id', image.id );
            svg.setAttribute( 'width', bb.width + 'px' );
            svg.setAttribute( 'height', bb.height + 'px' );

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
document.querySelector( '#gamepad-illustration' ).addEventListener( 'click', event => {

    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);

    (event.target as HTMLElement).style.setProperty( '--accent', `rgb(${r},${g},${b})` );

});