import { Octokit } from 'octokit';
import fs from 'fs';
import path from 'path';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const username = process.env.GITHUB_USERNAME || 'coah80';

async function getTopRepos() {
  const { data: repos } = await octokit.rest.repos.listForUser({
    username,
    sort: 'updated',
    per_page: 100,
    type: 'owner'
  });

  return repos
    .filter(repo => !repo.fork && !repo.private)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10);
}

function generateRepoCard(repo) {
  const stars = repo.stargazers_count;
  const forks = repo.forks_count;
  const lang = repo.language || 'Unknown';
  const desc = repo.description || 'No description';
  const truncatedDesc = desc.length > 60 ? desc.slice(0, 57) + '...' : desc;
  
  return `| [**${repo.name}**](${repo.html_url}) | ${truncatedDesc} | ${lang} | ${stars} | ${forks} |`;
}

function generateTable(repos) {
  const header = `| Repository | Description | Language | Stars | Forks |
|------------|-------------|----------|-------|-------|`;
  
  const rows = repos.map(generateRepoCard).join('\n');
  
  return `${header}\n${rows}`;
}

async function updateReadme() {
  const repos = await getTopRepos();
  const table = generateTable(repos);
  
  const readmePath = path.join(process.cwd(), '../../README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');
  
  const startMarker = '<!-- TOP_REPOS_START -->';
  const endMarker = '<!-- TOP_REPOS_END -->';
  
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  
  if (startIdx === -1 || endIdx === -1) {
    console.log('markers not found in README');
    process.exit(1);
  }
  
  const before = readme.slice(0, startIdx + startMarker.length);
  const after = readme.slice(endIdx);
  
  const newReadme = `${before}\n${table}\n${after}`;
  
  fs.writeFileSync(readmePath, newReadme);
  console.log(`updated readme with ${repos.length} repos`);
}

updateReadme().catch(console.error);
