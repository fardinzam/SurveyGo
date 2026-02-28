import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './Card';
import { Button } from './Button';
import { Sparkles, Send, Users, Briefcase, TrendingUp, GraduationCap, Globe, Loader2, Plus } from 'lucide-react';
import { useCreateSurvey } from '../../hooks/useSurveys';
import type { Question } from '../../types/survey';

interface TemplatesBrowsePageProps {
  onNavigate: (page: string) => void;
}

// Pre-defined question sets for each template
const templateQuestions: Record<string, { title: string; description: string; questions: Question[] }> = {
  'csat': {
    title: 'Customer Satisfaction (CSAT)',
    description: 'Measure overall customer satisfaction with your product or service',
    questions: [
      { id: 'q1', type: 'rating', text: 'How satisfied are you with our product/service?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'How often do you use our product/service?', required: true, options: { choices: ['Daily', 'Weekly', 'Monthly', 'Rarely'] } },
      { id: 'q3', type: 'long', text: 'What do you like most about our product/service?', required: false },
      { id: 'q4', type: 'long', text: 'What could we improve?', required: false },
    ],
  },
  'nps': {
    title: 'Net Promoter Score (NPS)',
    description: 'Calculate customer loyalty and likelihood to recommend',
    questions: [
      { id: 'q1', type: 'rating', text: 'How likely are you to recommend us to a friend or colleague?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'long', text: 'What is the primary reason for your score?', required: true },
      { id: 'q3', type: 'long', text: 'What could we do to improve your experience?', required: false },
    ],
  },
  'engagement': {
    title: 'Employee Engagement',
    description: 'Assess employee satisfaction, motivation, and workplace culture',
    questions: [
      { id: 'q1', type: 'rating', text: 'How satisfied are you with your work environment?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'rating', text: 'Do you feel valued by your team and management?', required: true, options: { scale: 5 } },
      { id: 'q3', type: 'multiple', text: 'What motivates you most at work?', required: true, options: { choices: ['Career growth', 'Compensation', 'Team culture', 'Work-life balance', 'Learning opportunities'] } },
      { id: 'q4', type: 'long', text: 'Any suggestions for improving the workplace?', required: false },
    ],
  },
  'onboarding': {
    title: 'Onboarding Feedback',
    description: 'Gather insights from new hires about their onboarding experience',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate your overall onboarding experience?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'Did you feel adequately prepared for your role?', required: true, options: { choices: ['Very prepared', 'Somewhat prepared', 'Not very prepared', 'Not prepared at all'] } },
      { id: 'q3', type: 'long', text: 'What was most helpful during your onboarding?', required: false },
      { id: 'q4', type: 'long', text: 'What would you change about the onboarding process?', required: false },
    ],
  },
  'market-research': {
    title: 'Market Research',
    description: 'Understand market trends, customer needs, and opportunities',
    questions: [
      { id: 'q1', type: 'multiple', text: 'How did you first hear about our product?', required: true, options: { choices: ['Social media', 'Search engine', 'Word of mouth', 'Advertisement', 'Other'] } },
      { id: 'q2', type: 'rating', text: 'How would you rate the value for money of our product?', required: true, options: { scale: 5 } },
      { id: 'q3', type: 'long', text: 'What problem does our product solve for you?', required: true },
    ],
  },
  'competitor': {
    title: 'Competitor Analysis',
    description: 'Gather data on competitor products and market positioning',
    questions: [
      { id: 'q1', type: 'multiple', text: 'Which competitor products have you used?', required: true, options: { choices: ['Competitor A', 'Competitor B', 'Competitor C', 'None'] } },
      { id: 'q2', type: 'rating', text: 'How does our product compare to alternatives?', required: true, options: { scale: 5 } },
      { id: 'q3', type: 'long', text: 'What features do competitors offer that we don\'t?', required: false },
    ],
  },
  'course-eval': {
    title: 'Course Evaluation',
    description: 'Collect student feedback on course content and teaching quality',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate the overall quality of this course?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'rating', text: 'How effective was the instructor?', required: true, options: { scale: 5 } },
      { id: 'q3', type: 'long', text: 'What was the most valuable part of this course?', required: false },
      { id: 'q4', type: 'long', text: 'How could this course be improved?', required: false },
    ],
  },
  'student-satisfaction': {
    title: 'Student Satisfaction',
    description: 'Measure overall student experience and satisfaction levels',
    questions: [
      { id: 'q1', type: 'rating', text: 'How satisfied are you with your academic experience?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'What aspect of your experience needs the most improvement?', required: true, options: { choices: ['Academic support', 'Campus facilities', 'Social activities', 'Career services'] } },
      { id: 'q3', type: 'long', text: 'Additional comments or suggestions?', required: false },
    ],
  },
  'website-usability': {
    title: 'Website Usability',
    description: 'Test and improve your website user experience and navigation',
    questions: [
      { id: 'q1', type: 'rating', text: 'How easy is it to navigate our website?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'Were you able to find what you were looking for?', required: true, options: { choices: ['Yes, easily', 'Yes, with some difficulty', 'No'] } },
      { id: 'q3', type: 'long', text: 'What would improve your experience on our website?', required: false },
    ],
  },
  'app-feedback': {
    title: 'App Feedback',
    description: 'Gather user feedback on app features, design, and performance',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate the overall app experience?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'What feature do you use most?', required: true, options: { choices: ['Feature A', 'Feature B', 'Feature C', 'Feature D'] } },
      { id: 'q3', type: 'long', text: 'What new features would you like to see?', required: false },
    ],
  },
};

export function TemplatesBrowsePage({ onNavigate }: TemplatesBrowsePageProps) {
  const navigate = useNavigate();
  const [aiPrompt, setAiPrompt] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const createSurvey = useCreateSurvey();

  const handleUseTemplate = async (templateId: string) => {
    const template = templateQuestions[templateId];
    if (!template) return;

    setCreatingId(templateId);
    try {
      const newId = await createSurvey.mutateAsync({
        title: template.title,
        description: template.description,
        questions: template.questions,
      });
      navigate(`/app/surveys/${newId}/edit`);
    } finally {
      setCreatingId(null);
    }
  };

  const handleCreateBlank = async () => {
    setCreatingId('blank');
    try {
      const newId = await createSurvey.mutateAsync({
        title: 'Untitled Survey',
        description: '',
        questions: [],
      });
      navigate(`/app/surveys/${newId}/edit`);
    } finally {
      setCreatingId(null);
    }
  };

  const templateCategories = [
    {
      category: 'Customers',
      icon: Users,
      color: 'from-blue-100 to-blue-200',
      templates: [
        { id: 'csat', name: 'Customer Satisfaction (CSAT)', description: 'Measure overall customer satisfaction with your product or service' },
        { id: 'nps', name: 'Net Promoter Score (NPS)', description: 'Calculate customer loyalty and likelihood to recommend' },
      ],
    },
    {
      category: 'Employees',
      icon: Briefcase,
      color: 'from-green-100 to-green-200',
      templates: [
        { id: 'engagement', name: 'Employee Engagement', description: 'Assess employee satisfaction, motivation, and workplace culture' },
        { id: 'onboarding', name: 'Onboarding Feedback', description: 'Gather insights from new hires about their onboarding experience' },
      ],
    },
    {
      category: 'Markets',
      icon: TrendingUp,
      color: 'from-purple-100 to-purple-200',
      templates: [
        { id: 'market-research', name: 'Market Research', description: 'Understand market trends, customer needs, and opportunities' },
        { id: 'competitor', name: 'Competitor Analysis', description: 'Gather data on competitor products and market positioning' },
      ],
    },
    {
      category: 'Students',
      icon: GraduationCap,
      color: 'from-orange-100 to-orange-200',
      templates: [
        { id: 'course-eval', name: 'Course Evaluation', description: 'Collect student feedback on course content and teaching quality' },
        { id: 'student-satisfaction', name: 'Student Satisfaction', description: 'Measure overall student experience and satisfaction levels' },
      ],
    },
    {
      category: 'Website / App Visitors',
      icon: Globe,
      color: 'from-pink-100 to-pink-200',
      templates: [
        { id: 'website-usability', name: 'Website Usability', description: 'Test and improve your website user experience and navigation' },
        { id: 'app-feedback', name: 'App Feedback', description: 'Gather user feedback on app features, design, and performance' },
      ],
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-3">Create Your Survey</h1>
        <p className="text-gray-500 text-lg">
          Let AI build it for you, or choose from our expert templates
        </p>
      </div>

      {/* AI Input Section */}
      <Card className="p-8 mb-8 bg-gradient-to-br from-white to-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Let AI Build It for You</h2>
          </div>
          <p className="text-gray-500 mb-4">Describe the survey you need and we'll create it instantly</p>
          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Create a customer satisfaction survey for my SaaS product with questions about usability, support quality, and likelihood to recommend..."
              className="w-full h-28 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-14"
            />
            <button
              onClick={handleCreateBlank}
              disabled={createSurvey.isPending}
              className="absolute bottom-4 right-4 w-10 h-10 bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {creatingId === 'ai' ? (
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Browse by Category */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Browse by Category</h2>
        <p className="text-gray-500">Choose from professionally designed templates</p>
      </div>

      {/* Template Categories */}
      <div className="space-y-12">
        {templateCategories.map((category) => {
          const CategoryIcon = category.icon;

          return (
            <div key={category.category}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                  <CategoryIcon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{category.category}</h3>
              </div>

              {/* Template Cards */}
              <div className="grid grid-cols-2 gap-6">
                {category.templates.map((template) => (
                  <Card
                    key={template.id}
                    hover
                    className="p-6 cursor-pointer group"
                  >
                    <h4 className="font-semibold text-foreground mb-2 text-lg group-hover:text-primary transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                      {template.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleUseTemplate(template.id)}
                      disabled={createSurvey.isPending}
                    >
                      {creatingId === template.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      Use Template
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start from Scratch — below categories */}
      <Card className="p-6 mt-12 bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Start from Scratch</h2>
              <p className="text-gray-500 text-sm">Create a blank survey and build it exactly how you want</p>
            </div>
          </div>
          <Button
            variant="primary"
            className="gap-2"
            onClick={handleCreateBlank}
            disabled={createSurvey.isPending}
          >
            {creatingId === 'blank' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Blank Survey
          </Button>
        </div>
      </Card>
    </div>
  );
}
