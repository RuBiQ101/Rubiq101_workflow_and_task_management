import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function DebugPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const runTests = async () => {
    setLoading(true);
    const testResults = {};
    
    console.log('=== STARTING DEBUG TESTS ===');
    
    try {
      // Test 1: Check localStorage
      console.log('Test 1: Checking localStorage...');
      const token = localStorage.getItem('token');
      testResults.localStorage = {
        hasToken: !!token,
        token: token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
        allKeys: Object.keys(localStorage)
      };
      console.log('localStorage test result:', testResults.localStorage);

      // Test 2: Check environment variables
      console.log('Test 2: Checking environment...');
      testResults.environment = {
        VITE_API_BASE: import.meta.env.VITE_API_BASE,
        VITE_API_URL: import.meta.env.VITE_API_URL,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD
      };
      console.log('Environment test result:', testResults.environment);

      // Test 3: Test public health endpoint
      console.log('Test 3: Testing health endpoint...');
      try {
        const healthTest = await fetch('http://localhost:3000/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const healthData = await healthTest.json().catch(() => healthTest.text());
        testResults.healthEndpoint = { 
          status: 'success', 
          httpStatus: healthTest.status,
          data: healthData 
        };
        console.log('Health test SUCCESS:', testResults.healthEndpoint);
      } catch (err) {
        testResults.healthEndpoint = { 
          status: 'error', 
          error: err.message,
          stack: err.stack
        };
        console.error('Health test FAILED:', testResults.healthEndpoint);
      }

      // Test 4: Test login endpoint
      console.log('Test 4: Testing login endpoint...');
      try {
        const loginTest = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'demo@example.com',
            password: 'demo123'
          })
        });
        const loginData = await loginTest.json();
        testResults.loginEndpoint = { 
          status: 'success', 
          httpStatus: loginTest.status,
          data: loginData,
          hasAccessToken: !!loginData.access_token || !!loginData.accessToken
        };
        console.log('Login test SUCCESS:', testResults.loginEndpoint);
      } catch (err) {
        testResults.loginEndpoint = { 
          status: 'error', 
          error: err.message,
          response: err.response?.data,
          statusCode: err.response?.status
        };
        console.error('Login test FAILED:', testResults.loginEndpoint);
      }

      // Test 5: Test protected endpoint with axios client
      console.log('Test 5: Testing protected endpoint with stored token...');
      if (token) {
        try {
          const meTest = await api.get('/auth/me');
          testResults.protectedEndpoint = { 
            status: 'success', 
            data: meTest.data 
          };
          console.log('Protected endpoint test SUCCESS:', testResults.protectedEndpoint);
        } catch (err) {
          testResults.protectedEndpoint = { 
            status: 'error', 
            error: err.message,
            statusCode: err.response?.status,
            response: err.response?.data,
            headers: err.response?.headers
          };
          console.error('Protected endpoint test FAILED:', testResults.protectedEndpoint);
        }
      } else {
        testResults.protectedEndpoint = { 
          status: 'skipped', 
          reason: 'No token in localStorage' 
        };
        console.warn('Protected endpoint test SKIPPED - no token');
      }

      // Test 6: Test CORS
      console.log('Test 6: Testing CORS...');
      try {
        const corsTest = await fetch('http://localhost:3000/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        testResults.corsTest = {
          status: 'success',
          httpStatus: corsTest.status,
          corsHeaders: {
            'access-control-allow-origin': corsTest.headers.get('access-control-allow-origin'),
            'access-control-allow-credentials': corsTest.headers.get('access-control-allow-credentials')
          }
        };
        console.log('CORS test SUCCESS:', testResults.corsTest);
      } catch (err) {
        testResults.corsTest = {
          status: 'error',
          error: err.message
        };
        console.error('CORS test FAILED:', testResults.corsTest);
      }

      // Test 7: Browser storage support
      testResults.browserStorage = {
        localStorageSupport: typeof Storage !== 'undefined',
        sessionStorageSupport: typeof sessionStorage !== 'undefined',
        cookiesEnabled: navigator.cookieEnabled
      };

    } catch (error) {
      testResults.globalError = {
        message: error.message,
        stack: error.stack
      };
      console.error('Global test error:', error);
    }

    console.log('=== DEBUG TESTS COMPLETE ===');
    console.log('Full results:', testResults);
    
    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const clearTokenAndRetry = () => {
    console.log('Clearing token and retrying...');
    localStorage.removeItem('token');
    runTests();
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Debug Dashboard</h1>
            <p className="text-gray-600">Diagnosing authentication and API issues</p>
          </div>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {loading ? '⏳ Running Tests...' : '🔄 Run Tests Again'}
            </button>
            <button 
              onClick={clearTokenAndRetry}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              🗑️ Clear Token & Retry
            </button>
            <button 
              onClick={goToLogin}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              🔐 Go to Login
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Instructions:</strong> This page runs comprehensive tests to diagnose authentication and API issues. 
              Check the browser console (F12) for detailed logs. Look for RED error messages or FAILED tests below.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Running diagnostic tests...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Problem Analysis */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">🔍 Problem Analysis</h2>
                </div>
                <div className="p-4">
                  {analyzeResults(results)}
                </div>
              </div>

              {/* Test Results */}
              <div className="space-y-4">
                {Object.entries(results).map(([testName, result]) => (
                  <div 
                    key={testName} 
                    className={`border rounded-lg p-4 ${
                      result.status === 'error' 
                        ? 'bg-red-50 border-red-300' 
                        : result.status === 'skipped'
                        ? 'bg-yellow-50 border-yellow-300'
                        : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {result.status === 'error' ? '❌' : result.status === 'skipped' ? '⚠️' : '✅'} 
                        {' '}{testName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.status === 'error' 
                          ? 'bg-red-200 text-red-800' 
                          : result.status === 'skipped'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {result.status || 'success'}
                      </span>
                    </div>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <h2 className="font-semibold text-lg mb-2">🛠️ Quick Fixes</h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>If health endpoint fails: Check if backend is running on port 3000</li>
                  <li>If login endpoint fails: Check backend logs for errors</li>
                  <li>If protected endpoint fails with 401: Token might be invalid or expired</li>
                  <li>If CORS test fails: Check backend CORS configuration</li>
                  <li>If no token in localStorage: Try logging in again</li>
                  <li>Check the browser console (F12) for detailed error messages</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function analyzeResults(results) {
  const issues = [];

  // Check localStorage
  if (!results.localStorage?.hasToken) {
    issues.push({
      type: 'critical',
      message: 'No authentication token found in localStorage',
      fix: 'User needs to login again. Click "Go to Login" button above.'
    });
  }

  // Check environment
  if (!results.environment?.VITE_API_BASE && !results.environment?.VITE_API_URL) {
    issues.push({
      type: 'critical', 
      message: 'No API URL configured in environment variables',
      fix: 'Create a .env file with VITE_API_BASE=http://localhost:3000 or VITE_API_URL=http://localhost:3000'
    });
  }

  // Check health endpoint
  if (results.healthEndpoint?.status === 'error') {
    issues.push({
      type: 'critical',
      message: `Backend health check failed: ${results.healthEndpoint.error}`,
      fix: 'Verify backend server is running: cd apps/api && npm run start:dev'
    });
  }

  // Check login endpoint
  if (results.loginEndpoint?.status === 'error') {
    issues.push({
      type: 'critical',
      message: `Login endpoint error: ${results.loginEndpoint.error}`,
      fix: 'Check backend auth routes and database connection'
    });
  } else if (results.loginEndpoint?.httpStatus !== 200 && results.loginEndpoint?.httpStatus !== 201) {
    issues.push({
      type: 'warning',
      message: `Login endpoint returned status ${results.loginEndpoint?.httpStatus}`,
      fix: 'Check if demo user exists in database: npm run prisma:seed'
    });
  }

  // Check auth endpoint
  if (results.protectedEndpoint?.status === 'error') {
    if (results.protectedEndpoint.statusCode === 401) {
      issues.push({
        type: 'critical',
        message: 'Authentication failed - Token is invalid or expired',
        fix: 'Click "Clear Token & Retry" button, then login again'
      });
    } else if (results.protectedEndpoint.statusCode === 500) {
      issues.push({
        type: 'critical',
        message: 'Server error during authentication',
        fix: 'Check backend server logs for stack traces and database connection'
      });
    } else {
      issues.push({
        type: 'warning',
        message: `Protected endpoint error: ${results.protectedEndpoint.error}`,
        fix: 'Check backend authentication middleware and JWT validation'
      });
    }
  }

  // Check CORS
  if (results.corsTest?.status === 'error') {
    issues.push({
      type: 'warning',
      message: 'CORS test failed - Cross-origin requests might be blocked',
      fix: 'Check backend CORS configuration in main.ts: app.enableCors({ origin: "http://localhost:5173" })'
    });
  }

  // Check browser storage
  if (!results.browserStorage?.localStorageSupport) {
    issues.push({
      type: 'critical',
      message: 'LocalStorage is not supported in this browser',
      fix: 'Try a different browser or enable localStorage in browser settings'
    });
  }

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-3xl mr-3">✅</div>
          <div>
            <div className="text-green-900 font-bold text-lg">All tests passed!</div>
            <div className="text-green-700 text-sm mt-1">
              Your authentication system is working correctly. You should be able to login and access protected routes.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <div key={index} className={`border-2 rounded-lg p-4 ${
          issue.type === 'critical' 
            ? 'bg-red-50 border-red-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start">
            <div className={`text-2xl mr-3 ${
              issue.type === 'critical' ? 'text-red-500' : 'text-yellow-500'
            }`}>
              {issue.type === 'critical' ? '❌' : '⚠️'}
            </div>
            <div className="flex-1">
              <div className={`font-bold text-lg ${
                issue.type === 'critical' ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {issue.message}
              </div>
              <div className={`text-sm mt-2 ${
                issue.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                <strong>💡 Fix:</strong> {issue.fix}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
