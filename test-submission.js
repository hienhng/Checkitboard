import fetch from 'node-fetch';

// First login to get a session
async function testSubmission() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'password123',
      }),
      credentials: 'include',
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.json());
      return;
    }

    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);

    // Test submission endpoint that was failing
    const submissionResponse = await fetch('http://localhost:5000/api/submissions/11/definitions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wordId: 1,
        studentDefinition: 'Test definition',
      }),
      credentials: 'include',
    });

    if (!submissionResponse.ok) {
      console.error('Submission failed:', await submissionResponse.json());
      return;
    }

    const submissionData = await submissionResponse.json();
    console.log('Submission successful:', submissionData);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSubmission();