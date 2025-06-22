import fetch from 'node-fetch';
import fs from 'fs';

async function testContactSupport() {
  try {
    // First login
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'giahienhn@gmail.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed:', loginData);
      return;
    }

    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);

    // Test contact support
    const contactResponse = await fetch('http://localhost:5000/api/help/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        subject: 'Test Support Message',
        message: 'This is a test message to verify the contact support functionality is working properly.'
      })
    });

    const contactData = await contactResponse.json();
    console.log('Contact response status:', contactResponse.status);
    console.log('Contact response:', contactData);

  } catch (error) {
    console.error('Error testing contact support:', error);
  }
}

testContactSupport();