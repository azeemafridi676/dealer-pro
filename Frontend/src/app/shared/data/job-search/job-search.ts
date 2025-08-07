export interface Filter {
    id: number,
    title: string,
    checkBoxs: [] 
 }
 
 export const filter : Filter |  any = [
    {
       id: 1,
       title: 'location',
       isCollapsed: false,
       checkBoxs: [
          {
             checkTitle: 'London',
             subTitle: 'London (69)'
          },
          {
             checkTitle: 'New York',
             subTitle: 'NY (39)'
          },
          {
             checkTitle: 'Contrary',
             subTitle: 'Con (45)'
          },
          {
             checkTitle: 'Chicago',
             subTitle: 'IL (63)'
          },
          {
             checkTitle: 'Seattle',
             subTitle: 'WA (249)'
          }
       ],
       button: 'All Locations'
       
    },
    {
       id: 2,
       title: 'Job Title',
       isCollapsed: false,
       checkBoxs: [
          {
             checkTitle: 'UI/Ux designer(25)',
          },
          {
             checkTitle: 'Graphic designer(10)',
          },
          {
             checkTitle: 'Front end designer(15)',
          },
          {
             checkTitle: 'PHP developer(42)',
          },
          {
             checkTitle: 'React Developer(5)',
          }
          
       ],
       button: 'All Job Title'
    },
    {
       id: 3,
       title: 'Industry',
       isCollapsed: false,
 
       checkBoxs: [
          {
             checkTitle: 'Computer Software(14)',
          },
          {
             checkTitle: ' IT Engineer(10)',
          },
          {
             checkTitle: 'Service industry(20)',
          },
          {
             checkTitle: 'Accounting(34)',
          },
          {
             checkTitle: ' Financial Services(5)',
          }
          
       ],
       button: 'All Industry'
    },
    {
       id: 4,
       title: 'Specific skills',
       isCollapsed: false,
 
       checkBoxs: [
          {
             checkTitle: 'HTML,scss & sass',
          },
          {
             checkTitle: 'Javascript',
          },
          {
             checkTitle: ' Node.js',
          },
          {
             checkTitle: 'Gulp & Pug',
          },
          {
             checkTitle: 'Angular.js',
          }
          
       ],
       button: 'All Skills'
    }
 ]
 
 export const filterChackBox = [
    {
       id: "chk-ani",
       lable: "Full-time",
       vacuncy : 866
    },
    {
       id: "chk-ani1",
       lable: "Contract",
       vacuncy : 503
    },
    {
       id: "chk-ani2",
       lable: "Part-time",
       vacuncy : 288
    },
    {
       id: "chk-ani3",
       lable: "Internship",
       vacuncy : 146
    },
    {
       id: "chk-ani4",
       lable: "Temporary",
       vacuncy : 25
    },
    {
       id: "chk-ani5",
       lable: "Commission",
       vacuncy : 868
    }
 ]
 export const jobCards = [
    {
       id: 1,
       rating: 5,
       iconImg: 'assets/images/job-search/1.jpg',
       title: 'UI/UX IT Frontend Developer',
       subTitle: '(L6) Salt Lake City, UT',
       dace: "The designer will apply Lean UX and Design Thinking practices in a highly collaborative, fast-paced, distributed environment You have 4+ years of UX experience. You support UX leadership by providing continuous feedback regarding the evolution of team process standards.",
       NewTag: 'New',
       tag: false,
       tag2: true,
       ribbon: false,
       para: "This is an incredibly exciting opportunity to gain commercial , Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Ideally 2+ years experience with React. Bonus points if you have React Native experience."
    },
    {
       id: 2,
       rating: 3,
       iconImg: 'assets/images/job-search/2.jpg',
       title:'React/React Native Developer',
       subTitle: 'San Diego, CA',
       dace: "Insipidity the sufficient discretion imprudence resolution sir him decisively. Proceed how any engaged visitor. Explained propriety off out perpetual his you. Feel sold off felt nay rose met you. We so entreaties cultivated astonished is. Was sister for few longer mrs sudden talent become.",
       NewTag: 'New',
       ribbon: true,
       tag: false,
       tag3: true,
       para: "Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Bonus points if you have React Native experience. This is an incredibly exciting opportunity to gain commercial."
    },
    {
       id: 3,
       rating: 4,
       iconImg: 'assets/images/job-search/3.jpg',
       title:'Senior UX designer',
       subTitle: 'San Diego, CA',
       dace: "Contented get distrusts certainty nay are frankness concealed ham. On unaffected resolution on considered of. No thought me husband forming effects. End sitting shewing who saw besides son musical adapted. Contrasted interested eat alteration pianoforte sympathize was.",
       NewTag: 'none',
       ribbon: true,
       tag: true,
       day: '2 days ago',
       para: "Transform product wireframes into responsive, mobile user interface components and Ideally 2+ years experience with React. Bonus points if you have React Native experience. Professional experience of React Native and other front end frameworks."
 
    },
    {
       id: 4,
       rating: 4,
       iconImg: 'assets/images/job-search/4.jpg',
       title:'Front end web developer',
       subTitle: 'San Diego, CA',
       dace: "Situation admitting promotion at or to perceived be. Mr acuteness we as estimable enjoyment up. An held late as felt know. Learn do allow solid to grave. Middleton suspicion age her attention. Chiefly several bed its wishing. Is so moments on chamber pressed to. Doubtful yet way properly answered.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago',
       para: "Bonus points if you have React Native experience. This is an incredibly exciting opportunity to gain commercial. Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Ideally 2+ years experience with React."
    },
    {
       id: 5,
       rating: 5,
       iconImg: 'assets/images/job-search/5.jpg',
       title:'UI/UX IT Frontend Developer',
       subTitle: 'San Diego, CA',
       dace: "The designer will apply Lean UX and Design Thinking practices in a highly collaborative, fast-paced, distributed environment You have 4+ years of UX experience. You support UX leadership by providing continuous feedback regarding the evolution of team process standards.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago',
       para: "Bonus points if you have React Native experience. This is an incredibly exciting opportunity to gain commercial. Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Ideally 2+ years experience with React."
    },
    {
       id: 6,
       rating: 4,
       iconImg: 'assets/images/job-search/6.jpg',
       title:'UI/UX IT Frontend Developer',
       subTitle: 'San Diego, CA',
       dace: "You have 4+ years of UX experience. You support UX leadership by providing continuous feedback regarding the evolution of team process standards. The designer will apply Lean UX and Design Thinking practices in a highly collaborative, fast-paced, distributed environment.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago',
       para: "This is an incredibly exciting opportunity to gain commercial , Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Ideally 2+ years experience with React. Bonus points if you have React Native experience."
    },
    {
       id: 7,
       rating: 2,
       iconImg: 'assets/images/job-search/6.jpg',
       title:'React/React Native Developer',
       subTitle: 'San Diego, CA',
       dace: "We are looking for an experienced and zeta designer and/or frontend engineer with expertise in accessibility to join our team , 3+ years of experience working in as a Frontend Engineer or comparable role.",
       NewTag: 'none',
       ribbon: true,
       tag: true,
       day: '2 days ago'
    },
    {
       id: 8,
       rating: 5,
       iconImg: 'assets/images/job-search/5.jpg',
       title:'Senior UX designer',
       subTitle: 'San Diego, CA',
       dace: "3+ years of experience working in as a Frontend Engineer or comparable role. we are looking for an experienced and zeta designer and/or frontend engineer with expertise in accessibility to join our team.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago',
       para: "Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface components and Bonus points if you have React Native experience. This is an incredibly exciting opportunity to gain commercial."
    },
    {
       id: 9,
       rating: 5,
       iconImg: 'assets/images/job-search/4.jpg',
       title:'Graphic designer',
       subTitle: 'San Diego, CA',
       dace: "Insipidity the sufficient discretion imprudence resolution sir him decisively. Proceed how any engaged visitor. Explained propriety off out perpetual his you. Feel sold off felt nay rose met you. We so entreaties cultivated astonished is. Was sister for few longer mrs sudden talent become.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago'
    },
    {
       id: 10,
       rating: 3,
       iconImg: 'assets/images/job-search/3.jpg',
       title:'Designer, CRM',
       subTitle: 'San Diego, CA',
       dace: "The designer will apply Lean UX and Design Thinking practices in a highly collaborative, fast-paced, distributed environment You have 4+ years of UX experience. You support UX leadership by providing continuous feedback regarding the evolution of team process standards.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago'
    },
    {
       id: 11,
       rating: 4,
       iconImg: 'assets/images/job-search/2.jpg',
       title:'UI/UX IT Frontend Developer',
       subTitle: 'San Diego, CA',
       dace: "We are looking for an experienced and zeta designer and/or frontend engineer with expertise in accessibility to join our team , 3+ years of experience working in as a Frontend Engineer or comparable role. You won’t be a team of one though — you’ll be collaborating coely with other...",
       NewTag: 'New',
       ribbon: true,
       tag: true,
    },
    {
       id: 12,
       rating: 3,
       iconImg: 'assets/images/job-search/1.jpg',
       title:'React/React Native Developer',
       subTitle: 'San Diego, CA',
       dace: "deally 2+ years experience with React. Bonus points if you have React Native experience. This is an incredibly exciting opportunity to gain commercial , Professional experience of React Native and other front end frameworks. Transform product wireframes into responsive, mobile user interface",
       NewTag: 'New',
       ribbon: true,
       tag: false,
       tag2: 'globe-alt'
    },
    {
       id: 13,
       rating: 1,
       iconImg: 'assets/images/job-search/3.jpg',
       title:'Front end web developer',
       subTitle: 'Cisco Lelystad, Netherlands',
       dace: "The designer will apply Lean UX and Design Thinking practices in a highly collaborative, fast-paced, distributed environment You have 4+ years of UX experience. You support UX leadership by providing continuous feedback regarding the evolution of team process standards",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago',
       tag2: 'award'
    },
    {
       id: 14,
       rating: 2,
       iconImg: 'assets/images/job-search/1.jpg',
       title:'Minneapolis, MN',
       subTitle: 'San Diego, CA',
       dace: "We are looking for an experienced and zeta designer and/or frontend engineer with expertise in accessibility to join our team , 3+ years of experience working in as a Frontend Engineer or comparable role.",
       NewTag: 'none',
       ribbon: true,
       tag: false,
       day: '2 days ago'
    },
 ]
 
 export class jobDetail  {
    static  description = [
       {
          desc: "We are looking for a UI/UX Designer to join our team. The world is seeing an explosion in the amount and variety of location-baWe are looking for a versatile UX/UI Designer to join our growing design team. Our designers contribute to clients’ projects at all stages of development. We might start from scratch, conducting user and stakeholder interviews, making personas and journey maps, and continue on to iterating o esigns and prototypes through delivering final assets for launch. We might come into the middle of an in-flight program-size project and conduct analysis and usability correction or feature enhancement. We might provide research and vision for handoff to an internal development team."
       }
    ]
 
    static qualifications = [
       { point: "Have shipped multiple iOS, Android, and/or web products" },
       { point: "5+ years UI/UX experience" },
       { point: "Portfolio demonstrating msery of native iOS, Android, and/or responsive web design principles" },
       { point: "Ability to autonomously pursue elegant solutions to open-ended problems" },
       { point: "Comfort with ambiguity" },
       { point: "Proven ability to create interactive prototypes" },
       { point: "Strong verbal communication skills with ability to clearly communicate complex ideas and champion a design vision across all levels of an organization" },
       { point: "Strong written communication skills with ability to make transparent design documentation and client-facing presentations" },
       { point: "Ability to create and maintain flow charts, wire frames, prototypes, and mockups." },
       { point: "Ability to effectively work on more than one project at a time" },
       { point: "Experience conducting user research and stakeholder interviews" },
       { point: "Solid grasp of standard design tools, ex: Sketch, Omnigraffle, the Adobe Suite, Zeplin, etc." },
       { point: "Bonus Considerations" },
    ]
 
    static agencyExperience = [
       { point: "Experience working with Agile development teams" },
       { point: "Experience with RITE method usability testing" },
       { point: "Experience in visual and motion design; ability to translate UX design into high quality visuals" },
       { point: "Mastery of Sketch & InVision" },
       { point: "Knowledge of mobile or front-end web programming" },
    ]
 
    static perks = [
       { point: "Competitive pay" },
       { point: "Competitive medical, dental, and vision insurance plans" },
       { point: "Company-provided 401(k) plan" },
       { point: "Paid vacation and sick time" },
       { point: "Free snacks and beverages" },
    ]
 
 }