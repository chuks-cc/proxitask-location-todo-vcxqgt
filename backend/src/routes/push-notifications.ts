import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema.js';

// Validation schemas
const registerDeviceSchema = z.object({
  deviceId: z.string().min(1),
  expoToken: z.string().min(1),
});

const sendExpoNotificationSchema = z.object({
  deviceId: z.string().min(1),
  taskId: z.string().min(1),
  taskTitle: z.string().min(1),
  taskAddress: z.string().min(1),
  distance: z.number().int().min(0),
  userLatitude: z.number(),
  userLongitude: z.number(),
});

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

// Send push notification via Expo Push API
async function sendExpoPushNotification(
  expoToken: string,
  taskTitle: string,
  taskAddress: string,
  distance: number,
  taskId: string,
  app: App
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      to: expoToken,
      title: `📍 Near Task: ${taskTitle}`,
      body: `You're ${distance}m away from ${taskAddress}`,
      data: { taskId },
      sound: 'default',
      priority: 'high',
    };

    app.logger.info(
      { expoToken: expoToken.substring(0, 20) + '...', payload },
      'Sending Expo push notification'
    );

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      app.logger.error(
        { status: response.status, error: errorData },
        'Expo API returned error'
      );
      return { success: false, error: errorData.errors?.[0]?.message || 'Failed to send notification' };
    }

    const result = await response.json() as any;

    app.logger.info(
      { result },
      'Expo push notification sent successfully'
    );

    // Expo returns data array with ticket objects containing id
    const ticketId = result.data?.[0]?.id || result.id || `expo-${Date.now()}`;

    return { success: true, id: ticketId };
  } catch (error) {
    app.logger.error(
      { err: error, taskId },
      'Failed to send Expo push notification'
    );
    return { success: false, error: String(error) };
  }
}

export function registerPushNotificationRoutes(app: App) {
  // POST /api/devices/register - Register Expo push token
  app.fastify.post('/api/devices/register', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body = registerDeviceSchema.parse(request.body);

    app.logger.info(
      { deviceId: body.deviceId, expoToken: body.expoToken.substring(0, 20) + '...' },
      'Registering Expo device token'
    );

    try {
      const existingDevice = await app.db
        .select()
        .from(schema.deviceTokens)
        .where(eq(schema.deviceTokens.deviceId, body.deviceId));

      let device;

      if (existingDevice.length > 0) {
        const [updated] = await app.db
          .update(schema.deviceTokens)
          .set({
            expoToken: body.expoToken,
            updatedAt: new Date(),
          })
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
            expoToken: body.expoToken,
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

  // POST /api/push-notifications/send - Send Expo push notification with cooldown check
  app.fastify.post('/api/push-notifications/send', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body = sendExpoNotificationSchema.parse(request.body);

    app.logger.info(
      {
        deviceId: body.deviceId,
        taskId: body.taskId,
        distance: body.distance,
      },
      'Processing Expo push notification'
    );

    try {
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
          reason: 'cooldown',
        };
      }

      // Get device to get Expo token
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

      // Send actual Expo push notification
      const pushResult = await sendExpoPushNotification(
        device.expoToken,
        body.taskTitle,
        body.taskAddress,
        body.distance,
        body.taskId,
        app
      );

      if (!pushResult.success) {
        app.logger.error(
          { deviceId: body.deviceId, taskId: body.taskId, error: pushResult.error },
          'Failed to send Expo push notification'
        );
        return reply.status(500).send({ error: 'Failed to send notification', details: pushResult.error });
      }

      // Log notification for cooldown tracking
      const [notificationLogEntry] = await app.db
        .insert(schema.notificationLog)
        .values({
          taskId: body.taskId,
          deviceId: body.deviceId,
          distance: body.distance,
          sentAt: new Date(),
        })
        .returning();

      app.logger.info(
        {
          deviceId: body.deviceId,
          taskId: body.taskId,
          distance: body.distance,
          notificationId: pushResult.id,
        },
        'Expo push notification sent successfully'
      );

      // Return notification sent confirmation
      return {
        sent: true,
        notificationId: pushResult.id,
      };
    } catch (error) {
      app.logger.error(
        { err: error, deviceId: body.deviceId, taskId: body.taskId },
        'Failed to process Expo push notification'
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
        distance: log.distance,
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
