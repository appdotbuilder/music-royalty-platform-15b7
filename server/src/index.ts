
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createTenantInputSchema,
  createUserInputSchema,
  createArtistInputSchema,
  createWorkInputSchema,
  createRoyaltySplitInputSchema,
  createInvitationInputSchema
} from './schema';

// Import handlers
import { createTenant } from './handlers/create_tenant';
import { getTenants } from './handlers/get_tenants';
import { getTenantById } from './handlers/get_tenant_by_id';
import { createUser } from './handlers/create_user';
import { getUsersByTenant } from './handlers/get_users_by_tenant';
import { createArtist } from './handlers/create_artist';
import { getArtistsByTenant } from './handlers/get_artists_by_tenant';
import { createWork } from './handlers/create_work';
import { getWorksByTenant } from './handlers/get_works_by_tenant';
import { getWorksByArtist } from './handlers/get_works_by_artist';
import { createRoyaltySplit } from './handlers/create_royalty_split';
import { getRoyaltySplitsByWork } from './handlers/get_royalty_splits_by_work';
import { createInvitation } from './handlers/create_invitation';
import { acceptInvitation } from './handlers/accept_invitation';
import { getTenantAnalytics } from './handlers/get_tenant_analytics';
import { getArtistAnalytics } from './handlers/get_artist_analytics';
import { processRoyaltyReport } from './handlers/process_royalty_report';
import { distributeWork } from './handlers/distribute_work';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Tenant management
  createTenant: publicProcedure
    .input(createTenantInputSchema)
    .mutation(({ input }) => createTenant(input)),
  
  getTenants: publicProcedure
    .query(() => getTenants()),
  
  getTenantById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTenantById(input.id)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsersByTenant: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(({ input }) => getUsersByTenant(input.tenantId)),

  // Artist management
  createArtist: publicProcedure
    .input(createArtistInputSchema)
    .mutation(({ input }) => createArtist(input)),
  
  getArtistsByTenant: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(({ input }) => getArtistsByTenant(input.tenantId)),

  // Work management
  createWork: publicProcedure
    .input(createWorkInputSchema)
    .mutation(({ input }) => createWork(input)),
  
  getWorksByTenant: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(({ input }) => getWorksByTenant(input.tenantId)),
  
  getWorksByArtist: publicProcedure
    .input(z.object({ artistId: z.number() }))
    .query(({ input }) => getWorksByArtist(input.artistId)),

  // Royalty split management
  createRoyaltySplit: publicProcedure
    .input(createRoyaltySplitInputSchema)
    .mutation(({ input }) => createRoyaltySplit(input)),
  
  getRoyaltySplitsByWork: publicProcedure
    .input(z.object({ workId: z.number() }))
    .query(({ input }) => getRoyaltySplitsByWork(input.workId)),

  // Invitation system
  createInvitation: publicProcedure
    .input(createInvitationInputSchema)
    .mutation(({ input }) => createInvitation(input)),
  
  acceptInvitation: publicProcedure
    .input(z.object({ token: z.string(), userId: z.number() }))
    .mutation(({ input }) => acceptInvitation(input.token, input.userId)),

  // Analytics
  getTenantAnalytics: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(({ input }) => getTenantAnalytics(input.tenantId)),
  
  getArtistAnalytics: publicProcedure
    .input(z.object({ artistId: z.number() }))
    .query(({ input }) => getArtistAnalytics(input.artistId)),

  // Royalty processing
  processRoyaltyReport: publicProcedure
    .input(z.object({ tenantId: z.number(), platform: z.string(), reportData: z.any() }))
    .mutation(({ input }) => processRoyaltyReport(input.tenantId, input.platform, input.reportData)),

  // Distribution
  distributeWork: publicProcedure
    .input(z.object({ workId: z.number(), platforms: z.array(z.string()) }))
    .mutation(({ input }) => distributeWork(input.workId, input.platforms)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Music SaaS server listening at port: ${port}`);
}

start();
