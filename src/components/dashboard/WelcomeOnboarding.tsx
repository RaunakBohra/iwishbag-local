import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Play,
  Gift,
  Globe,
  ShieldCheck,
  X,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/design-system';

interface WelcomeOnboardingProps {
  userName: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({
  userName,
  onDismiss,
  showDismiss = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to iwishBag!',
      description: 'Your gateway to shopping from anywhere in the world.',
      icon: <Sparkles className="w-8 h-8 text-teal-600" />,
      action: {
        label: 'Get Started',
        onClick: () => setCurrentStep(1),
      },
    },
    {
      id: 'howItWorks',
      title: 'How It Works',
      description: 'Simple 3-step process to get products delivered globally.',
      icon: <Globe className="w-8 h-8 text-blue-600" />,
      steps: [
        '1. Request a quote for any product',
        '2. We calculate all costs (shipping, customs, taxes)',
        '3. Approve and we handle everything else!',
      ],
      action: {
        label: 'Request My First Quote',
        link: '/quote',
      },
    },
  ];

  const benefits = [
    {
      icon: <Globe className="w-5 h-5 text-blue-600" />,
      title: 'Global Shopping',
      description: 'Shop from Amazon, eBay, Alibaba and more',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-green-600" />,
      title: 'No Hidden Fees',
      description: 'Transparent pricing with all costs upfront',
    },
    {
      icon: <Gift className="w-5 h-5 text-purple-600" />,
      title: 'Expert Handling',
      description: 'We manage customs, shipping, and delivery',
    },
  ];

  const currentStepData = onboardingSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 border-2 border-teal-200 mb-8">
          {/* Dismiss button */}
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors z-10"
              aria-label="Dismiss welcome message"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}

          <CardContent className="relative p-8">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    {currentStepData.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200">New User</Badge>
                      <span className="text-sm text-gray-600">
                        Step {currentStep + 1} of {onboardingSteps.length}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {currentStep === 0 ? `Welcome, ${userName}!` : currentStepData.title}
                    </h2>
                    <p className="text-gray-700 text-lg">{currentStepData.description}</p>
                  </div>
                </div>
              </div>

              {/* Content based on current step */}
              {currentStep === 0 ? (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {benefit.icon}
                        <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="mb-8">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                    <h3 className="font-semibold text-gray-900 mb-4">Getting Started is Easy:</h3>
                    <div className="space-y-3">
                      {currentStepData.steps?.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                          className="flex items-center gap-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="text-gray-700">{step}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {currentStepData.action.link ? (
                  <Link to={currentStepData.action.link}>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 shadow-lg group"
                    >
                      {currentStepData.action.label}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    onClick={currentStepData.action.onClick}
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 shadow-lg group"
                  >
                    {currentStepData.action.label}
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}

                {currentStep === 0 && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Demo
                  </Button>
                )}

                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(0)}
                    className="w-full sm:w-auto bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white"
                  >
                    Back
                  </Button>
                )}
              </div>

              {/* Progress indicator */}
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  {onboardingSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'w-3 h-3 rounded-full transition-all duration-200',
                        index === currentStep
                          ? 'bg-teal-600 scale-110'
                          : 'bg-white/60 hover:bg-white/80',
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
