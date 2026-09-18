import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = new URL('../dist/quant/', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const seed = html => JSON.parse(html.match(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const home = read('index.html');
assert.match(home, /<h1[^>]*>Quant jobs<\/h1>/);
assert.match(home, /<table/);
const publishedJobs = new Set(seed(home).data.jobs.map(job => job.slug));
const linkedJobs = [...home.matchAll(/href="\/quant\/job\/([^"/]+)\/"/g)].map(match => match[1]);
assert.equal(linkedJobs.length, 50, "first page contains 50 actual job links");
assert(linkedJobs.every(slug => publishedJobs.has(slug)), "every visible job belongs to the published dataset");
assert(!home.includes('seo-shell'));
assert(!home.includes('Loading quant job data'));
assert(seed(home).data.jobs.length > 0);
assert.match(home, /\/quant\/quant-researcher-jobs/);
for (const file of ['tech-stack.html', 'locations.html', 'internships.html', 'stacks.html']) {
  const html = read(file);
  assert.match(html, /<h1/);
  assert(!html.includes('seo-shell'), file);
  assert.equal(seed(html).pathname, '/quant/' + file.replace('.html', ''));
}
const detail = read('stacks/firm/jane-street/index.html');
assert.equal(seed(detail).pathname, '/quant/stacks/firm/jane-street');
assert(/1 firm and \d+ open jobs/.test(detail.replace(/<[^>]*>/g, "")), "firm detail is already filtered before hydration");
const jobDir = fs.readdirSync(new URL('job/', root))[0];
const job = read(`job/${jobDir}/index.html`);
assert.match(job, /JobPosting/);
assert(!job.includes('id="page-data"'), 'standalone job details keep their existing rendering');
console.log('Quant rendering: real jobs, route-specific stacks and standalone job pages verified');

// These public city URLs must survive changes in daily posting and firm counts.
for (const slug of ['new-york', 'london', 'singapore', 'hong-kong', 'chicago', 'sydney', 'boston', 'paris', 'mumbai', 'miami', 'amsterdam', 'austin']) {
  const html = read(`location/${slug}/index.html`);
  assert.match(html, /<table/);
  assert.ok(html.includes(`https://www.kadoa.com/quant/location/${slug}`));
}
const miamiJobs = JSON.parse(fs.readFileSync(new URL('../public/data/jobs.json', import.meta.url), 'utf8')).filter(job => job.locations?.includes('Miami'));
assert.ok(read('location/miami/index.html').includes(`${miamiJobs.length} postings`), 'Miami must show current published posting counts');
