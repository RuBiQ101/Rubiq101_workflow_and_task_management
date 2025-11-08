import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function DebugPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults = {};
    
    console.log('=== STARTING DEBUG TESTS ===');
    
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

    console.log('=== DEBUG TESTS COMPLETE ===');
    console.log('Full results:', testResults);
    
    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🔧 Debug Console</h1>
            <button 
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {loading ? 'Running Tests...' : 'Run Tests Again'}
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> This page runs comprehensive tests to diagnose authentication and API issues. 
              Check the browser console for detailed logs. Look for RED error messages or FAILED tests below.
            </p>
          </div>

          {Object.keys(results).length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Running diagnostic tests...</p>
            </div>
          ) : (
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
                      {result.status}
                    </span>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold text-lg mb-2">Quick Fixes</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>If health endpoint fails: Check if backend is running on port 3000</li>
              <li>If login endpoint fails: Check backend logs for errors</li>
              <li>If protected endpoint fails with 401: Token might be invalid or expired</li>
              <li>If CORS test fails: Check backend CORS configuration</li>
              <li>If no token in localStorage: Try logging in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
