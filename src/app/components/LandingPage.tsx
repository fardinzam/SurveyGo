import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Sparkles, Palette, TrendingUp, CheckCircle, Users, Download, LayoutTemplate, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Analysis',
      description: 'Get instant insights with sentiment analysis and theme extraction powered by advanced AI'
    },
    {
      icon: Palette,
      title: 'Beautiful Survey Builder',
      description: 'Create stunning surveys in minutes with our intuitive drag-and-drop builder'
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Insights',
      description: 'Watch responses come in live and analyze trends as they happen'
    }
  ];

  const benefits = [
    { icon: CheckCircle, label: 'Unlimited Surveys' },
    { icon: Sparkles, label: 'AI Sentiment Analysis' },
    { icon: Users, label: 'Team Collaboration' },
    { icon: Palette, label: 'Custom Branding' },
    { icon: Download, label: 'Export & Share' },
    { icon: LayoutTemplate, label: 'Templates Library' }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: ['Up to 5 surveys', '100 responses/month', 'Basic analytics', 'Email support'],
      cta: 'Get Started Free',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$19',
      description: 'For individuals and freelancers',
      features: ['Unlimited surveys', 'Unlimited responses', 'AI-powered insights', 'Priority support', 'Custom branding', 'Export data'],
      cta: 'Start Free Trial',
      highlighted: true
    },
    {
      name: 'Team',
      price: '$49',
      description: 'For growing teams',
      features: ['Everything in Pro', 'Team collaboration', 'Advanced integrations', 'White-label surveys', 'Dedicated support', 'API access'],
      cta: 'Start Free Trial',
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">S</span>
            </div>
            <span className="text-lg font-bold text-foreground">SurveyGo</span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#templates" className="text-muted-foreground hover:text-foreground transition-colors">Templates</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onNavigate('login')}>
              Log In
            </Button>
            <Button variant="primary" onClick={() => onNavigate('signup')}>
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 py-20 text-center">
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-6xl font-bold text-foreground mb-6 leading-tight">
            Transform feedback into
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"> actionable insights</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Create beautiful surveys, collect responses, and analyze feedback with AI-powered insights. 
            The modern alternative to Google Forms.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => onNavigate('signup')}>
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Product Mockup */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border-8 border-white" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-foreground" />
              </div>
              <p className="text-muted-foreground">Dashboard Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Logos */}
      <section className="py-12 border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-center text-muted-foreground mb-8 font-medium">Trusted by thousands worldwide</p>
          <div className="flex items-center justify-center gap-12 opacity-40">
            {['Company A', 'Brand B', 'Corp C', 'Business D', 'Startup E', 'Firm F'].map((name, i) => (
              <div key={i} className="text-2xl font-bold text-muted-foreground">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Everything you need to succeed</h2>
          <p className="text-xl text-muted-foreground">Powerful features to help you collect and analyze feedback</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} hover className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="flex items-start justify-between max-w-5xl mx-auto">
            {[
              { number: '1', title: 'Create', description: 'Build your survey with AI or choose a template' },
              { number: '2', title: 'Share', description: 'Distribute via link, email, or embed on your site' },
              { number: '3', title: 'Analyze', description: 'Get instant AI-powered insights from responses' }
            ].map((step, index) => (
              <div key={index} className="flex-1 text-center relative">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl font-bold text-foreground mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {index < 2 && (
                  <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-muted"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-video flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Full Dashboard Screenshot</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Benefits Grid */}
      <section className="bg-card py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Why choose SurveyGo?</h2>
            <p className="text-xl text-muted-foreground">All the features you need, none of the complexity</p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="flex items-center gap-4 p-6 bg-background rounded-xl">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="font-semibold text-foreground">{benefit.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-muted-foreground">Choose the plan that's right for you</p>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index} 
              className={`p-8 ${plan.highlighted ? 'ring-2 ring-primary shadow-xl' : ''}`}
            >
              {plan.highlighted && (
                <div className="bg-primary text-foreground text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              <Button 
                variant={plan.highlighted ? 'primary' : 'outline'} 
                className="w-full mb-6"
                onClick={() => onNavigate('signup')}
              >
                {plan.cta}
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-[#1E1E2E] to-[#2A2A3E] py-20">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to transform your feedback?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands who are already using SurveyGo to collect meaningful insights
          </p>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => onNavigate('signup')}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-muted-foreground mt-4">No credit card required • Free forever plan</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">S</span>
                </div>
                <span className="text-lg font-bold text-foreground">SurveyGo</span>
              </div>
              <p className="text-muted-foreground">
                The modern survey platform for everyone. Create, share, and analyze surveys with ease.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Templates</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex items-center justify-between">
            <p className="text-muted-foreground text-sm">© 2026 SurveyGo. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground">Twitter</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">LinkedIn</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
