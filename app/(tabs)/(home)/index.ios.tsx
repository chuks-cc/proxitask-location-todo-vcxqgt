
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import { IconSymbol } from '@/components/IconSymbol';
import { Map } from '@/components/Map';
import { ConfirmModal } from '@/components/ui/Modal';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

const ONE_MILE_IN_METERS = 1609.34;
const TRIGGER_DISTANCE_METERS = 100;
const MONITORING_RADIUS_METERS = 150;
const BACKGROUND_LOCATION_TASK = 'background-location-task';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Background Task] Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    console.log('[Background Task] Location update:', location.coords);
    
    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      if (!backendUrl) {
        console.error('[Background Task] Backend URL not configured');
        return;
      }

      const tasksResponse = await fetch(`${backendUrl}/api/tasks`);
      const tasks = await tasksResponse.json();
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      const pushToken = tokenData.data;

      for (const task of tasks) {
        if (!task.completed) {
          const distance = calculateDistanceHaversine(
            location.coords.latitude,
            location.coords.longitude,
            task.latitude,
            task.longitude
          );
          
          if (distance <= TRIGGER_DISTANCE_METERS) {
            console.log(`[Background Task] User within ${TRIGGER_DISTANCE_METERS}m of task: ${task.title}`);
            
            await fetch(`${backendUrl}/api/push-notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: pushToken,
                taskId: task.id,
                taskTitle: task.title,
                taskAddress: task.address,
                distance: Math.round(distance),
                userLatitude: location.coords.latitude,
                userLongitude: location.coords.longitude,
              }),
            });
          }
        }
      }
    } catch (error) {
      console.error('[Background Task] Error checking proximity:', error);
    }
  }
});

function calculateDistanceHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

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
    paddingBottom: 120,
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
    bottom: 120,
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
    zIndex: 9999,
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
});

export default function HomeScreen() {
  console.log('ProxyTasks HomeScreen (iOS) rendered');
  
  const [tasks, setTasksState] = useState<Task[]>([]);
  const setTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksState(prev => {
      const resolved = typeof newTasks === 'function' ? newTasks(prev) : newTasks;
      tasksRef.current = resolved;
      return resolved;
    });
  };
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [pushToken, setPushToken] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());
  const tasksRef = useRef<Task[]>([]);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('Initializing ProxyTasks...');
    initializeApp();
    return () => {
      if (locationSubscription.current) {
        console.log('Cleaning up location subscription');
        locationSubscription.current.remove();
      }
    };
  }, []);

  const initializeApp = async () => {
    console.log('Requesting permissions...');
    await requestPermissions();
    console.log('Registering for push notifications...');
    await registerForPushNotifications();
    console.log('Starting location tracking...');
    await startLocationTracking();
    console.log('Starting background location tracking...');
    await startBackgroundLocationTracking();
    console.log('Loading tasks...');
    await loadTasks();
    setLoading(false);
  };

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      const token = tokenData.data;
      console.log('Push notification token:', token);
      setPushToken(token);
      pushTokenRef.current = token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

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

      console.log('Requesting background location permissions...');
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== 'granted') {
        console.log('Background location permission denied - notifications may not work when app is closed');
      } else {
        console.log('Background location permission granted');
      }

      console.log('Requesting notification permissions...');
      const notificationPermission = await Notifications.requestPermissionsAsync();
      if (notificationPermission.status !== 'granted') {
        console.log('Notification permission denied');
      } else {
        console.log('Notification permission granted');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const startBackgroundLocationTracking = async () => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Background location permission not granted, skipping background tracking');
        return;
      }

      const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        console.log('Background location task not defined');
        return;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,
        distanceInterval: 100,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Fitness,
      });
      console.log('Background location tracking started');
    } catch (error) {
      console.error('Error starting background location tracking:', error);
    }
  };

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
          distanceInterval: 50,
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

  const checkProximityToTasks = async (location: UserLocation) => {
    console.log('Checking proximity to tasks...');
    
    const currentPushToken = pushTokenRef.current;
    if (!currentPushToken) {
      console.log('No push token available, skipping proximity check');
      return;
    }

    for (const task of tasksRef.current) {
      if (!task.completed) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          task.latitude,
          task.longitude
        );
        console.log(`Distance to task "${task.title}": ${distance.toFixed(2)} meters`);
        
        if (distance <= MONITORING_RADIUS_METERS && !notifiedTasks.current.has(task.id)) {
          if (distance <= TRIGGER_DISTANCE_METERS) {
            console.log(`User is within ${TRIGGER_DISTANCE_METERS}m of task: ${task.title}`);
            await sendPushNotification(task, distance, location);
            notifiedTasks.current.add(task.id);
          }
        } else if (distance > MONITORING_RADIUS_METERS && notifiedTasks.current.has(task.id)) {
          notifiedTasks.current.delete(task.id);
        }
      }
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const sendPushNotification = async (task: Task, distance: number, location: UserLocation) => {
    const distanceInMeters = Math.round(distance);
    console.log(`Sending push notification for task: ${task.title}`);
    
    try {
      const deviceId = pushTokenRef.current || pushToken || 'unknown';
      
      await apiPost('/api/push-notifications/send', {
        deviceId,
        taskId: task.id,
        taskTitle: task.title,
        taskAddress: task.address,
        distance: distanceInMeters,
        userLatitude: location.latitude,
        userLongitude: location.longitude,
      });
      
      console.log('Push notification sent successfully via backend');
    } catch (error) {
      console.error('Error sending push notification via backend:', error);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📍 Near Task: ${task.title}`,
          body: `You're ${distanceInMeters}m away from "${task.address}"`,
          data: { taskId: task.id },
          sound: 'default',
        },
        trigger: null,
      });
      console.log('Fallback local notification scheduled');
    }
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

  const saveTask = async () => {
    if (!newTask.title.trim() || !newTask.address.trim()) {
      setErrorMessage('Please enter a title and address');
      return;
    }

    console.log('[API] Saving new task:', newTask);
    setSaving(true);
    
    try {
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

      setTasks(prev => [...prev, createdTask]);
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
      console.log('Task not found');
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
    console.log('User requested to delete task:', taskTitle);
    setDeleteConfirmModal({
      visible: true,
      taskId,
      taskTitle,
    });
  };

  const deleteTask = async () => {
    const { taskId } = deleteConfirmModal;
    if (!taskId) {
      console.log('No task ID to delete');
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
    console.log('User added a bullet point');
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
    console.log('User removed bullet point at index:', index);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ProxyTasks</Text>
        <Text style={styles.headerSubtitle}>Location-based task reminders</Text>
      </View>

      <View style={styles.mapContainer}>
        <Map
          markers={getMapMarkers()}
          initialRegion={
            userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
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
              const distanceInMiles = distance ? (distance / ONE_MILE_IN_METERS).toFixed(2) : null;
              const distanceText = distanceInMiles ? `${distanceInMiles} miles away` : '';
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
        onPress={() => {
          console.log('User tapped Add Task button');
          setModalVisible(true);
        }}
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
                  console.log('User cancelled task creation');
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
