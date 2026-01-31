import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerTaskRoutes } from './routes/tasks.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Configure authentication with OAuth providers and email/password support
const authConfig: Parameters<typeof app.withAuth>[0] = {
  socialProviders: {},
};

// Configure OAuth providers only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  (authConfig.socialProviders as any).google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
  app.logger.info('Google OAuth configured');
} else {
  app.logger.warn('Google OAuth credentials not found - provider disabled');
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  (authConfig.socialProviders as any).apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
  };
  app.logger.info('Apple OAuth configured');
} else {
  app.logger.warn('Apple OAuth credentials not found - provider disabled');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  (authConfig.socialProviders as any).github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
  app.logger.info('GitHub OAuth configured');
} else {
  app.logger.warn('GitHub OAuth credentials not found - provider disabled');
}

app.withAuth(authConfig);

// Register routes
registerTaskRoutes(app);

await app.run();
app.logger.info('Application running');
