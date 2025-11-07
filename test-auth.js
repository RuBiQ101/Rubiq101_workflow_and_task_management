// Test authentication endpoints
async function testAuth() {
  console.log('Testing /auth/login...');
  
  try {
    // Test login
    const loginResponse = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@local.test',
        password: 'demo1234'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✓ Login successful!');
    console.log('Access Token:', loginData.accessToken.substring(0, 50) + '...');
    console.log('');
    
    // Test register with new user
    console.log('Testing /auth/register...');
    const registerResponse = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser_' + Date.now() + '@test.com',
        password: 'test1234',
        name: 'Test User'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('✓ Registration successful!');
    console.log('Access Token:', registerData.accessToken.substring(0, 50) + '...');
    console.log('');
    
    // Test wrong password
    console.log('Testing /auth/login with wrong password...');
    const wrongResponse = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@local.test',
        password: 'wrongpassword'
      })
    });
    
    if (wrongResponse.status === 401) {
      console.log('✓ Correctly returned 401 Unauthorized');
    } else {
      console.log('✗ Expected 401 but got:', wrongResponse.status);
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

testAuth();
