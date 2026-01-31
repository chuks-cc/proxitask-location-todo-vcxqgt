
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { IconSymbol } from '@/components/IconSymbol';
import { Map } from '@/components/Map';
import { ConfirmModal } from '@/components/ui/Modal';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete, apiPost } from '@/utils/api';

const ONE_MILE_IN_METERS = 1609.34;

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
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
});

export default function HomeScreen() {
  console.log('ProxiTask HomeScreen rendered');
  
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log('Initializing ProxiTask...');
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
    console.log('Starting location tracking...');
    await startLocationTracking();
    console.log('Loading tasks...');
    await loadTasks();
    setLoading(false);
  };

  const requestPermissions = async () => {
    try {
      console.log('Requesting location permissions...');
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        console.log('Foreground location permission denied');
        setErrorMessage('Location permission is required to use ProxiTask');
        return;
      }
      console.log('Foreground location permission granted');

      console.log('Requesting background location permissions...');
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== 'granted') {
        console.log('Background location permission denied');
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
          distanceInterval: 100,
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

  const checkProximityToTasks = (location: UserLocation) => {
    console.log('Checking proximity to tasks...');
    tasks.forEach((task) => {
      if (!task.completed) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          task.latitude,
          task.longitude
        );
        console.log(`Distance to task "${task.title}": ${distance.toFixed(2)} meters`);
        
        if (distance <= ONE_MILE_IN_METERS && !notifiedTasks.current.has(task.id)) {
          console.log(`User is within 1 mile of task: ${task.title}`);
          sendNotification(task, distance);
          notifiedTasks.current.add(task.id);
        } else if (distance > ONE_MILE_IN_METERS && notifiedTasks.current.has(task.id)) {
          notifiedTasks.current.delete(task.id);
        }
      }
    });
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

  const sendNotification = async (task: Task, distance: number) => {
    const distanceInMiles = (distance / ONE_MILE_IN_METERS).toFixed(2);
    console.log(`Sending notification for task: ${task.title}`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Near Task: ${task.title}`,
        body: `You're ${distanceInMiles} miles away from "${task.address}"`,
        data: { taskId: task.id },
      },
      trigger: null,
    });
  };

  const loadTasks = async () => {
    console.log('[API] Loading tasks from backend...');
    try {
      const response = await authenticatedGet<Task[]>('/api/tasks');
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
      // Step 1: Geocode the address to get coordinates
      console.log('[API] Geocoding address:', newTask.address);
      const geocodeResponse = await apiPost<{
        latitude: number;
        longitude: number;
        formattedAddress: string;
      }>('/api/geocode', { address: newTask.address });
      
      console.log('[API] Geocode result:', geocodeResponse);

      // Step 2: Create the task with coordinates
      const taskData = {
        title: newTask.title,
        address: geocodeResponse.formattedAddress || newTask.address,
        latitude: geocodeResponse.latitude,
        longitude: geocodeResponse.longitude,
        bulletPoints: newTask.bulletPoints.filter(bp => bp.trim() !== ''),
      };

      console.log('[API] Creating task:', taskData);
      const createdTask = await authenticatedPost<Task>('/api/tasks', taskData);
      console.log('[API] Task created:', createdTask);

      // Update local state
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
    if (!task) return;

    // Optimistic update
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);

    try {
      await authenticatedPut(`/api/tasks/${taskId}`, { completed: !task.completed });
      console.log('[API] Task completion toggled successfully');
    } catch (error) {
      console.error('[API] Error toggling task completion:', error);
      // Revert on error
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
    if (!taskId) return;

    console.log('[API] Deleting task:', taskId);
    
    // Optimistic update
    const originalTasks = [...tasks];
    setTasks(tasks.filter(task => task.id !== taskId));
    setDeleteConfirmModal({ visible: false, taskId: null, taskTitle: '' });

    try {
      await authenticatedDelete(`/api/tasks/${taskId}`);
      console.log('[API] Task deleted successfully');
    } catch (error) {
      console.error('[API] Error deleting task:', error);
      // Revert on error
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
    const loadingText = 'Loading ProxiTask...';
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
        <Text style={styles.headerTitle}>ProxiTask</Text>
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

      {/* Delete Confirmation Modal */}
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

      {/* Error Modal */}
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
