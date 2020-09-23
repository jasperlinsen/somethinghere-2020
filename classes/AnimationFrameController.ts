export class AnimationFrameGroup {

    Group = AnimationFrameGroup;
    
    disposable = false;
    time = 0;
    paused = false;
    pausedTime = 0;
    name = '';
    delta = 0;
    states = new WeakMap;
    handlers = new Set;

    constructor( name = '', iterable: (Function | AnimationFrameGroup)[] = [] ){

        this.name = name;

        iterable?.forEach?.(handler => this.add( handler ));

    }

    add( ...handlers: (Function | AnimationFrameGroup)[] ){

        handlers.forEach(handler => {

            this.states.set(
                handler,
                Object.assign( this.states.get( handler ) || {
                    since: this.time,
                    duration: 0,
                })
            );

            this.handlers.add( handler );

        });

        return this;

    }

    forEach( delta ){

        this.delta = delta;

        if( this.paused ){

            this.pausedTime += delta;

        } else {

            this.time += delta;

            this.handlers.forEach(( handler:(Function | AnimationFrameGroup) ) => {

                let result;

                if( handler instanceof AnimationFrameGroup ){

                    handler.forEach( delta );

                    result = !this.disposable ? true : !handler.size;

                } else {

                    const state = this.states.get( handler ) || this.states.set(handler, {
                        since: this.time,
                        duration: 0
                    });

                    state.duration += delta;
                    
                    result = handler( delta, state );

                    this.states.get( handler );

                }

                if( result === false ) this.handlers.delete( handler );

            });

        }

    }

}

class AnimationFrameController extends AnimationFrameGroup {

    disposable = false;

    constructor( iterable: (Function | AnimationFrameGroup)[] = [] ){

        super( 'Master AF', iterable );

        window.requestAnimationFrame( this.loop );

    }

    private loop = time => {
        
        const delta = time - (this.time + this.pausedTime);

        this.forEach( delta );

        window.requestAnimationFrame( this.loop );

    }

}

export default new AnimationFrameController;