import React from 'react';
import { LiveFeed } from './live/LiveFeed';
import { Language } from '../types';

interface HostPageProps {
  onBack: () => void;
  lang?: Language;
  isCreativeHub?: boolean;
}

export const HostPage: React.FC<HostPageProps> = ({ onBack, lang = 'ar', isCreativeHub = false }) => {
  return (
    <div className="w-full h-full">
      <LiveFeed 
        onBack={onBack} 
        initialMode="setup" 
        lang={lang}
        isCreativeHub={isCreativeHub}
      />
    </div>
  );
};

export default HostPage;
