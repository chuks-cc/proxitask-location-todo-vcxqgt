import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// ProxiTask theme colors - location-based productivity
export const colors = {
  primary: '#4A90E2',      // Calm blue for location/map
  secondary: '#7B68EE',    // Purple for tasks
  accent: '#FF6B6B',       // Coral red for notifications/alerts
  background: '#F8F9FA',   // Light gray background
  backgroundAlt: '#FFFFFF', // White for cards
  text: '#1A1A1A',         // Dark text
  textSecondary: '#6C757D', // Gray text
  grey: '#E9ECEF',         // Light gray
  card: '#FFFFFF',         // White cards
  highlight: '#FFD93D',    // Yellow for proximity alerts
  success: '#51CF66',      // Green for completed tasks
  border: '#E9ECEF',
  mapPin: '#E74C3C',       // Red for map markers
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
