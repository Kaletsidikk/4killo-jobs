process.env.NODE_ENV = 'test';
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';

let server: http.Server;
let baseUrl: string;

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`   ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`   ✓ ${message}`);
}

async function retryDb<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastError;
}

async function request(path: string, options: RequestInit = {}, maxRetries = 2) {
  const url = `${baseUrl}${path}`;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...((options.headers as Record<string, string>) || {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return { status: res.status, data, headers: res.headers };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastError || new Error(`Failed to request ${path}`);
}

async function run() {
  console.log('====================================================');
  console.log('🧪 Starting 4KILLO API & Database Verification Test');
  console.log('====================================================\n');

  // Start temporary server on random free port
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      console.log(`🚀 Test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ── Test 1: Health Check ─────────────────────────────────────────────────
    console.log('🔍 Test 1: System Health');
    const health = await request('/health');
    assert(health.status === 200, 'GET /health returns 200 OK');
    assert(health.data.status === 'ok', 'Health status is "ok"');

    // ── Test 2: Database Seed Verification ──────────────────────────────────
    console.log('\n🔍 Test 2: Database Seed Verification');
    const jobCount = await retryDb(() => prisma.job.count());
    const sourceCount = await retryDb(() => prisma.source.count());
    const jobSourceCount = await retryDb(() => prisma.jobSource.count());
    console.log(`   DB state: ${jobCount} jobs, ${sourceCount} sources, ${jobSourceCount} job-sources`);
    assert(jobCount >= 6, 'DB contains at least 6 jobs from scraped_jobs.json');
    assert(sourceCount >= 4, 'DB contains target scraping sources');
    assert(jobSourceCount >= 6, 'DB contains job-source links with provenance');

    // Verify individual scraped entries
    const hseJob = await retryDb(() =>
      prisma.job.findFirst({
        where: { title: { contains: 'HSE', mode: 'insensitive' } },
        include: { sources: true },
      })
    );
    assert(!!hseJob, 'HSE Officer job (@ethiojobsofficial) exists in DB');
    assert(hseJob!.sources.length > 0, 'HSE Officer has a linked JobSource provenance record');
    assert(hseJob!.sources[0].sourceName.includes('Ethiojobs'), 'Source name is Ethiojobs');

    const videoEditorJob = await retryDb(() =>
      prisma.job.findFirst({ where: { title: { contains: 'Video Editor', mode: 'insensitive' } } })
    );
    assert(!!videoEditorJob, 'Video Editor job (@freelance_ethio) exists in DB');

    const storeKeeperJob = await retryDb(() =>
      prisma.job.findFirst({ where: { title: { contains: 'Store Keeper', mode: 'insensitive' } } })
    );
    assert(!!storeKeeperJob, 'Store Keeper job (@shegerjobs) exists in DB');

    const accountantJob = await retryDb(() =>
      prisma.job.findFirst({ where: { title: { contains: 'Branch Accountant', mode: 'insensitive' } } })
    );
    assert(!!accountantJob, 'Senior Branch Accountant job (@BeleqetJobs) exists in DB');

    // ── Test 3: Jobs Listing & Filtering ────────────────────────────────────
    console.log('\n🔍 Test 3: Working Job API - Listing & Query Filtering');
    const allJobsRes = await request('/api/jobs');
    assert(allJobsRes.status === 200, 'GET /api/jobs returns 200 OK');
    assert(Array.isArray(allJobsRes.data.data), 'Response has data array');
    assert(allJobsRes.data.pagination.total >= 6, 'Pagination total >= 6');
    assert(allJobsRes.data.data[0].sources.length > 0, 'Each job includes source provenance');

    const engineeringRes = await request('/api/jobs?category=Engineering');
    assert(engineeringRes.status === 200, 'GET /api/jobs?category=Engineering returns 200');
    assert(engineeringRes.data.data.length >= 1, 'Engineering category returns jobs');
    assert(
      engineeringRes.data.data.every((j: any) => j.category.toLowerCase() === 'engineering'),
      'All filtered results have category=Engineering'
    );

    const searchRes = await request('/api/jobs?search=Editor');
    assert(searchRes.status === 200, 'GET /api/jobs?search=Editor returns 200');
    assert(searchRes.data.data.some((j: any) => j.title.includes('Video Editor')), 'Search finds Video Editor');

    const juniorRes = await request('/api/jobs?experienceLevel=JUNIOR');
    assert(juniorRes.status === 200, 'GET /api/jobs?experienceLevel=JUNIOR returns 200');
    assert(juniorRes.data.data.every((j: any) => j.experienceLevel === 'JUNIOR'), 'All results are JUNIOR level');

    const pageRes = await request('/api/jobs?limit=2&page=1');
    assert(pageRes.status === 200, 'GET /api/jobs?limit=2&page=1 returns 200');
    assert(pageRes.data.data.length === 2, 'Limit=2 returns exactly 2 items');
    assert(pageRes.data.pagination.limit === 2, 'Pagination meta reflects limit=2');

    // ── Test 4: Aggregate Endpoints ──────────────────────────────────────────
    console.log('\n🔍 Test 4: Job Aggregate Endpoints (/categories & /locations)');
    const categoriesRes = await request('/api/jobs/categories');
    assert(categoriesRes.status === 200, 'GET /api/jobs/categories returns 200');
    assert(Array.isArray(categoriesRes.data.data), 'Returns categories array');
    assert(categoriesRes.data.data.length > 0, 'Categories array is non-empty');
    assert(categoriesRes.data.data[0].count > 0, 'First category has a count');

    const locationsRes = await request('/api/jobs/locations');
    assert(locationsRes.status === 200, 'GET /api/jobs/locations returns 200');
    assert(Array.isArray(locationsRes.data.data), 'Returns locations array');
    assert(locationsRes.data.data.length > 0, 'Locations array is non-empty');

    // ── Test 5: Single Job Detail ─────────────────────────────────────────────
    console.log('\n🔍 Test 5: Job Detail API (GET /api/jobs/:id)');
    const testJobId = allJobsRes.data.data[0].id;
    const singleJobRes = await request(`/api/jobs/${testJobId}`);
    assert(singleJobRes.status === 200, 'GET /api/jobs/:id returns 200');
    assert(singleJobRes.data.id === testJobId, 'Job ID matches requested ID');
    assert(Array.isArray(singleJobRes.data.sources), 'Response includes sources array');
    assert(singleJobRes.data.description.length > 0, 'Response includes full description');

    const notFoundRes = await request('/api/jobs/non-existent-uuid-12345');
    assert(notFoundRes.status === 404, 'Non-existent job returns 404');

    // ── Test 6: Public Sources API ───────────────────────────────────────────
    console.log('\n🔍 Test 6: Public Sources API (GET /api/sources)');
    const publicSourcesRes = await request('/api/sources');
    assert(publicSourcesRes.status === 200, 'GET /api/sources returns 200');
    assert(Array.isArray(publicSourcesRes.data.data), 'Returns sources data array');
    assert(publicSourcesRes.data.totalActiveSources >= 4, 'Reports >= 4 active sources');
    const ethioSource = publicSourcesRes.data.data.find((s: any) => s.identifier.includes('ethiojobs'));
    assert(!!ethioSource, 'Ethiojobs Official listed in public sources');
    assert(ethioSource.totalJobs >= 1, 'Source reports totalJobs count');

    // ── Test 7: Admin Auth & Source Management CRUD ──────────────────────────
    console.log('\n🔍 Test 7: Source Management Endpoints (Admin)');
    const adminPassword = process.env.ADMIN_PASSWORD;
    assert(!!adminPassword, 'ADMIN_PASSWORD is set in environment');

    const badLogin = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong_password_xyz' }),
    });
    assert(badLogin.status === 401, 'Wrong admin password returns 401');

    const loginRes = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: adminPassword }),
    });
    assert(loginRes.status === 200, 'Correct admin password returns 200');
    assert(!!loginRes.data.token, 'Admin login response includes JWT token');
    const adminToken = loginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const unauthSources = await request('/api/admin/sources');
    assert(unauthSources.status === 401, 'Unauthenticated admin sources returns 401');

    const adminSourcesRes = await request('/api/admin/sources', { headers: adminHeaders });
    assert(adminSourcesRes.status === 200, 'GET /api/admin/sources with token returns 200');
    assert(Array.isArray(adminSourcesRes.data.sources), 'Response has sources array');
    assert(!!adminSourcesRes.data.stats, 'Response includes stats summary');
    assert(adminSourcesRes.data.stats.totalSources >= 4, 'Stats report >= 4 sources');

    // CREATE
    const testHandle = `@e2e_test_${Date.now()}`;
    const createRes = await request('/api/admin/sources', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'E2E Test Channel', identifier: testHandle, type: 'TELEGRAM_CHANNEL' }),
    });
    assert(createRes.status === 201, 'POST /api/admin/sources returns 201 Created');
    assert(createRes.data.identifier === testHandle, 'Created source has correct identifier');
    const createdId = createRes.data.id;

    // READ
    const getOneRes = await request(`/api/admin/sources/${createdId}`, { headers: adminHeaders });
    assert(getOneRes.status === 200, 'GET /api/admin/sources/:id returns 200');
    assert(getOneRes.data.id === createdId, 'Fetched source ID matches');

    // STATUS TOGGLE
    const toggleRes = await request(`/api/admin/sources/${createdId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PAUSED' }),
    });
    assert(toggleRes.status === 200, 'PATCH /api/admin/sources/:id/status returns 200');
    assert(toggleRes.data.source.status === 'PAUSED', 'Source status updated to PAUSED');

    // UPDATE
    const updateRes = await request(`/api/admin/sources/${createdId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'E2E Updated Name', status: 'ACTIVE' }),
    });
    assert(updateRes.status === 200, 'PUT /api/admin/sources/:id returns 200');
    assert(updateRes.data.name === 'E2E Updated Name', 'Source name updated');
    assert(updateRes.data.status === 'ACTIVE', 'Source status reactivated');

    // SYNC
    const syncRes = await request(`/api/admin/sources/${createdId}/sync`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(syncRes.status === 200, 'POST /api/admin/sources/:id/sync returns 200');
    assert(syncRes.data.source.lastSyncAt !== null, 'lastSyncAt refreshed on sync');

    // DELETE
    const deleteRes = await request(`/api/admin/sources/${createdId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(deleteRes.status === 200, 'DELETE /api/admin/sources/:id returns 200');
    assert(deleteRes.data.deletedId === createdId, 'Response contains deletedId');

    // Verify deletion
    const afterDeleteRes = await request(`/api/admin/sources/${createdId}`, { headers: adminHeaders });
    assert(afterDeleteRes.status === 404, 'Deleted source returns 404');

    // ── Test 8: Saved Jobs Lifecycle ─────────────────────────────────────────
    console.log('\n🔍 Test 8: Saved Jobs Lifecycle');
    const testTelegramId = BigInt(9876543210);
    const testUser = await retryDb(() =>
      prisma.user.upsert({
        where: { telegramId: testTelegramId },
        update: {},
        create: { telegramId: testTelegramId, username: 'test_verifier', firstName: 'Verifier' },
      })
    );

    const userToken = jwt.sign(
      { userId: testUser.id, telegramId: testUser.telegramId.toString() },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      { expiresIn: '1h' }
    );
    const userHeaders = { Authorization: `Bearer ${userToken}` };

    const saveRes = await request(`/api/jobs/${testJobId}/save`, { method: 'POST', headers: userHeaders });
    assert(saveRes.status === 201, 'POST /api/jobs/:id/save returns 201');

    const savedListRes = await request('/api/jobs/saved', { headers: userHeaders });
    assert(savedListRes.status === 200, 'GET /api/jobs/saved returns 200');
    assert(savedListRes.data.data.some((j: any) => j.id === testJobId), 'Saved list includes the saved job');

    const jobsWithAuthRes = await request('/api/jobs', { headers: userHeaders });
    const savedTarget = jobsWithAuthRes.data.data.find((j: any) => j.id === testJobId);
    assert(savedTarget?.isSaved === true, 'GET /api/jobs shows isSaved=true for saved job');

    const unsaveRes = await request(`/api/jobs/${testJobId}/save`, { method: 'DELETE', headers: userHeaders });
    assert(unsaveRes.status === 200, 'DELETE /api/jobs/:id/save returns 200');

    const savedAfterRes = await request('/api/jobs/saved', { headers: userHeaders });
    assert(!savedAfterRes.data.data.some((j: any) => j.id === testJobId), 'Job removed from saved list after unsave');

    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});

    console.log('\n====================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED');
    console.log('====================================================\n');
  } finally {
    if (server!) server.close();
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\n❌ Test execution failed:', err.message || err);
  process.exit(1);
});
