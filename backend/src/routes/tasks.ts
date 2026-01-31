import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema.js';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  bulletPoints: z.array(z.string()).default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bulletPoints: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
});

const geocodeSchema = z.object({
  address: z.string().min(1),
});

export function registerTaskRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/tasks - Get all tasks for authenticated user
  app.fastify.get('/api/tasks', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info(
      { userId: session.user.id },
      'Fetching all tasks for user'
    );

    try {
      const userTasks = await app.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.userId, session.user.id));

      app.logger.info(
        { userId: session.user.id, taskCount: userTasks.length },
        'Tasks fetched successfully'
      );

      return userTasks.map((task) => ({
        id: task.id,
        title: task.title,
        address: task.address,
        latitude: parseFloat(task.latitude),
        longitude: parseFloat(task.longitude),
        bulletPoints: task.bulletPoints,
        completed: task.completed,
        createdAt: task.createdAt,
      }));
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        'Failed to fetch tasks'
      );
      throw error;
    }
  });

  // POST /api/tasks - Create a new task
  app.fastify.post('/api/tasks', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = createTaskSchema.parse(request.body);

    app.logger.info(
      { userId: session.user.id, title: body.title, address: body.address },
      'Creating new task'
    );

    try {
      const [newTask] = await app.db
        .insert(schema.tasks)
        .values({
          title: body.title,
          address: body.address,
          latitude: body.latitude.toString(),
          longitude: body.longitude.toString(),
          bulletPoints: body.bulletPoints,
          completed: false,
          userId: session.user.id,
        })
        .returning();

      app.logger.info(
        { taskId: newTask.id, userId: session.user.id },
        'Task created successfully'
      );

      return {
        id: newTask.id,
        title: newTask.title,
        address: newTask.address,
        latitude: parseFloat(newTask.latitude),
        longitude: parseFloat(newTask.longitude),
        bulletPoints: newTask.bulletPoints,
        completed: newTask.completed,
        createdAt: newTask.createdAt,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, body },
        'Failed to create task'
      );
      throw error;
    }
  });

  // PUT /api/tasks/:id - Update a task
  app.fastify.put('/api/tasks/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    app.logger.info(
      { userId: session.user.id, taskId: id },
      'Updating task'
    );

    try {
      // Verify task belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.id, id),
            eq(schema.tasks.userId, session.user.id)
          )
        );

      if (existingTask.length === 0) {
        app.logger.warn(
          { userId: session.user.id, taskId: id },
          'Task not found or user unauthorized'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.latitude !== undefined)
        updateData.latitude = body.latitude.toString();
      if (body.longitude !== undefined)
        updateData.longitude = body.longitude.toString();
      if (body.bulletPoints !== undefined)
        updateData.bulletPoints = body.bulletPoints;
      if (body.completed !== undefined) updateData.completed = body.completed;

      const [updatedTask] = await app.db
        .update(schema.tasks)
        .set(updateData)
        .where(eq(schema.tasks.id, id))
        .returning();

      app.logger.info(
        { taskId: id, userId: session.user.id },
        'Task updated successfully'
      );

      return {
        id: updatedTask.id,
        title: updatedTask.title,
        address: updatedTask.address,
        latitude: parseFloat(updatedTask.latitude),
        longitude: parseFloat(updatedTask.longitude),
        bulletPoints: updatedTask.bulletPoints,
        completed: updatedTask.completed,
        createdAt: updatedTask.createdAt,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, taskId: id, body },
        'Failed to update task'
      );
      throw error;
    }
  });

  // DELETE /api/tasks/:id - Delete a task
  app.fastify.delete('/api/tasks/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    app.logger.info(
      { userId: session.user.id, taskId: id },
      'Deleting task'
    );

    try {
      // Verify task belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.id, id),
            eq(schema.tasks.userId, session.user.id)
          )
        );

      if (existingTask.length === 0) {
        app.logger.warn(
          { userId: session.user.id, taskId: id },
          'Task not found or user unauthorized'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      await app.db.delete(schema.tasks).where(eq(schema.tasks.id, id));

      app.logger.info(
        { taskId: id, userId: session.user.id },
        'Task deleted successfully'
      );

      return { success: true };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, taskId: id },
        'Failed to delete task'
      );
      throw error;
    }
  });

  // POST /api/geocode - Geocode an address using Nominatim
  app.fastify.post('/api/geocode', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body = geocodeSchema.parse(request.body);

    app.logger.info({ address: body.address }, 'Geocoding address');

    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          body.address
        )}`
      );

      if (!response.ok) {
        app.logger.error(
          { address: body.address, status: response.status },
          'Nominatim API request failed'
        );
        return reply.status(500).send({ error: 'Geocoding service error' });
      }

      const results = await response.json() as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!results || results.length === 0) {
        app.logger.warn(
          { address: body.address },
          'No geocoding results found'
        );
        return reply.status(404).send({ error: 'Address not found' });
      }

      const result = results[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);

      app.logger.info(
        {
          address: body.address,
          latitude,
          longitude,
          formattedAddress: result.display_name,
        },
        'Address geocoded successfully'
      );

      return {
        latitude,
        longitude,
        formattedAddress: result.display_name,
      };
    } catch (error) {
      app.logger.error(
        { err: error, address: body.address },
        'Geocoding failed'
      );
      throw error;
    }
  });
}
