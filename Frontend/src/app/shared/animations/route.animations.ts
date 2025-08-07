import {
    trigger,
    transition,
    style,
    query,
    animate,
} from '@angular/animations';
  
export const slideInAnimation = trigger('routeAnimations', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transform: 'translateX(100%)',
                zIndex: 2,
                opacity: 0,
            }),
        ], { optional: true }),
        query(':enter', [
            animate('300ms ease-out', style({
                transform: 'translateX(0%)',
                opacity: 1,
            })),
        ], { optional: true }),
    ]),
]);
  