import type { Question } from '../types/survey';

export interface SurveyTemplate {
  title: string;
  description: string;
  questions: Question[];
}

export type TemplateCategory =
  | 'Customers'
  | 'Employees'
  | 'Markets'
  | 'Students'
  | 'Website / App Visitors'
  | 'Events & Scheduling'
  | 'Community';

export interface TemplateMeta {
  id: string;
  category: TemplateCategory;
}

export const templateQuestions: Record<string, SurveyTemplate> = {
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
      { id: 'q3', type: 'long', text: "What features do competitors offer that we don't?", required: false },
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
  'remote-work': {
    title: 'Remote Work Check-In',
    description: 'Monitor remote employee wellbeing, productivity, and needs',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate your work-life balance this week?', required: true, options: { scale: 5, lowLabel: 'Very poor', highLabel: 'Excellent' } },
      { id: 'q2', type: 'multiple', text: 'I feel connected to my team while working remotely.', required: true, options: { choices: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] } },
      { id: 'q3', type: 'multiple', text: 'I have the tools and technology I need to work effectively.', required: true, options: { choices: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] } },
      { id: 'q4', type: 'checkbox', text: 'What is your biggest challenge working remotely?', required: false, options: { choices: ['Isolation', 'Distractions at home', 'Communication gaps', 'Work-life boundaries', 'Tech issues', 'Other'] } },
      { id: 'q5', type: 'long', text: 'What additional support would help you?', required: false },
    ],
  },
  'event-feedback': {
    title: 'Event Feedback',
    description: 'Gather feedback after conferences, workshops, meetings, or social events',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate the event overall?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'rating', text: 'How well was the event organized?', required: true, options: { scale: 5 } },
      { id: 'q3', type: 'multiple', text: 'The event met my expectations.', required: true, options: { choices: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] } },
      { id: 'q4', type: 'rating', text: 'How would you rate the speakers/presenters?', required: false, options: { scale: 5 } },
      { id: 'q5', type: 'long', text: 'What was your favorite part of the event?', required: false },
      { id: 'q6', type: 'long', text: 'What could be improved for future events?', required: false },
    ],
  },
  'scheduling-poll': {
    title: 'Scheduling Poll',
    description: 'Find the best time for meetings, events, or appointments',
    questions: [
      { id: 'q1', type: 'checkbox', text: 'Please select all times that work for you:', required: true, options: { choices: ['Monday morning', 'Monday afternoon', 'Tuesday morning', 'Tuesday afternoon', 'Wednesday morning', 'Wednesday afternoon', 'Thursday morning', 'Thursday afternoon', 'Friday morning', 'Friday afternoon'] } },
      { id: 'q2', type: 'short', text: 'Do you have a strong preference for any specific time?', required: false },
      { id: 'q3', type: 'dropdown', text: 'Preferred meeting format:', required: true, options: { choices: ['In-person', 'Video call', 'Phone call', 'No preference'] } },
      { id: 'q4', type: 'dropdown', text: 'Expected duration needed:', required: true, options: { choices: ['15 minutes', '30 minutes', '1 hour', '1.5 hours', '2+ hours'] } },
    ],
  },
  'volunteer-feedback': {
    title: 'Volunteer Feedback',
    description: 'Collect feedback from volunteers about their experience',
    questions: [
      { id: 'q1', type: 'rating', text: 'How would you rate your overall volunteer experience?', required: true, options: { scale: 5 } },
      { id: 'q2', type: 'multiple', text: 'I felt welcomed and appreciated as a volunteer.', required: true, options: { choices: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] } },
      { id: 'q3', type: 'multiple', text: 'I received adequate training for my role.', required: true, options: { choices: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'] } },
      { id: 'q4', type: 'long', text: 'What did you enjoy most about volunteering?', required: false },
      { id: 'q5', type: 'multiple', text: 'Would you volunteer with us again?', required: true, options: { choices: ['Yes', 'No', 'Maybe'] } },
    ],
  },
  'employee-complaint': {
    title: 'Employee Complaint Form',
    description: 'Allow employees to submit workplace complaints or concerns confidentially',
    questions: [
      { id: 'q1', type: 'short', text: 'Your name (or leave blank for anonymous):', required: false },
      { id: 'q2', type: 'dropdown', text: 'Type of complaint:', required: true, options: { choices: ['Harassment', 'Discrimination', 'Safety Concern', 'Policy Violation', 'Interpersonal Conflict', 'Other'] } },
      { id: 'q3', type: 'date', text: 'Date of incident:', required: true },
      { id: 'q4', type: 'long', text: 'Describe what happened:', required: true },
      { id: 'q5', type: 'multiple', text: 'Have you reported this to anyone else?', required: true, options: { choices: ['Yes', 'No'] } },
      { id: 'q6', type: 'long', text: 'What resolution would you like to see?', required: false },
    ],
  },
};

export const templateMeta: TemplateMeta[] = [
  { id: 'csat', category: 'Customers' },
  { id: 'nps', category: 'Customers' },
  { id: 'engagement', category: 'Employees' },
  { id: 'onboarding', category: 'Employees' },
  { id: 'remote-work', category: 'Employees' },
  { id: 'employee-complaint', category: 'Employees' },
  { id: 'market-research', category: 'Markets' },
  { id: 'competitor', category: 'Markets' },
  { id: 'course-eval', category: 'Students' },
  { id: 'student-satisfaction', category: 'Students' },
  { id: 'website-usability', category: 'Website / App Visitors' },
  { id: 'app-feedback', category: 'Website / App Visitors' },
  { id: 'event-feedback', category: 'Events & Scheduling' },
  { id: 'scheduling-poll', category: 'Events & Scheduling' },
  { id: 'volunteer-feedback', category: 'Community' },
];

export const templateCategories: TemplateCategory[] = [
  'Customers',
  'Employees',
  'Markets',
  'Students',
  'Website / App Visitors',
  'Events & Scheduling',
  'Community',
];
