const http = require('http');

async function testAuth() {
  console.log('Testing /auth/login...');
  
  // Test login
  const loginData = JSON.stringify({
    email: 'demo@local.test',
    password: 'demo1234'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };
  
  const loginRequest = http.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const response = JSON.parse(data);
      console.log('✓ Login successful!');
      console.log('Status:', res.statusCode);
      console.log('Access Token:', response.accessToken.substring(0, 50) + '...');
      console.log('');
      
      // Test register
      testRegister();
    });
  });
  
  loginRequest.on('error', (error) => {
    console.error('✗ Login error:', error.message);
  });
  
  loginRequest.write(loginData);
  loginRequest.end();
}

function testRegister() {
  console.log('Testing /auth/register...');
  
  const registerData = JSON.stringify({
    email: 'testuser_' + Date.now() + '@test.com',
    password: 'test1234',
    name: 'Test User'
  });
  
  const registerOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': registerData.length
    }
  };
  
  const registerRequest = http.request(registerOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const response = JSON.parse(data);
      console.log('✓ Registration successful!');
      console.log('Status:', res.statusCode);
      console.log('Access Token:', response.accessToken.substring(0, 50) + '...');
      console.log('');
      
      // Test wrong password
      testWrongPassword();
    });
  });
  
  registerRequest.on('error', (error) => {
    console.error('✗ Register error:', error.message);
  });
  
  registerRequest.write(registerData);
  registerRequest.end();
}

function testWrongPassword() {
  console.log('Testing /auth/login with wrong password...');
  
  const wrongData = JSON.stringify({
    email: 'demo@local.test',
    password: 'wrongpassword'
  });
  
  const wrongOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': wrongData.length
    }
  };
  
  const wrongRequest = http.request(wrongOptions, (res) => {
    if (res.statusCode === 401) {
      console.log('✓ Correctly returned 401 Unauthorized');
    } else {
      console.log('✗ Expected 401 but got:', res.statusCode);
    }
  });
  
  wrongRequest.on('error', (error) => {
    console.error('✗ Wrong password test error:', error.message);
  });
  
  wrongRequest.write(wrongData);
  wrongRequest.end();
}

testAuth();
