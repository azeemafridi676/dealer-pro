import { ChartType } from 'chart.js';

let primary_color = localStorage.getItem('primary_color') || '#6362e7';
let secondary_color = localStorage.getItem('secondary_color') || '#ffc500';
let success_color = localStorage.getItem('success_color') || '#7dc006';
let info_color = localStorage.getItem('info_color') || '#1d97ff';
let danger_color = localStorage.getItem('danger_color') || '#e52727';
let warning_color = localStorage.getItem('warning_color') || '#ff8819';
let light_1_color = localStorage.getItem('light_1_color') || '#8f97b2';

// barChart
export var barChartOptions: any = {
  scaleShowVerticalLines: false,
  responsive: true,
};
export var barChartLabels: string[] = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Purple',
  'Orange',
];
export var barChartType: ChartType = 'bar';
export var barChartLegend = true;
export var barChartData: any[] = [
  {
    label: 'Employee',
    backgroundColor: primary_color,
    data: [10, 40, 5, 38, 27, 12, 29, 17, 40],
  },
  {
    label: 'Engineer',
    backgroundColor: secondary_color,
    data: [-15, -20, -5, -40, -24, -12, 25, -15, -23],
  },
  {
    label: 'Government',
    backgroundColor: success_color,
    data: [16, 25, 5, 31, 30, 12, 19, 19, 27],
  },
  {
    label: 'Political parties',
    backgroundColor: info_color,
    data: [-10, -15, -5, -33, -26, -12, -26, -12, -34],
  },
];
export var barChartColors: Array<any> = [
  {
    backgroundColor: 'rgba(145, 46, 252, 0.6)',
    borderColor: '#7366ff',
    borderWidth: 1,
  },
  {
    backgroundColor: 'rgba(247, 49, 100, 0.6)',
    borderColor: '#f73164',
    borderWidth: 1,
  },
];

// LineGraph Chart
export var lineGraphOptions: any = {};
export var lineGraphLabels: string[] = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Purple',
  'Orange',
];
export var lineGraphType: ChartType = 'line';
export var lineGraphLegend = true;
export var lineGraphData: any[] = [
  {
    label: 'Employee',
    backgroundColor: primary_color,
    data: [20, -10, 5, -38, 27, -12, 29, -17, 40],
    borderColor: primary_color,
    tension: 0.5,
  },
  {
    label: 'Government',
    backgroundColor: secondary_color,
    data: [26, 35, 15, 21, 15, 22, 19, 10, 27],
    borderColor: secondary_color,
    tension: 0.5,
  },
  {
    label: 'Political parties',
    backgroundColor: info_color,
    data: [16, 25, -20, 31, 30, 12, 19, 19, 27],
    borderColor: info_color,
  },
];

// RadarGraph Chart
export var radarGraphOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    line: {
      borderWidth: 2,
    },
  },
};
export var radarGraphLabels: string[] = [
  'Eating',
  'Drinking',
  'Sleeping',
  'Designing',
  'Coding',
  'Cycling',
  'Running',
];
export var radarGraphType: ChartType = 'radar';
export var radarGraphLegend = true;
export var radarGraphData: any[] = [
  {
    label: 'My First Dataset',
    data: [65, 59, 70, 79, 56, 55, 40],
    fill: true,
    backgroundColor: 'rgba(99, 98, 231, 0.2)',
    borderColor: primary_color,
    pointBackgroundColor: primary_color,
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: primary_color,
  },
  {
    label: 'My Second Dataset',
    data: [28, 48, 40, 19, 76, 27, 80],
    fill: true,
    backgroundColor: 'rgba(255, 197, 0, 0.2)',
    borderColor: secondary_color,
    pointBackgroundColor: secondary_color,
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: secondary_color,
  },
];
export var radarGraphColors: Array<any> = [
  {
    backgroundColor: 'rgba(99, 98, 231, 0.2)',
    borderColor: '#7366ff',
    borderWidth: 2,
  },
];

//line chart
export var lineChartData: Array<any> = [
  { data: [10, 20, 40, 30, 0, 20, 10, 30, 10] },
  { data: [20, 40, 10, 20, 40, 30, 40, 10, 20] },
  { data: [60, 10, 40, 30, 80, 30, 20, 90, 0] },
];
export var lineChartLabels: Array<any> = [
  '',
  '10',
  '20',
  '30',
  '40',
  '50',
  '60',
  '70',
  '80',
];
export var lineChartOptions: any = {
  responsive: true,
  scaleShowVerticalLines: false,
  maintainAspectRatio: false,
};
export var lineChartColors: Array<any> = [
  {
    backgroundColor: 'rgba(81, 187, 37, 0.3)',
    borderColor: '#7dc006',
    borderWidth: 2,
    lineTension: 0,
  },
  {
    backgroundColor: 'rgba(247, 49, 100, 0.3)',
    borderColor: '#f73164',
    borderWidth: 2,
    lineTension: 0,
  },
  {
    backgroundColor: 'rgba(145, 46, 252, 0.3)',
    borderColor: '#7366ff',
    borderWidth: 2,
    lineTension: 0,
  },
];
export var lineChartLegend = false;
export var lineChartType: ChartType = 'line';

// Doughnut
export var doughnutChartLabels: string[] = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Purple',
];
export var doughnutChartData: any[] = [
  {
    label: 'My First Dataset',
    data: [300, 50, 100, 250, 150],
    backgroundColor: [
      primary_color,
      danger_color,
      success_color,
      warning_color,
      secondary_color,
    ],
  },
];
export var doughnutChartColors: any[] = [
  { backgroundColor: [primary_color, secondary_color, '#7dc006'] },
];
export var doughnutChartType: ChartType = 'doughnut';
export var doughnutChartOptions: any = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
};

// PolarArea
// export var polarAreaChartLabels: string[] = ['Download Sales', 'In-Store Sales', 'Mail Sales', 'Telesales', 'Corporate Sales'];
// export var polarAreaChartData: number[] = [300, 500, 100, 40, 120];
// export var polarAreaLegend = false;
// export var ploarChartColors: any[] = [{ backgroundColor: [primary_color, secondary_color, "#7dc006", "#a927f9", "#f8d62b"] }];
// export var polarAreaChartType = 'polarArea';
// export var polarChartOptions: any = {
//   animation: false,
//   responsive: true,
//   maintainAspectRatio: false
// };

// barChart
export var polarareaChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
};
export var polarareaChartLabels: string[] = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Purple',
];
export var polarareaChartType: ChartType = 'polarArea';
export var polarareaChartLegend = true;
export var polarareaChartData: any[] = [
  {
    label: 'My First Dataset',
    data: [11, 16, 7, 3, 14],
    backgroundColor: [
      primary_color,
      secondary_color,
      success_color,
      light_1_color,
      warning_color,
    ],
  },
];
