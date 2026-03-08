import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema.js';

// Validation schemas
const registerDeviceSchema = z.object({
  deviceId: z.string().min(1),
  fcmToken: z.string().optional(),
  apnsToken: z.string().optional(),
  platform: z.enum(['ios', 'android']),
});

const sendNotificationSchema = z.object({
  deviceId: z.string().min(1),
  taskId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
});

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if device has notification cooldown active for this task
async function isOnCooldown(
  app: App,
  deviceId: string,
  taskId: string
): Promise<boolean> {
  const cooldownMinutes = 10;
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const tenMinutesAgo = new Date(Date.now() - cooldownMs);

  const recentNotification = await app.db
    .select()
    .from(schema.notificationLog)
    .where(
      and(
        eq(schema.notificationLog.deviceId, deviceId),
        eq(schema.notificationLog.taskId, taskId),
        gte(schema.notificationLog.sentAt, tenMinutesAgo)
      )
    );

  return recentNotification.length > 0;
}

export function registerPushNotificationRoutes(app: App) {
  // POST /api/devices/register - Register a device token
  app.fastify.post('/api/devices/register', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body = registerDeviceSchema.parse(request.body);

    app.logger.info(
      { deviceId: body.deviceId, platform: body.platform },
      'Registering device token'
    );

    try {
      const existingDevice = await app.db
        .select()
        .from(schema.deviceTokens)
        .where(eq(schema.deviceTokens.deviceId, body.deviceId));

      let device;

      if (existingDevice.length > 0) {
        const updateData: any = {
          updatedAt: new Date(),
        };
        if (body.fcmToken) updateData.fcmToken = body.fcmToken;
        if (body.apnsToken) updateData.apnsToken = body.apnsToken;
        if (body.platform) updateData.platform = body.platform;

        const [updated] = await app.db
          .update(schema.deviceTokens)
          .set(updateData)
          .where(eq(schema.deviceTokens.deviceId, body.deviceId))
          .returning();

        device = updated;
        app.logger.info(
          { deviceId: body.deviceId },
          'Device token updated successfully'
        );
      } else {
        const [created] = await app.db
          .insert(schema.deviceTokens)
          .values({
            deviceId: body.deviceId,
            fcmToken: body.fcmToken,
            apnsToken: body.apnsToken,
            platform: body.platform,
          })
          .returning();

        device = created;
        app.logger.info(
          { deviceId: body.deviceId },
          'Device token registered successfully'
        );
      }

      return {
        id: device.id,
        deviceId: device.deviceId,
        platform: device.platform,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      };
    } catch (error) {
      app.logger.error(
        { err: error, deviceId: body.deviceId },
        'Failed to register device token'
      );
      throw error;
    }
  });

  // POST /api/notifications/send - Send push notification with geofence check
  app.fastify.post('/api/notifications/send', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body = sendNotificationSchema.parse(request.body);

    app.logger.info(
      {
        deviceId: body.deviceId,
        taskId: body.taskId,
        userLat: body.latitude,
        userLon: body.longitude,
      },
      'Processing notification with geofence check'
    );

    try {
      // Get the task
      const task = await app.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, body.taskId));

      if (task.length === 0) {
        app.logger.warn(
          { taskId: body.taskId },
          'Task not found'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      const taskData = task[0];
      const taskLat = parseFloat(taskData.latitude);
      const taskLon = parseFloat(taskData.longitude);

      // Calculate distance using Haversine formula
      const distanceMeters = calculateDistance(
        body.latitude,
        body.longitude,
        taskLat,
        taskLon
      );

      app.logger.info(
        {
          deviceId: body.deviceId,
          taskId: body.taskId,
          distanceMeters,
        },
        'Distance calculated from device to task'
      );

      // Check if device is within monitoring radius (150 meters)
      const monitoringRadiusMeters = 150;
      if (distanceMeters > monitoringRadiusMeters) {
        app.logger.info(
          {
            deviceId: body.deviceId,
            taskId: body.taskId,
            distanceMeters,
            monitoringRadiusMeters,
          },
          'Device outside monitoring radius'
        );
        return {
          sent: false,
          reason: 'outside_monitoring_radius',
          distanceMeters,
        };
      }

      // Check if device is within trigger distance (100 meters)
      const triggerDistanceMeters = 100;
      if (distanceMeters > triggerDistanceMeters) {
        app.logger.info(
          {
            deviceId: body.deviceId,
            taskId: body.taskId,
            distanceMeters,
            triggerDistanceMeters,
          },
          'Device in monitoring radius but outside trigger distance'
        );
        return {
          sent: false,
          reason: 'outside_trigger_distance',
          distanceMeters,
        };
      }

      // Check cooldown to prevent duplicate notifications
      const onCooldown = await isOnCooldown(app, body.deviceId, body.taskId);
      if (onCooldown) {
        app.logger.info(
          {
            deviceId: body.deviceId,
            taskId: body.taskId,
          },
          'Notification blocked by cooldown'
        );
        return {
          sent: false,
          reason: 'on_cooldown',
          distanceMeters,
        };
      }

      // Get device to get notification tokens
      const deviceRecords = await app.db
        .select()
        .from(schema.deviceTokens)
        .where(eq(schema.deviceTokens.deviceId, body.deviceId));

      if (deviceRecords.length === 0) {
        app.logger.warn(
          { deviceId: body.deviceId },
          'Device not registered'
        );
        return reply.status(404).send({ error: 'Device not registered' });
      }

      const device = deviceRecords[0];

      // Log notification for cooldown tracking
      await app.db
        .insert(schema.notificationLog)
        .values({
          taskId: body.taskId,
          deviceId: body.deviceId,
          sentAt: new Date(),
        });

      app.logger.info(
        {
          deviceId: body.deviceId,
          taskId: body.taskId,
          distanceMeters,
          platform: device.platform,
        },
        'Notification sent'
      );

      // Return notification sent confirmation
      return {
        sent: true,
        distanceMeters,
        taskId: body.taskId,
        deviceId: body.deviceId,
        platform: device.platform,
      };
    } catch (error) {
      app.logger.error(
        { err: error, deviceId: body.deviceId, taskId: body.taskId },
        'Failed to process notification'
      );
      throw error;
    }
  });

  // GET /api/notifications/log - Get notification history for a device
  app.fastify.get('/api/notifications/log', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const { deviceId } = request.query as { deviceId: string };

    if (!deviceId) {
      return reply.status(400).send({ error: 'deviceId query parameter required' });
    }

    app.logger.info(
      { deviceId },
      'Fetching notification log'
    );

    try {
      const logs = await app.db
        .select()
        .from(schema.notificationLog)
        .where(eq(schema.notificationLog.deviceId, deviceId));

      app.logger.info(
        { deviceId, logCount: logs.length },
        'Notification log fetched'
      );

      return logs.map((log) => ({
        id: log.id,
        taskId: log.taskId,
        sentAt: log.sentAt,
      }));
    } catch (error) {
      app.logger.error(
        { err: error, deviceId },
        'Failed to fetch notification log'
      );
      throw error;
    }
  });
}
