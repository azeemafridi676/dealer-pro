export interface BOOT {
  [key: string]: any;

  title: string;
  selectOne: [] | string;
  selectTwo: [] | string;
}

export const placement = [
  {
    selectOne: ['top', 'Bottom'],
    selectTwo: ['Left', 'Right', 'Center'],
  },
];

export const Bootstrap: any = [
  {
    title: 'Animation',
    selectOne: [
      {
        optgroup: 'Attention Seekers',
        option: [
          'bounce',
          'flash',
          'pulse',
          'rubberBand',
          'shake',
          'swing',
          'tada',
          'wobble',
          'jello',
        ],
      },
      {
        optgroup: 'Bouncing Entrances',
        option: [
          'bounceIn',
          'bounceInDown',
          'bounceInLeft',
          'bounceInRight',
          'bounceInUp',
        ],
      },
      {
        optgroup: 'Bouncing Exits',
        option: [
          'bounceOut',
          'bounceOutDown',
          'bounceOutLeft',
          'bounceOutRight',
          'bounceOutUp',
        ],
      },
      {
        optgroup: 'Fading Entrances',
        option: [
          'fadeIn',
          'fadeInDown',
          'fadeInDownBig',
          'fadeInLeft',
          'fadeInLeftBig',
          'fadeInRight',
          'fadeInRightBig',
          'fadeInUp',
          'fadeInUpBig',
        ],
      },
      {
        optgroup: 'Fading Exits',
        option: [
          'fadeOut',
          'fadeOutDown',
          'fadeOutDownBig',
          'fadeOutRight',
          'fadeInLeftBig',
          'fadeInRight',
          'fadeOutRightBig',
          'fadeOutUp',
          'fadeOutUpBig',
        ],
      },
      {
        optgroup: 'Flippers',
        option: ['flip', 'flipInX', 'flipInY', 'flipOutX', 'flipOutY'],
      },
      {
        optgroup: 'Lightspeed',
        option: ['lightSpeedIn', 'lightSpeedOut'],
      },
      {
        optgroup: 'Rotating Entrances',
        option: [
          'rotateIn',
          'rotateInDownLeft',
          'rotateInDownRight',
          'rotateInUpLeft',
          'rotateInUpRight',
        ],
      },
      {
        optgroup: 'Rotating Exits',
        option: [
          'rotateOut',
          'rotateOutDownLeft',
          'rotateInDownRight',
          'rotateOutDownRight',
          'rotateOutUpLeft',
          'rotateOutUpRight',
        ],
      },
      {
        optgroup: 'Sliding Entrances',
        option: ['slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight'],
      },
      {
        optgroup: 'Sliding Exits',
        option: ['slideOutUp', 'slideOutDown', 'slideOutLeft', 'slideOutRight'],
      },
      {
        optgroup: 'Zoom Entrances',
        option: [
          'zoomIn',
          'zoomInDown',
          'zoomInLeft',
          'zoomInRight',
          'zoomInUp',
        ],
      },
      {
        optgroup: 'Zoom Exits',
        option: [
          'zoomOut',
          'zoomOutDown',
          'zoomOutLeft',
          'zoomOutRight',
          'zoomOutUp',
        ],
      },
      {
        optgroup: 'Specials',
        option: ['hinge', 'rollIn', 'rollOut'],
      },
    ],
    selectTwo: [
      {
        optgroup: 'Attention Seekers',
        option: [
          'bounce',
          'flash',
          'pulse',
          'rubberBand',
          'shake',
          'swing',
          'tada',
          'wobble',
          'jello',
        ],
      },
      {
        optgroup: 'Bouncing Entrances',
        option: [
          'bounceIn',
          'bounceInDown',
          'bounceInLeft',
          'bounceInRight',
          'bounceInUp',
        ],
      },
      {
        optgroup: 'Bouncing Exits',
        option: [
          'bounceOut',
          'bounceOutDown',
          'bounceOutLeft',
          'bounceOutRight',
          'bounceOutUp',
        ],
      },
      {
        optgroup: 'Fading Entrances',
        option: [
          'fadeIn',
          'fadeInDown',
          'fadeInDownBig',
          'fadeInLeft',
          'fadeInLeftBig',
          'fadeInRight',
          'fadeInRightBig',
          'fadeInUp',
          'fadeInUpBig',
        ],
      },
      {
        optgroup: 'Fading Exits',
        option: [
          'fadeOut',
          'fadeOutDown',
          'fadeOutDownBig',
          'fadeOutRight',
          'fadeInLeftBig',
          'fadeInRight',
          'fadeOutRightBig',
          'fadeOutUp',
          'fadeOutUpBig',
        ],
      },
      {
        optgroup: 'Flippers',
        option: ['flip', 'flipInX', 'flipInY', 'flipOutX', 'flipOutY'],
      },
      {
        optgroup: 'Lightspeed',
        option: ['lightSpeedIn', 'lightSpeedOut'],
      },
      {
        optgroup: 'Rotating Entrances',
        option: [
          'rotateIn',
          'rotateInDownLeft',
          'rotateInDownRight',
          'rotateInUpLeft',
          'rotateInUpRight',
        ],
      },
      {
        optgroup: 'Rotating Exits',
        option: [
          'rotateOut',
          'rotateOutDownLeft',
          'rotateInDownRight',
          'rotateOutDownRight',
          'rotateOutUpLeft',
          'rotateOutUpRight',
        ],
      },
      {
        optgroup: 'Sliding Entrances',
        option: ['slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight'],
      },
      {
        optgroup: 'Sliding Exits',
        option: ['slideOutUp', 'slideOutDown', 'slideOutLeft', 'slideOutRight'],
      },
      {
        optgroup: 'Zoom Entrances',
        option: [
          'zoomIn',
          'zoomInDown',
          'zoomInLeft',
          'zoomInRight',
          'zoomInUp',
        ],
      },
      {
        optgroup: 'Zoom Exits',
        option: [
          'zoomOut',
          'zoomOutDown',
          'zoomOutLeft',
          'zoomOutRight',
          'zoomOutUp',
        ],
      },
      {
        optgroup: 'Specials',
        option: ['hinge', 'rollIn', 'rollOut'],
      },
    ],
  },
];
export const icon = [
  'fa fa-check-square',
  'fa fa-warning',
  'fa fa-cloud-download',
  'fa fa-unlock-alt',
  'fa fa-spin fa-circle-o-notch',
  'fa fa-spin fa-refresh',
];
export const select = [
  {
    buttonTitle: 'Spacing',
    buttonId: 'bootstrap-notify-spacing',
    value: 10,
  },
  {
    buttonTitle: 'Offset X',
    buttonId: 'bootstrap-notify-offset-x',
    value: 30,
  },
  {
    buttonTitle: 'Offset Y',
    buttonId: 'bootstrap-notify-offset-y',
    value: 10,
  },
  {
    buttonTitle: 'Spacing',
    buttonId: 'bootstrap-notify-spacing',
    value: 20,
  },
  {
    buttonTitle: 'Delay',
    buttonId: 'bootstrap-notify-delay',
    value: 10,
  },
  {
    buttonTitle: 'Timer',
    buttonId: 'bootstrap-notify-timer',
    value: 70,
  },
  {
    buttonTitle: 'Z-Index',
    buttonId: 'bootstrap-notify-z-index',
    value: 10,
  },
];
