import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Users, Rocket } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

interface TeamPageProps {
  onNavigate: (page: string) => void;
}

export function TeamPage({ onNavigate }: TeamPageProps) {
  usePageTitle('Team');

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">Team Collaboration</h1>
        <p className="text-gray-500 text-lg mb-2">
          Coming Soon
        </p>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-8">
          Invite team members, assign roles, and collaborate on surveys together.
          Team features will be available in a future update.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" className="gap-2" onClick={() => onNavigate('surveys')}>
            <Rocket className="w-4 h-4" />
            Back to Surveys
          </Button>
        </div>

        {/* Feature Preview */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-left">
          {[
            { title: 'Invite Members', desc: 'Add team members by email and manage permissions' },
            { title: 'Role Management', desc: 'Assign Owner, Admin, Member, or Viewer roles' },
            { title: 'Shared Surveys', desc: 'Collaborate on surveys and share analytics with your team' },
          ].map((feature, i) => (
            <Card key={i} className="p-5 opacity-70">
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
