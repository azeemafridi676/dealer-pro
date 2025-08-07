import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  heroTitle = 'Modernize your car dealership with smart CRM';
  heroSubtitle = [
    'Increase sales by +35%',
    'Automate customer flow',
    'Full control of leads'
  ];

  featureTabs = [
    {
      label: 'My Vehicles',
      title: 'Inventory Overview',
      description: 'Get an overview of all vehicles in stock, see sold vehicles, and track your turnover in real time. The system is seamlessly connected to both Bytbil and Blocket – so you avoid double work and get maximum reach instantly.',
      points: [
        'View your vehicles in stock and sold',
        'Easily advertise to Blocket',
        'Create expenses directly from inventory.'
      ]
    },
    {
      label: 'Vehicle Questions',
      title: 'Vehicle Questions',
      description: 'Manage and respond to all customer inquiries about your vehicles efficiently.',
      points: [
        'Centralized question management',
        'Quick response templates',
        'Track customer interest.'
      ]
    },
    {
      label: 'Agreements',
      title: 'Agreements',
      description: 'Create, manage, and store all your dealership agreements in one place.',
      points: [
        'Digital agreement templates',
        'Easy signing and sharing',
        'Secure document storage.'
      ]
    },
    {
      label: 'Invoice & Receipt',
      title: 'Invoice & Receipt',
      description: 'Generate invoices and receipts quickly and accurately for every transaction.',
      points: [
        'Automated invoice creation',
        'Send receipts to customers',
        'Track payment status.'
      ]
    },
    {
      label: 'Swish',
      title: 'Swish',
      description: 'Integrate Swish for fast and secure payments directly from your platform.',
      points: [
        'Instant payment processing',
        'Easy integration',
        'Track Swish transactions.'
      ]
    },
    {
      label: 'Ownership Change',
      title: 'Ownership Change',
      description: 'Handle ownership changes smoothly and efficiently within the system.',
      points: [
        'Digital ownership transfer',
        'Automated notifications',
        'Compliance with regulations.'
      ]
    }
  ];

  activeFeatureTab = 0;

  faqs = [
    {
      question: 'How do I import customer data?',
      answer: 'You can easily import your customer data via our import tool. Simply upload your file and follow the instructions.'
    },
    {
      question: 'What does it cost?',
      answer: 'We offer flexible pricing plans to suit your needs. Please contact our sales team for a detailed quote.'
    },
    {
      question: 'What is the cancellation period?',
      answer: 'You can cancel your subscription at any time. There is no long-term commitment.'
    }
  ];

  openFaq: number | null = null;

  scrolledPastHero = false;
  mobileNavOpen = false;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const fragment = this.route.snapshot.fragment;
        if (fragment) {
          const el = document.getElementById(fragment);
          if (el) {
            setTimeout(() => {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 0);
          }
        }
      }
    });

    window.addEventListener('scroll', this.onScroll, true);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll, true);
  }

  onScroll = () => {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      const rect = aboutSection.getBoundingClientRect();
      this.scrolledPastHero = rect.top <= 80; // 80px is approx navbar height
    }
  };

  toggleFaq(index: number) {
    this.openFaq = this.openFaq === index ? null : index;
  }
}
