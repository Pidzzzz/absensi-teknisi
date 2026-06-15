const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read token dynamically from local file to prevent GitHub Push Protection blocks
const tokenPath = 'C:/Users/USer/token.txt';
if (!fs.existsSync(tokenPath)) {
  console.error(`Error: Token file not found at ${tokenPath}`);
  process.exit(1);
}
const TOKEN = fs.readFileSync(tokenPath, 'utf8').trim();

async function main() {
  try {
    console.log('Fetching GitHub username...');
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      throw new Error(`Failed to fetch user: ${errText}`);
    }

    const userData = await userRes.json();
    const username = userData.login;
    console.log(`GitHub Username identified: ${username}`);

    console.log('Creating new repository on GitHub...');
    const repoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'absensi-teknisi',
        description: 'Sistem Absensi & Dokumentasi Teknisi Lapangan',
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true
      })
    });

    if (repoRes.status === 422) {
      console.log('Repository "absensi-teknisi" already exists on your GitHub account. Proceeding to push...');
    } else if (!repoRes.ok) {
      const errText = await repoRes.text();
      throw new Error(`Failed to create repository: ${errText}`);
    } else {
      console.log('Repository successfully created on GitHub!');
    }

    console.log('Staging files and committing...');
    try {
      execSync('git init', { stdio: 'inherit' });
    } catch (e) {}

    // Configure credentials or config if needed
    try {
      execSync('git config user.name "Asep Technician"', { stdio: 'inherit' });
      execSync('git config user.email "teknisi@gmail.com"', { stdio: 'inherit' });
    } catch (e) {}

    // Add files
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit
    try {
      execSync('git commit -m "Initial commit - Absensi & Dokumentasi Teknisi Lapangan"', { stdio: 'inherit' });
    } catch (e) {
      console.log('Nothing to commit or commit failed (might be already committed).');
    }

    // Set remote
    console.log('Configuring remote origin...');
    const remoteUrl = `https://${username}:${TOKEN}@github.com/${username}/absensi-teknisi.git`;
    
    try {
      execSync('git remote remove origin', { stdio: 'ignore' });
    } catch (e) {}
    
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });

    // Rename branch to main
    try {
      execSync('git branch -M main', { stdio: 'inherit' });
    } catch (e) {}

    console.log('Pushing to GitHub main branch...');
    execSync('git push -u origin main --force', { stdio: 'inherit' });

    console.log('\n=============================================');
    console.log(`SUCCESS! Repository pushed to: https://github.com/${username}/absensi-teknisi`);
    console.log('=============================================');

  } catch (error) {
    console.error('Error occurred:', error.message);
    process.exit(1);
  }
}

main();
