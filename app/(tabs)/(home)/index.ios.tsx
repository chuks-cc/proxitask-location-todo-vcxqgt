
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { Map } from '@/components/Map';
import { ConfirmModal } from '@/components/ui/Modal';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

const GEOFENCE_RADIUS = 150; // Monitoring radius in meters
const NOTIFICATION_DISTANCE = 100; // Trigger notification at 100 meters
const COOLDOWN_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface Task {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  bulletPoints: string[];
  completed: boolean;
  createdAt: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Cooldown tracker for notifications
const notificationCooldowns = new Map<string, number>();

// Define the background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Background Task] Error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    
    if (!location) {
      console.log('[Background Task] No location data');
      return;
    }

    console.log('[Background Task] Location update:', location.coords);

    try {
      // Fetch tasks from backend (public, no auth required)
      const backendUrl = Constants.expoConfig?.extra?.backendUrl || '';
      console.log('[Background Task] Using backend URL:', backendUrl);
      const response = await fetch(`${backendUrl}/api/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[Background Task] Failed to fetch tasks:', response.status);
        return;
      }

      const tasks: Task[] = await response.json();
      console.log('[Background Task] Fetched tasks:', tasks.length);

      const currentTime = Date.now();

      // Check proximity to each task
      for (const task of tasks) {
        if (!task.completed) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            task.latitude,
            task.longitude
          );

          console.log(`[Background Task] Distance to "${task.title}": ${distance.toFixed(2)}m`);

          // Check if within notification distance (100m)
          if (distance <= NOTIFICATION_DISTANCE) {
            // Check cooldown
            const lastNotificationTime = notificationCooldowns.get(task.id) || 0;
            const timeSinceLastNotification = currentTime - lastNotificationTime;

            if (timeSinceLastNotification >= COOLDOWN_DURATION) {
              console.log(`[Background Task] Sending notification for task: ${task.title}`);

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `📍 Near Task: ${task.title}`,
                  body: `You're ${distance.toFixed(0)} meters away from "${task.address}"`,
                  data: { taskId: task.id },
                },
                trigger: null,
              });

              // Update cooldown
              notificationCooldowns.set(task.id, currentTime);
            } else {
              const remainingCooldown = Math.ceil((COOLDOWN_DURATION - timeSinceLastNotification) / 60000);
              console.log(`[Background Task] Cooldown active for "${task.title}". ${remainingCooldown} minutes remaining.`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Background Task] Error processing location:', error);
    }
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mapContainer: {
    height: 300,
    backgroundColor: colors.grey,
  },
  content: {
    flex: 1,
  },
  taskList: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  taskAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    marginBottom: 4,
  },
  distanceBadge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulletPointInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletInputField: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBulletButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.grey,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBulletText: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: colors.grey,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  deleteButton: {
    padding: 8,
  },
  removeBulletButton: {
    marginLeft: 8,
    padding: 8,
  },
  completedTask: {
    opacity: 0.6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    marginLeft: 4,
    color: colors.textSecondary,
    fontSize: 14,
  },
  backgroundStatusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  backgroundStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default function HomeScreen() {
  console.log('ProxyTasks HomeScreen rendered (iOS)');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backgroundLocationEnabled, setBackgroundLocationEnabled] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    address: '',
    bulletPoints: [''],
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    visible: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({
    visible: false,
    taskId: null,
    taskTitle: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const notifiedTasks = useRef<Map<string, number>>(new Map());

  const requestPermissions = async () => {
    try {
      console.log('Requesting location permissions...');
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        console.log('Foreground location permission denied');
        setErrorMessage('Location permission is required to use ProxyTasks');
        return;
      }
      console.log('Foreground location permission granted');

      console.log('Requesting background location permissions (Always Allow)...');
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== 'granted') {
        console.log('Background location permission denied');
        setErrorMessage('Background location permission (Always Allow) is required for notifications when the app is closed. Please enable it in Settings.');
      } else {
        console.log('Background location permission granted');
      }

      console.log('Requesting notification permissions...');
      const notificationPermission = await Notifications.requestPermissionsAsync();
      if (notificationPermission.status !== 'granted') {
        console.log('Notification permission denied');
        setErrorMessage('Notification permission is required to alert you when near tasks.');
      } else {
        console.log('Notification permission granted');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const checkProximityToTasks = useCallback((location: UserLocation) => {
    console.log('Checking proximity to tasks...');
    const currentTime = Date.now();

    tasks.forEach((task) => {
      if (!task.completed) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          task.latitude,
          task.longitude
        );
        console.log(`Distance to task "${task.title}": ${distance.toFixed(2)} meters`);
        
        // Check if within notification distance (100m)
        if (distance <= NOTIFICATION_DISTANCE) {
          const lastNotificationTime = notifiedTasks.current.get(task.id) || 0;
          const timeSinceLastNotification = currentTime - lastNotificationTime;

          if (timeSinceLastNotification >= COOLDOWN_DURATION) {
            console.log(`User is within 100m of task: ${task.title}`);
            sendNotification(task, distance);
            notifiedTasks.current.set(task.id, currentTime);
          } else {
            const remainingCooldown = Math.ceil((COOLDOWN_DURATION - timeSinceLastNotification) / 60000);
            console.log(`Cooldown active for "${task.title}". ${remainingCooldown} minutes remaining.`);
          }
        }
      }
    });
  }, [tasks]);

  const startLocationTracking = async () => {
    try {
      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('Current location:', location.coords);
      const newUserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(newUserLocation);

      console.log('Starting location watch...');
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 50, // Update every 50 meters for better precision
        },
        (newLocation) => {
          console.log('Location updated:', newLocation.coords);
          const updatedLocation = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setUserLocation(updatedLocation);
          checkProximityToTasks(updatedLocation);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const startBackgroundLocationTracking = async () => {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        console.log('[Background] Task not defined, cannot start');
        return;
      }

      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (hasStarted) {
        console.log('[Background] Location tracking already started');
        setBackgroundLocationEnabled(true);
        return;
      }

      console.log('[Background] Starting background location tracking with geofencing...');
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Check every 30 seconds when in geofence radius
        distanceInterval: 50, // Or when moved 50 meters
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Other,
        showsBackgroundLocationIndicator: true,
      });

      console.log('[Background] Background location tracking started successfully');
      setBackgroundLocationEnabled(true);
    } catch (error) {
      console.error('[Background] Error starting background location tracking:', error);
      setBackgroundLocationEnabled(false);
    }
  };

  const sendNotification = async (task: Task, distance: number) => {
    console.log(`Sending notification for task: ${task.title}`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Near Task: ${task.title}`,
        body: `You're ${distance.toFixed(0)} meters away from "${task.address}"`,
        data: { taskId: task.id },
      },
      trigger: null,
    });
  };

  const loadTasks = async () => {
    console.log('[API] Loading tasks from backend...');
    try {
      const response = await apiGet<Task[]>('/api/tasks');
      console.log('[API] Tasks loaded:', response);
      setTasks(response);
    } catch (error) {
      console.error('[API] Error loading tasks:', error);
      setErrorMessage('Failed to load tasks. Please try again.');
      setTasks([]);
    }
  };

  const initializeApp = useCallback(async () => {
    console.log('Initializing ProxyTasks (iOS)...');
    await requestPermissions();
    await startLocationTracking();
    await startBackgroundLocationTracking();
    await loadTasks();
    setLoading(false);
  }, []);

  useEffect(() => {
    console.log('ProxyTasks app starting (iOS)...');
    initializeApp();
    return () => {
      if (locationSubscription.current) {
        console.log('Cleaning up location subscription');
        locationSubscription.current.remove();
      }
    };
  }, [initializeApp]);

  const saveTask = async () => {
    if (!newTask.title.trim() || !newTask.address.trim()) {
      setErrorMessage('Please enter a title and address');
      return;
    }

    console.log('[API] Saving new task:', newTask);
    setSaving(true);
    
    try {
      console.log('[API] Geocoding address:', newTask.address);
      const geocodeResponse = await apiPost<{
        latitude: number;
        longitude: number;
        formattedAddress: string;
      }>('/api/geocode', { address: newTask.address });
      
      console.log('[API] Geocode result:', geocodeResponse);

      const taskData = {
        title: newTask.title,
        address: geocodeResponse.formattedAddress || newTask.address,
        latitude: geocodeResponse.latitude,
        longitude: geocodeResponse.longitude,
        bulletPoints: newTask.bulletPoints.filter(bp => bp.trim() !== ''),
      };

      console.log('[API] Creating task:', taskData);
      const createdTask = await apiPost<Task>('/api/tasks', taskData);
      console.log('[API] Task created:', createdTask);

      setTasks([...tasks, createdTask]);
      setModalVisible(false);
      setNewTask({ title: '', address: '', bulletPoints: [''] });
    } catch (error) {
      console.error('[API] Error saving task:', error);
      setErrorMessage('Failed to save task. Please check the address and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    console.log('[API] Toggling task completion:', taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.log('[API] Task not found');
      return;
    }

    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);

    try {
      await apiPut(`/api/tasks/${taskId}`, { completed: !task.completed });
      console.log('[API] Task completion toggled successfully');
    } catch (error) {
      console.error('[API] Error toggling task completion:', error);
      setTasks(tasks);
      setErrorMessage('Failed to update task. Please try again.');
    }
  };

  const confirmDeleteTask = (taskId: string, taskTitle: string) => {
    setDeleteConfirmModal({
      visible: true,
      taskId,
      taskTitle,
    });
  };

  const deleteTask = async () => {
    const { taskId } = deleteConfirmModal;
    if (!taskId) {
      console.log('[API] No task ID to delete');
      return;
    }

    console.log('[API] Deleting task:', taskId);
    
    const originalTasks = [...tasks];
    setTasks(tasks.filter(task => task.id !== taskId));
    setDeleteConfirmModal({ visible: false, taskId: null, taskTitle: '' });

    try {
      await apiDelete(`/api/tasks/${taskId}`);
      console.log('[API] Task deleted successfully');
    } catch (error) {
      console.error('[API] Error deleting task:', error);
      setTasks(originalTasks);
      setErrorMessage('Failed to delete task. Please try again.');
    }
  };

  const addBulletPoint = () => {
    setNewTask({
      ...newTask,
      bulletPoints: [...newTask.bulletPoints, ''],
    });
  };

  const updateBulletPoint = (index: number, value: string) => {
    const updatedBulletPoints = [...newTask.bulletPoints];
    updatedBulletPoints[index] = value;
    setNewTask({ ...newTask, bulletPoints: updatedBulletPoints });
  };

  const removeBulletPoint = (index: number) => {
    const updatedBulletPoints = newTask.bulletPoints.filter((_, i) => i !== index);
    setNewTask({ ...newTask, bulletPoints: updatedBulletPoints });
  };

  const getMapMarkers = () => {
    const markers = tasks.map(task => ({
      id: task.id,
      latitude: task.latitude,
      longitude: task.longitude,
      title: task.title,
      description: task.address,
    }));

    if (userLocation) {
      markers.push({
        id: 'user-location',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        title: 'Your Location',
        description: 'You are here',
      });
    }

    return markers;
  };

  const handleAddTaskPress = () => {
    console.log('User tapped Add Task button (+)');
    setModalVisible(true);
  };

  if (loading) {
    const loadingText = 'Loading ProxyTasks...';
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>{loadingText}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emptyStateText = 'No tasks yet. Tap the + button to create a location-based task!';
  const backgroundStatusText = backgroundLocationEnabled 
    ? '✓ Background tracking active (100m alerts)' 
    : '⚠ Background tracking disabled';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ProxyTasks</Text>
        <Text style={styles.headerSubtitle}>Get notified within 100 meters of your tasks</Text>
        {backgroundLocationEnabled && (
          <View style={styles.backgroundStatusBadge}>
            <Text style={styles.backgroundStatusText}>{backgroundStatusText}</Text>
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <Map
          markers={getMapMarkers()}
          initialRegion={
            userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
          showsUserLocation={true}
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.taskList}>
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="location.circle"
                android_material_icon_name="location-on"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                {emptyStateText}
              </Text>
            </View>
          ) : (
            tasks.map((task) => {
              const distance = userLocation
                ? calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    task.latitude,
                    task.longitude
                  )
                : null;
              const distanceText = distance ? `${distance.toFixed(0)} meters away` : '';
              const checkboxText = task.completed ? 'Completed' : 'Mark as complete';

              return (
                <View key={task.id} style={[styles.taskCard, task.completed && styles.completedTask]}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDeleteTask(task.id, task.title)}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.addressRow}>
                    <IconSymbol
                      ios_icon_name="location"
                      android_material_icon_name="location-on"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.addressText}>{task.address}</Text>
                  </View>

                  {task.bulletPoints.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {task.bulletPoints.map((point, index) => (
                        <Text key={index} style={styles.bulletPoint}>
                          • {point}
                        </Text>
                      ))}
                    </View>
                  )}

                  {distanceText && (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>
                        {distanceText}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                      {task.completed && (
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={16}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      {checkboxText}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleAddTaskPress}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={32}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              style={styles.input}
              placeholder="Task Title"
              placeholderTextColor={colors.textSecondary}
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor={colors.textSecondary}
              value={newTask.address}
              onChangeText={(text) => setNewTask({ ...newTask, address: text })}
            />

            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text }}>
              Bullet Points
            </Text>

            <ScrollView style={{ maxHeight: 200 }}>
              {newTask.bulletPoints.map((point, index) => (
                <View key={index} style={styles.bulletPointInput}>
                  <TextInput
                    style={styles.bulletInputField}
                    placeholder={`Point ${index + 1}`}
                    placeholderTextColor={colors.textSecondary}
                    value={point}
                    onChangeText={(text) => updateBulletPoint(index, text)}
                  />
                  {newTask.bulletPoints.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBulletButton}
                      onPress={() => removeBulletPoint(index)}
                    >
                      <IconSymbol
                        ios_icon_name="minus.circle"
                        android_material_icon_name="remove-circle"
                        size={24}
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.addBulletButton} onPress={addBulletPoint}>
              <Text style={styles.addBulletText}>+ Add Bullet Point</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewTask({ title: '', address: '', bulletPoints: [''] });
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveTask}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={deleteConfirmModal.visible}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteConfirmModal.taskTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={deleteTask}
        onCancel={() => setDeleteConfirmModal({ visible: false, taskId: null, taskTitle: '' })}
      />

      {errorMessage && (
        <ConfirmModal
          visible={!!errorMessage}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          cancelText=""
          type="warning"
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
        />
      )}
    </SafeAreaView>
  );
}
