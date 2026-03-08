import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerPushNotificationRoutes } from './routes/push-notifications.js';

const schema = { ...appSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register routes
registerTaskRoutes(app);
registerPushNotificationRoutes(app);

await app.run();
app.logger.info('Application running');
