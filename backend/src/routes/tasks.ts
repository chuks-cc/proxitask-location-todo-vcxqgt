import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
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
  // GET /api/tasks - Get all tasks
  app.fastify.get('/api/tasks', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    app.logger.info('Fetching all tasks');

    try {
      const allTasks = await app.db
        .select()
        .from(schema.tasks);

      app.logger.info(
        { taskCount: allTasks.length },
        'Tasks fetched successfully'
      );

      return allTasks.map((task) => ({
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
        { err: error },
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
    const body = createTaskSchema.parse(request.body);

    app.logger.info(
      { title: body.title, address: body.address },
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
        })
        .returning();

      app.logger.info(
        { taskId: newTask.id },
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
        { err: error, body },
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
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    app.logger.info(
      { taskId: id },
      'Updating task'
    );

    try {
      // Check if task exists
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, id));

      if (existingTask.length === 0) {
        app.logger.warn(
          { taskId: id },
          'Task not found'
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
        { taskId: id },
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
        { err: error, taskId: id, body },
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
    const { id } = request.params as { id: string };

    app.logger.info(
      { taskId: id },
      'Deleting task'
    );

    try {
      // Check if task exists
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, id));

      if (existingTask.length === 0) {
        app.logger.warn(
          { taskId: id },
          'Task not found'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      await app.db.delete(schema.tasks).where(eq(schema.tasks.id, id));

      app.logger.info(
        { taskId: id },
        'Task deleted successfully'
      );

      return { success: true };
    } catch (error) {
      app.logger.error(
        { err: error, taskId: id },
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
