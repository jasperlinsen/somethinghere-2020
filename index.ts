import { loadLevel, delay } from "./core";
import { animateScrollBody, mailey, phoney } from "./levels/titlescreen";

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

    await delay( 500 * index );
    
    gallery.addEventListener( 'mouseenter', e => {

        gallery.style.setProperty( '--rotate', (Math.random() * 8 - 4).toFixed(3) + 'deg' );

    });

    const images: HTMLImageElement[] = Array.from( gallery.querySelectorAll( 'img' ) );
    
    while( true ) for( let img of images ){

        img.classList.add( 'selected' );

        await Promise.race([
            delay( parseInt( gallery.getAttribute( 'duration' ) || '5000' ) ),
            new Promise(resolve => img.addEventListener( 'click', event => {

                resolve();
                gallery.style.setProperty( '--rotate', (Math.random() * 8 - 4).toFixed(3) + 'deg' );

            }, { once: true }))
        ]);

        img.classList.remove( 'selected' );

    }

});