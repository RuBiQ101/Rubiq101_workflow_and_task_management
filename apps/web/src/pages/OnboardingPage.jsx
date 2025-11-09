import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import OnboardingSteps from '../components/onboarding/OnboardingSteps';
import CreateProjectModal from '../components/onboarding/CreateProjectModal';
import api from '../api/client';
import { markOnboardingComplete, isFirstRun } from '../lib/onboarding';
import { Button } from '../components/ui/Button';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [openCreate, setOpenCreate] = useState(false);
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user and their workspaces
    Promise.all([
      api.get('/auth/me'),
      api.get('/workspaces')
    ])
      .then(([{ data: userData }, { data: workspacesData }]) => {
        setUser(userData);
        
        // Get the first workspace or use default
        const firstWorkspace = workspacesData?.[0] || workspacesData?.data?.[0];
        if (firstWorkspace?.id) {
          setWorkspaceId(firstWorkspace.id);
          console.log('Using workspace:', firstWorkspace.id, firstWorkspace.name);
        } else {
          console.error('No workspace found for user');
        }
        
        setLoading(false);
        
        // If not first run OR user has completed onboarding, redirect to dashboard
        if (!isFirstRun() || userData?.onboardingComplete) {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch((error) => {
        console.error('Failed to fetch user/workspaces:', error);
        setLoading(false);
        // If auth fails, redirect to login
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  async function onProjectCreated(project) {
    // Mark onboarding as complete locally
    markOnboardingComplete();
    
    // Optionally mark complete on server
    try {
      if (project.organizationId) {
        await api.post(`/organization/${project.organizationId}/onboarding/complete`, {});
      }
    } catch (err) {
      console.warn('Failed to mark onboarding complete on server:', err);
      // It's OK if server call fails; local marker keeps UX smooth
    }
    
    // Redirect to the newly created project
    navigate(`/projects/${project.id}`);
  }

  function handleSkip() {
    markOnboardingComplete();
    navigate('/dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/30 to-white p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Left side - Main content */}
          <div className="flex flex-col gap-6">
            <div>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl mb-4"
              >
                🎉
              </motion.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome to Workflo
              </h1>
              <p className="text-gray-600">
                Let's set up your first project — it only takes a minute. We'll create a workspace, 
                invite teammates later, and show you the essentials.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                {
                  num: 1,
                  title: 'Create your first project',
                  desc: 'Name and basic settings — you can customize later.',
                },
                {
                  num: 2,
                  title: 'Add a couple of tasks',
                  desc: 'Start with one or two tasks to see the board in action.',
                },
                {
                  num: 3,
                  title: 'Invite teammates (optional)',
                  desc: 'You can invite collaborators now or later from the project settings.',
                },
              ].map((step, i) => (
                <motion.li
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex gap-3 items-start"
                >
                  <div className="rounded-full bg-indigo-100 text-indigo-600 w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{step.title}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{step.desc}</div>
                  </div>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 mt-auto pt-4"
            >
              <Button
                onClick={() => setOpenCreate(true)}
                size="lg"
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create first project
              </Button>

              <Button
                onClick={handleSkip}
                variant="outline"
                size="lg"
                aria-label="Skip onboarding"
              >
                Skip for now
              </Button>
            </motion.div>

            <div className="text-xs text-gray-500 text-center">
              You can always create projects later from your dashboard
            </div>
          </div>

          {/* Right side - Feature highlights */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-indigo-50/50 rounded-xl">
            <OnboardingSteps />
          </div>
        </motion.div>
      </div>

      <CreateProjectModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={onProjectCreated}
        workspaceId={workspaceId}
      />
    </div>
  );
}
