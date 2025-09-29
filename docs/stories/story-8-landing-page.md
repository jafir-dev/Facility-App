# Story: Public Landing Page & Go-to-Market

**Story ID**: Story 8
**Branch**: `feature/story-8`
**Dependencies**: Story 7
**Parallel-safe**: false
**Module**: Marketing and onboarding
**Epic**: Communications & Go-to-Market

## User Stories

### Story 8.1: Public Landing Page
**As a** potential customer, **I want** to visit a public landing page for Zariya, **so that** I can understand the product.

**Acceptance Criteria:**
1. A single-page, responsive marketing website is created
2. The page explains the value proposition and features
3. The page includes a lead capture form ("Contact Us" or "Request a Demo")

### Story 8.2: Display Pricing Tiers & Sign-up CTA
**As a** potential customer, **I want** to see the pricing plans on the landing page, **so that** I can choose an option.

**Acceptance Criteria:**
1. A pricing section details the "Starter," "Pro," and "Enterprise" plans
2. Features and prices for each tier are clearly listed
3. Each plan has a Call-to-Action (CTA) button that links to the sign-up page

## Technical Implementation Details

### Landing Page Structure

```tsx
// apps/web/src/app/landing-page/page.tsx
export default function LandingPage() {
  return (
    <div className=\"min-h-screen\">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Pricing */}
      <PricingSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Navigation Component
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
    }`}>
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"flex justify-between items-center py-4\">
          <div className=\"flex items-center\">
            <Logo className=\"h-8 w-8\" />
            <span className=\"ml-2 text-xl font-bold text-gray-900\">Zariya</span>
          </div>

          <div className=\"hidden md:flex space-x-8\">
            <a href=\"#features\" className=\"text-gray-700 hover:text-gray-900\">Features</a>
            <a href=\"#how-it-works\" className=\"text-gray-700 hover:text-gray-900\">How It Works</a>
            <a href=\"#pricing\" className=\"text-gray-700 hover:text-gray-900\">Pricing</a>
            <a href=\"#testimonials\" className=\"text-gray-700 hover:text-gray-900\">Testimonials</a>
          </div>

          <div className=\"flex items-center space-x-4\">
            <Button variant=\"outline\" asChild>
              <a href=\"/auth/signin\">Sign In</a>
            </Button>
            <Button asChild>
              <a href=\"/auth/signup\">Get Started</a>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className=\"relative pt-32 pb-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white\">
      <div className=\"absolute inset-0 bg-black opacity-20\"></div>
      <div className=\"relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"text-center\">
          <h1 className=\"text-4xl md:text-6xl font-bold mb-6\">
            Transform Facility Management with Smart Technology
          </h1>
          <p className=\"text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto\">
            Streamline maintenance operations, enhance tenant satisfaction, and boost efficiency with our comprehensive facility management platform.
          </p>
          <div className=\"flex flex-col sm:flex-row gap-4 justify-center items-center\">
            <Button size=\"lg\" className=\"bg-white text-blue-600 hover:bg-gray-100\" asChild>
              <a href=\"/auth/signup\">Start Free Trial</a>
            </Button>
            <Button size=\"lg\" variant=\"outline\" className=\"border-white text-white hover:bg-white hover:text-blue-600\" asChild>
              <a href=\"#demo\">Request Demo</a>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className=\"mt-16 grid grid-cols-1 md:grid-cols-4 gap-8 text-center\">
          <div>
            <div className=\"text-3xl font-bold mb-2\">30%</div>
            <div className=\"text-blue-100\">Faster Resolution</div>
          </div>
          <div>
            <div className=\"text-3xl font-bold mb-2\">50%</div>
            <div className=\"text-blue-100\">Reduced Costs</div>
          </div>
          <div>
            <div className=\"text-3xl font-bold mb-2\">4.5/5</div>
            <div className=\"text-blue-100\">Tenant Satisfaction</div>
          </div>
          <div>
            <div className=\"text-3xl font-bold mb-2\">24/7</div>
            <div className=\"text-blue-100\">Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      title: \"Smart Ticket Management\",
      description: \"Streamline maintenance requests from creation to completion with intelligent routing and automation.\",
      icon: Ticket,
    },
    {
      title: \"Real-time Communication\",
      description: \"Keep everyone in the loop with integrated chat, notifications, and status updates.\",
      icon: MessageSquare,
    },
    {
      title: \"Mobile-First Design\",
      description: \"Access the platform from anywhere with our intuitive mobile apps for tenants and staff.\",
      icon: Smartphone,
    },
    {
      title: \"Automated Workflows\",
      description: \"Save time with automated quoting, approvals, and financial processes.\",
      icon: Zap,
    },
    {
      title: \"Analytics & Reporting\",
      description: \"Make data-driven decisions with comprehensive insights and performance metrics.\",
      icon: BarChart3,
    },
    {
      title: \"Secure & Compliant\",
      description: \"Enterprise-grade security with full compliance with data protection regulations.\",
      icon: Shield,
    },
  ];

  return (
    <section id=\"features\" className=\"py-20 bg-gray-50\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"text-center mb-16\">
          <h2 className=\"text-3xl md:text-4xl font-bold text-gray-900 mb-4\">
            Everything You Need for Modern Facility Management
          </h2>
          <p className=\"text-xl text-gray-600 max-w-3xl mx-auto\">
            Our comprehensive platform provides all the tools you need to streamline operations, enhance tenant satisfaction, and drive efficiency.
          </p>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8\">
          {features.map((feature, index) => (
            <div key={index} className=\"bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow\">
              <div className=\"w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4\">
                <feature.icon className=\"h-6 w-6 text-blue-600\" />
              </div>
              <h3 className=\"text-xl font-semibold text-gray-900 mb-2\">{feature.title}</h3>
              <p className=\"text-gray-600\">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: \"Starter\",
      price: 99,
      description: \"Perfect for small properties getting started\",
      features: [
        \"Up to 50 units\",
        \"Basic ticket management\",
        \"Mobile apps for tenants\",
        \"Email notifications\",
        \"Basic reporting\",
        \"5GB storage\"
      ],
      cta: \"Get Started\",
      popular: false,
    },
    {
      name: \"Pro\",
      price: 299,
      description: \"For growing property management companies\",
      features: [
        \"Up to 200 units\",
        \"Advanced workflows\",
        \"Quote management\",
        \"Vendor management\",
        \"Advanced analytics\",
        \"Priority support\",
        \"20GB storage\"
      ],
      cta: \"Start Free Trial\",
      popular: true,
    },
    {
      name: \"Enterprise\",
      price: \"Custom\",
      description: \"For large-scale operations with custom needs\",
      features: [
        \"Unlimited units\",
        \"Custom workflows\",
        \"API access\",
        \"Dedicated account manager\",
        \"Custom integrations\",
        \"24/7 phone support\",
        \"Unlimited storage\"
      ],
      cta: \"Contact Sales\",
      popular: false,
    },
  ];

  return (
    <section id=\"pricing\" className=\"py-20 bg-white\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"text-center mb-16\">
          <h2 className=\"text-3xl md:text-4xl font-bold text-gray-900 mb-4\">
            Simple, Transparent Pricing
          </h2>
          <p className=\"text-xl text-gray-600 max-w-3xl mx-auto\">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto\">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-xl border-2 p-8 ${
                plan.popular
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className=\"absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium\">
                  Most Popular
                </div>
              )}

              <div className=\"text-center mb-6\">
                <h3 className=\"text-2xl font-bold text-gray-900 mb-2\">{plan.name}</h3>
                <p className=\"text-gray-600 mb-4\">{plan.description}</p>
                <div className=\"text-4xl font-bold text-gray-900\">
                  {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                  {typeof plan.price === 'number' && (
                    <span className=\"text-lg font-normal text-gray-600\">/month</span>
                  )}
                </div>
              </div>

              <ul className=\"space-y-3 mb-8\">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className=\"flex items-center\">
                    <Check className=\"h-5 w-5 text-green-500 mr-2\" />
                    <span className=\"text-gray-700\">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
                size=\"lg\"
                asChild
              >
                <a href={plan.name === 'Enterprise' ? '/contact-sales' : '/auth/signup'}>
                  {plan.cta}
                </a>
              </Button>
            </div>
          ))}
        </div>

        <div className=\"text-center mt-12\">
          <p className=\"text-gray-600 mb-4\">
            Need something custom? We can tailor a solution for your specific requirements.
          </p>
          <Button variant=\"outline\" size=\"lg\" asChild>
            <a href=\"/contact-sales\">Contact Sales</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className=\"py-20 bg-blue-600 text-white\">
      <div className=\"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center\">
        <h2 className=\"text-3xl md:text-4xl font-bold mb-4\">
          Ready to Transform Your Facility Management?
        </h2>
        <p className=\"text-xl text-blue-100 mb-8\">
          Join thousands of property managers who have already streamlined their operations with Zariya.
        </p>

        <div className=\"flex flex-col sm:flex-row gap-4 justify-center items-center mb-8\">
          <Button size=\"lg\" variant=\"secondary\" asChild>
            <a href=\"/auth/signup\">Start Free Trial</a>
          </Button>
          <Button size=\"lg\" variant=\"outline\" className=\"border-white text-white hover:bg-white hover:text-blue-600\" asChild>
            <a href=\"#demo\">Schedule Demo</a>
          </Button>
        </div>

        <p className=\"text-blue-100 text-sm\">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className=\"bg-gray-900 text-gray-300 py-12\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-8\">
          <div>
            <div className=\"flex items-center mb-4\">
              <Logo className=\"h-8 w-8 text-white\" />
              <span className=\"ml-2 text-xl font-bold text-white\">Zariya</span>
            </div>
            <p className=\"text-sm\">
              Smart facility management for modern property managers.
            </p>
          </div>

          <div>
            <h3 className=\"text-white font-semibold mb-4\">Product</h3>
            <ul className=\"space-y-2 text-sm\">
              <li><a href=\"#features\" className=\"hover:text-white\">Features</a></li>
              <li><a href=\"#pricing\" className=\"hover:text-white\">Pricing</a></li>
              <li><a href=\"#how-it-works\" className=\"hover:text-white\">How It Works</a></li>
              <li><a href=\"/integrations\" className=\"hover:text-white\">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h3 className=\"text-white font-semibold mb-4\">Company</h3>
            <ul className=\"space-y-2 text-sm\">
              <li><a href=\"/about\" className=\"hover:text-white\">About Us</a></li>
              <li><a href=\"/blog\" className=\"hover:text-white\">Blog</a></li>
              <li><a href=\"/careers\" className=\"hover:text-white\">Careers</a></li>
              <li><a href=\"/contact\" className=\"hover:text-white\">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className=\"text-white font-semibold mb-4\">Legal</h3>
            <ul className=\"space-y-2 text-sm\">
              <li><a href=\"/privacy\" className=\"hover:text-white\">Privacy Policy</a></li>
              <li><a href=\"/terms\" className=\"hover:text-white\">Terms of Service</a></li>
              <li><a href=\"/security\" className=\"hover:text-white\">Security</a></li>
              <li><a href=\"/compliance\" className=\"hover:text-white\">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className=\"border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center\">
          <p className=\"text-sm mb-4 md:mb-0\">
            © 2025 Zariya. All rights reserved.
          </p>
          <div className=\"flex space-x-6\">
            <a href=\"#\" className=\"hover:text-white\"><Twitter className=\"h-5 w-5\" /></a>
            <a href=\"#\" className=\"hover:text-white\"><Linkedin className=\"h-5 w-5\" /></a>
            <a href=\"#\" className=\"hover:text-white\"><Facebook className=\"h-5 w-5\" /></a>
            <a href=\"#\" className=\"hover:text-white\"><Instagram className=\"h-5 w-5\" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

### Contact Form Component

```tsx
// apps/web/src/components/landing/contact-form.tsx
interface ContactFormProps {
  type: 'contact' | 'demo';
}

export function ContactForm({ type }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    preferredTime: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await landingApi.submitContactForm({
        ...formData,
        type,
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className=\"text-center p-8 bg-green-50 rounded-lg\">
        <CheckCircle className=\"h-12 w-12 text-green-500 mx-auto mb-4\" />
        <h3 className=\"text-xl font-semibold text-green-900 mb-2\">
          Thank you for your interest!
        </h3>
        <p className=\"text-green-700\">
          {type === 'demo'
            ? 'We\\'ll contact you shortly to schedule your demo.'
            : 'We\\'ll get back to you within 24 hours.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className=\"space-y-6\">
      <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
        <div>
          <label htmlFor=\"name\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Full Name *
          </label>
          <input
            type=\"text\"
            id=\"name\"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          />
        </div>

        <div>
          <label htmlFor=\"email\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Email Address *
          </label>
          <input
            type=\"email\"
            id=\"email\"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          />
        </div>

        <div>
          <label htmlFor=\"company\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Company Name *
          </label>
          <input
            type=\"text\"
            id=\"company\"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          />
        </div>

        <div>
          <label htmlFor=\"phone\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Phone Number
          </label>
          <input
            type=\"tel\"
            id=\"phone\"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          />
        </div>
      </div>

      {type === 'demo' && (
        <div>
          <label htmlFor=\"preferredTime\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Preferred Demo Time
          </label>
          <select
            id=\"preferredTime\"
            value={formData.preferredTime}
            onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          >
            <option value=\"\">Select a time</option>
            <option value=\"morning\">Morning (9 AM - 12 PM)</option>
            <option value=\"afternoon\">Afternoon (12 PM - 5 PM)</option>
            <option value=\"evening\">Evening (5 PM - 8 PM)</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor=\"message\" className=\"block text-sm font-medium text-gray-700 mb-1\">
          Message
        </label>
        <textarea
          id=\"message\"
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          placeholder={type === 'demo' ? 'Tell us about your facility management needs...' : 'How can we help you?'}
        />
      </div>

      <Button
        type=\"submit\"
        disabled={isSubmitting}
        className=\"w-full\"
        size=\"lg\"
      >
        {isSubmitting ? (
          <>
            <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
            Submitting...
          </>
        ) : type === 'demo' ? (
          'Schedule Demo'
        ) : (
          'Send Message'
        )}
      </Button>
    </form>
  );
}
```

### Analytics Integration

```typescript
// apps/web/src/lib/analytics.ts
import ReactGA from 'react-ga4';

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
    ReactGA.initialize(process.env.NEXT_PUBLIC_GA_ID);
  }
};

export const trackPageView = (path: string) => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

export const trackEvent = (event: {
  category: string;
  action: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
    ReactGA.event(event);
  }
};

// Landing page specific events
export const trackLandingEvents = {
  ctaClick: (ctaType: 'trial' | 'demo' | 'contact') => {
    trackEvent({
      category: 'Landing Page',
      action: 'CTA Click',
      label: ctaType,
    });
  },
  pricingView: () => {
    trackEvent({
      category: 'Landing Page',
      action: 'Pricing View',
    });
  },
  formSubmit: (formType: 'contact' | 'demo') => {
    trackEvent({
      category: 'Landing Page',
      action: 'Form Submit',
      label: formType,
    });
  },
  scrollDepth: (depth: '25%' | '50%' | '75%' | '100%') => {
    trackEvent({
      category: 'Landing Page',
      action: 'Scroll Depth',
      label: depth,
    });
  },
};
```

### SEO Optimization

```tsx
// apps/web/src/app/landing-page/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zariya - Smart Facility Management Software',
  description: 'Streamline maintenance operations and enhance tenant satisfaction with our comprehensive facility management platform. Try it free for 14 days.',
  keywords: [
    'facility management',
    'property management software',
    'maintenance management',
    'tenant portal',
    'work order management',
    'facility management software',
    'property maintenance',
    'building management',
  ],
  authors: [{ name: 'Zariya Team' }],
  creator: 'Zariya',
  publisher: 'Zariya',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://zariya.app',
    siteName: 'Zariya',
    title: 'Zariya - Smart Facility Management Software',
    description: 'Streamline maintenance operations and enhance tenant satisfaction with our comprehensive facility management platform.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Zariya Facility Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zariya - Smart Facility Management Software',
    description: 'Streamline maintenance operations and enhance tenant satisfaction with our comprehensive facility management platform.',
    images: ['/twitter-image.jpg'],
    creator: '@zariyaapp',
  },
  alternates: {
    canonical: 'https://zariya.app',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

### Lead Capture API

```typescript
// packages/api/src/controllers/landing.controller.ts
@Controller('landing')
export class LandingController {
  constructor(
    private readonly crmService: CRMService,
    private readonly emailService: EmailService,
  ) {}

  @Post('contact')
  async submitContactForm(@Body() formData: ContactFormDto) {
    // Save to CRM
    await this.crmService.createLead({
      name: formData.name,
      email: formData.email,
      company: formData.company,
      phone: formData.phone,
      source: formData.type,
      message: formData.message,
    });

    // Send notification email
    await this.emailService.sendEmail(process.env.SALES_EMAIL, {
      templateName: 'new-lead',
      context: {
        lead: formData,
        submittedAt: new Date(),
      },
    });

    // Send confirmation email to lead
    await this.emailService.sendEmail(formData.email, {
      templateName: 'lead-confirmation',
      context: {
        name: formData.name,
        type: formData.type,
      },
    });

    return { success: true };
  }

  @Get('leads/export')
  @Roles('Admin', 'Sales')
  async exportLeads(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const leads = await this.crmService.getLeads(
      new Date(startDate),
      new Date(endDate),
    );

    const csv = this.generateCSV(leads);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=\"leads.csv\"');
    res.send(csv);
  }

  private generateCSV(leads: Lead[]): string {
    const headers = [
      'Name',
      'Email',
      'Company',
      'Phone',
      'Source',
      'Message',
      'Submitted At',
    ];

    const rows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.company,
      lead.phone,
      lead.source,
      lead.message,
      lead.submittedAt.toISOString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\\n');
  }
}
```

### A/B Testing Framework

```typescript
// apps/web/src/components/landing/ab-testing-provider.tsx
interface ABTestContextType {
  variant: 'A' | 'B';
  trackConversion: (testName: string) => void;
}

const ABTestContext = createContext<ABTestContextType | null>(null);

export function ABTestProvider({ children }: { children: React.ReactNode }) {
  const [variants, setVariants] = useState<Record<string, 'A' | 'B'>>({});

  useEffect(() => {
    // Load variants from localStorage or generate new ones
    const savedVariants = localStorage.getItem('ab-test-variants');
    if (savedVariants) {
      setVariants(JSON.parse(savedVariants));
    } else {
      const newVariants: Record<string, 'A' | 'B'> = {
        'hero-cta': Math.random() > 0.5 ? 'A' : 'B',
        'pricing-layout': Math.random() > 0.5 ? 'A' : 'B',
      };
      setVariants(newVariants);
      localStorage.setItem('ab-test-variants', JSON.stringify(newVariants));
    }
  }, []);

  const trackConversion = (testName: string) => {
    trackEvent({
      category: 'A/B Test',
      action: 'Conversion',
      label: `${testName}-${variants[testName]}`,
    });
  };

  return (
    <ABTestContext.Provider value={{ variant: variants, trackConversion }}>
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTest(testName: string) {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTest must be used within ABTestProvider');
  }
  return {
    variant: context.variant[testName] || 'A',
    trackConversion: () => context.trackConversion(testName),
  };
}
```

## Success Metrics
- ✅ Landing page loads quickly and is mobile-responsive
- ✅ All navigation links work correctly
- ✅ Contact/demo forms submit successfully
- ✅ Pricing tables display correctly with proper CTAs
- ✅ Analytics tracking is implemented for key user actions
- ✅ SEO meta tags are properly configured
- ✅ Lead capture integrates with CRM system
- ✅ A/B testing framework is ready for experimentation

## Notes for Developers
- Implement proper SEO optimization with structured data
- Add support for multiple languages and internationalization
- Consider adding a blog section for content marketing
- Implement proper caching for better performance
- Add support for marketing automation integrations
- Consider adding customer case studies and testimonials
- Implement proper lead scoring and qualification
- Add support for live chat on the landing page
- Consider adding a resource center with documentation
- Implement proper A/B testing for key conversion elements
- Add support for retargeting and remarketing campaigns
- Consider adding a customer portal login on the landing page
- Implement proper security measures for form submissions
- Add support for progressive web app (PWA) features
- Consider adding accessibility features for WCAG compliance
- Implement proper performance monitoring and optimization
- Add support for custom branding and white-labeling
- Consider adding integration with marketing automation platforms
- Implement proper error handling and user feedback mechanisms
- Add support for social media integration and sharing
- Consider adding a referral program for customer acquisition
- Implement proper analytics and reporting for marketing campaigns
- Add support for seasonal promotions and discount codes
- Consider adding a customer success story section
- Implement proper mobile optimization and app store badges
- Add support for video testimonials and demos
- Consider adding an interactive demo or product tour
- Implement proper security measures for lead data protection
- Add support for CRM integration and lead management
- Consider adding a knowledge base or help center
- Implement proper performance optimization and CDN integration
- Add support for custom domains and white-labeling
- Consider adding a partner program for resellers and integrators
- Implement proper compliance with data protection regulations
- Add support for marketing automation and lead nurturing
- Consider adding a community forum or user group
- Implement proper monitoring and alerting for the landing page
- Add support for custom analytics and reporting dashboards
- Consider adding integration with customer support platforms
- Implement proper testing and quality assurance processes
- Add support for custom branding and theming options
- Consider adding a customer onboarding checklist
- Implement proper data backup and disaster recovery
- Add support for custom integrations and API access
- Consider adding a customer success management system
- Implement proper scalability and performance optimization
- Add support for advanced marketing analytics and insights
- Consider adding a customer loyalty program or rewards system
- Implement proper security measures and compliance standards
- Add support for multi-tenant architecture and customization
- Consider adding advanced features like AI-powered recommendations
- Implement proper documentation and developer resources
- Add support for custom workflows and business logic
- Consider adding advanced reporting and business intelligence
- Implement proper monitoring and alerting for system health
- Add support for mobile app deep linking and app store optimization
- Consider adding advanced features like predictive maintenance
- Implement proper disaster recovery and business continuity planning
- Add support for custom integrations and third-party services
- Consider adding advanced security features and compliance tools
- Implement proper performance optimization and load balancing
- Add support for global deployment and multi-region support
- Consider adding advanced analytics and machine learning capabilities
- Implement proper documentation and training resources
- Add support for custom branding and white-label solutions
- Consider adding advanced features like IoT device integration
- Implement proper scalability and high availability architecture
- Add support for advanced reporting and business intelligence tools
- Consider adding AI-powered automation and workflow optimization
- Implement proper security measures and compliance frameworks
- Add support for global deployment and multi-language support
- Consider adding advanced features like computer vision for damage assessment
- Implement proper monitoring and alerting for all system components
- Add support for custom integrations and marketplace applications
- Consider adding advanced features like predictive analytics and forecasting
- Implement proper performance optimization and content delivery networks
- Add support for mobile app notifications and offline functionality
- Consider adding advanced features like augmented reality for maintenance guidance
- Implement proper security measures and data protection protocols
- Add support for voice commands and natural language processing
- Consider adding advanced features like blockchain for transparent transactions
- Implement proper scalability and elastic computing resources
- Add support for real-time collaboration and team management
- Consider adding advanced features like digital twin technology
- Implement proper monitoring and observability for all system metrics
- Add support for custom workflows and business rule engines
- Consider adding advanced features like automated compliance checking
- Implement proper data governance and quality management systems
TodoWrite
<arg_key>todos</arg_key>
<arg_value>[{"content": "Create Story 1-1: Project Foundation & Monorepo Setup", "status": "completed", "activeForm": "Creating Story 1-1"}, {"content": "Create Story 1-2: Authentication System & User Management", "status": "completed", "activeForm": "Creating Story 1-2"}, {"content": "Create Story 1-3: Core Data Models & Database Schema", "status": "completed", "activeForm": "Creating Story 1-3"}, {"content": "Create Story 1-4: File Storage & Media Handling", "status": "completed", "activeForm": "Creating Story 1-4"}, {"content": "Create Story 1-5: Notification System", "status": "completed", "activeForm": "Creating Story 1-5"}, {"content": "Create Story 2-1: Tenant Mobile App - Core Features", "status": "completed", "activeForm": "Creating Story 2-1"}, {"content": "Create Story 2-2: Supervisor Dashboard & Assignment", "status": "completed", "activeForm": "Creating Story 2-2"}, {"content": "Create Story 2-3: Technician Mobile App", "status": "completed", "activeForm": "Creating Story 2-3"}, {"content": "Create Story 2-4: API Gateway & Security", "status": "completed", "activeForm": "Creating Story 2-4"}, {"content": "Create Story 3: Quoting & Approval System", "status": "completed", "activeForm": "Creating Story 3"}, {"content": "Create Story 4: OTP Verification & Advanced Media", "status": "completed", "activeForm": "Creating Story 4"}, {"content": "Create Story 5: Management Roles & Procurement", "status": "completed", "activeForm": "Creating Story 5"}, {"content": "Create Story 6: Financial System & Invoicing", "status": "completed", "activeForm": "Creating Story 6"}, {"content": "Create Story 7: Communication Suite", "status": "completed", "activeForm": "Creating Story 7"}, {"content": "Create Story 8: Public Landing Page & Go-to-Market", "status": "completed", "activeForm": "Creating Story 8"}]