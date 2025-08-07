export interface CARD {
  cardTitle: string;
  textColor: string;
  content: string;
  headerColor: string;
  bodyColor: string;
  footerColor: string;
}
export const cards: CARD | any = [
  {
    cardTitle: 'Card With Footer',
    headerColor: 'pb-0',
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the the industry's standard dummy text ever.",
  },
  {
    cardTitle: 'Color Card',
    textColor: 'text-white',
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0 bg-primary',
    bodyColor: 'bg-primary',
    footerColor: 'bg-primary',
  },
  {
    cardTitle: 'Primary Color Card',
    textColor: 'text-white',

    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0 bg-secondary',
    bodyColor: 'bg-secondary',
    footerColor: 'bg-secondary',
  },
  {
    cardTitle: 'Primary Color Card',
    textColor: 'text-white',

    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0 bg-success',
    bodyColor: 'bg-success',
    footerColor: 'bg-success',
  },
  {
    cardTitle: 'Primary Color Card',
    textColor: 'text-white',

    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0 bg-danger',
    bodyColor: 'bg-danger',
    footerColor: 'bg-danger',
  },
  {
    cardTitle: 'Primary Color Card',
    textColor: 'text-white',

    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0 bg-warning',
    bodyColor: 'bg-warning',
    footerColor: 'bg-warning',
  },
  {
    cardTitle: 'Primary Color Card',
    textColor: 'text-white',

    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'bg-primary',
    bodyColor: '',
    footerColor: '',
  },
  {
    cardTitle: 'Primary Color Card',
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: '',
    bodyColor: 'bg-primary',
    footerColor: '',
  },
  {
    cardTitle: 'Primary Color Card',
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the.",
    headerColor: 'pb-0',
    bodyColor: '',
    footerColor: 'bg-primary',
  },
];

export const Buttons: any = [
  {
    buttonTitle: 'URL Clickable',
    buttonId: 'bootstrap-notify-url',
  },
  {
    buttonTitle: 'Allow dismiss',
    buttonId: 'bootstrap-notify-dismiss',
  },
  {
    buttonTitle: 'Pause on hover',
    buttonId: 'bootstrap-notify-pause',
  },
  {
    buttonTitle: 'Newest on top',
    buttonId: 'bootstrap-notify-top',
  },
  {
    buttonTitle: 'Show Title',
    buttonId: 'bootstrap-notify-title',
  },
  {
    buttonTitle: 'Show Progress',
    buttonId: 'bootstrap-notify-progress',
  },
];

export let cardData1 = [
  {
    bgImg: 'assets/images/user-card/2.jpg',
    userProfile: 'assets/images/avtar/4.jpg',
    name: 'Elana Deo',
    designation: 'Designer',
    Follower: 2578,
    Following: 26,
    totalPost: 96,
  },
];
export let cardData2 = [
  {
    bgImg: 'assets/images/user-card/6.jpg',
    userProfile: 'assets/images/avtar/3.jpg',
    name: 'Genelia Leo',
    designation: 'Manager',
    Follower: 9564,
    Following: 49,
    totalPost: 96,
  },
];
