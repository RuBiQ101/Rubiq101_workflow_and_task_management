# Onboarding Flow

## Overview

The onboarding flow guides new users through their first project creation in Workflo. It's triggered automatically for first-time users after registration or login.

## Components

### 1. **OnboardingPage** (`src/pages/OnboardingPage.jsx`)
Main onboarding page that shows:
- Welcome message with Workflo branding
- 3-step guide for getting started
- Feature highlights panel
- "Create first project" and "Skip" buttons

### 2. **OnboardingSteps** (`src/components/onboarding/OnboardingSteps.jsx`)
Displays feature highlights with animated cards:
- Boards that work like you
- Real-time collaboration
- Attach files & comments
- Keyboard shortcuts tip

### 3. **CreateProjectModal** (`src/components/onboarding/CreateProjectModal.jsx`)
Modal for creating the first project:
- Project name input (required)
- Description textarea (optional)
- Keyboard shortcuts (Ctrl+Enter to create, Esc to close)
- Error handling

### 4. **Onboarding Helper** (`src/lib/onboarding.js`)
Utility functions for tracking onboarding status:
- `isFirstRun()` - Checks if user is new (localStorage flag)
- `markOnboardingComplete()` - Marks onboarding as done locally

## Flow

1. **User registers/logs in** → LoginPage checks if it's a first-time user
2. **If first-time** → Redirect to `/onboarding`
3. **User clicks "Create first project"** → Opens CreateProjectModal
4. **After project created** → Marks onboarding complete & redirects to project page
5. **User clicks "Skip"** → Marks onboarding complete & redirects to dashboard

## Integration Points

### App.jsx Routes
```jsx
<Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
```

### LoginPage
After successful login/registration:
- Fetches user data via `/auth/me`
- Checks `isFirstRun()` and `userData.onboardingComplete`
- Redirects to `/onboarding` if needed

### API Endpoints Used
- `GET /auth/me` - Fetch current user
- `POST /projects` - Create new project
- `POST /organization/:orgId/onboarding/complete` - Mark onboarding complete (optional)

## Customization

### Skip Behavior
Users can skip onboarding and access the dashboard directly. The onboarding won't show again once marked complete.

### Server-Side Tracking (Optional)
Add `onboardingComplete` boolean field to your User model and implement:
```javascript
POST /organization/:orgId/onboarding/complete
```

This ensures onboarding status persists across devices/browsers.

### Styling
All components use Tailwind CSS with:
- Gradient backgrounds (indigo → purple → white)
- Framer Motion animations
- Lucide React icons
- shadcn/ui-style components

## Accessibility

- Keyboard navigation support (Tab, Enter, Escape)
- ARIA labels on buttons
- Focus management in modals
- Screen reader friendly

## Testing

To test the onboarding flow:
1. Clear localStorage: `localStorage.removeItem('workflo_onboarding_v1')`
2. Log out and log back in
3. You'll be redirected to `/onboarding`
