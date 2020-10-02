import { clamp, delay } from "./ts/general";
import { initContent, initPage } from  "./ts/page";

function initBlogPage( rootElement:HTMLElement, href:string ){

    href = rootElement.getAttribute( 'source' ) || href;

    new IntersectionObserver(records => {

        if( records[0].intersectionRatio > 0 ) history.pushState({}, document.title, href );

    }).observe( rootElement );

    rootElement.querySelectorAll( 'pre, code' ).forEach(code => {

        let count = 1;
        code.innerHTML = code.textContent.replace( /return|var|const|let|function|\=\>|if|else|document|window|async|\;|\{|\}|\<|\>/gi, keyword => {

            return `<span class="keyword" style="animation-delay:-${((count++) * 2).toFixed(2)}s">${keyword}</span>`;

        });

    });
    rootElement.querySelectorAll( 'img' ).forEach(image => {

        image.addEventListener( 'click', event => image.classList.toggle( 'expanded' ));

    });
    rootElement.querySelectorAll( '.load-more' ).forEach(loadMonth => {

        loadMonth.addEventListener( 'click', async event => {

            event.preventDefault();

            loadMonth.classList.add( 'loading' );
            loadMonth.classList.add( 'active' );

            await delay(2000);

            const href = loadMonth.getAttribute( 'href' );
            const page = await fetch( href );
            const html = await page.text();
            const dom = new DOMParser().parseFromString( html, 'text/html' );
            const main = dom.querySelector( 'main' );
            const lastMain = document.querySelector( 'main:last-of-type' );
            const parent = lastMain.parentNode;

            main.setAttribute( 'source', href );
            initContent( main );
            initBlogPage( main, href );

            parent.insertBefore( main, lastMain );
            parent.insertBefore( lastMain, main );

            loadMonth.remove();

        }, { once: true });

    });

}

let scrollOffset = 0;
let scrollValue = 0;

document.addEventListener( 'scroll', event => {

    const max = (document.body.scrollHeight || document.documentElement.scrollHeight);
    const scrollMax = max - innerHeight;
    const scroll = clamp(document.body.scrollTop || document.documentElement.scrollTop,  0, scrollMax);
    
    let scrolled = clamp( scroll / Math.min( scrollMax, 2000 ), 0, 1 );

    if( scrolled < scrollOffset ){

        scrollValue = clamp( scrollValue - scrolled  / 1 );

    } else if( scrolled > scrollOffset ){

        scrollValue = clamp( scrollValue + scrolled / 1000  );

    }
    
    scrollOffset = scrolled;

    document.body.classList.toggle( 'bottomed-out', scroll === scrollMax || scrolled === 0 );
    document.body.style.setProperty( '--scroll-off-nav', scrollOffset.toFixed(3) );

})

initPage( document.body );
initContent( document.body );
initBlogPage( document.querySelector( 'main' ), '/blog.html' );