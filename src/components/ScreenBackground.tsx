import React from 'react';
import { View, Image, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const backgroundImages = [
  require('../../assets/backgrounds/bg-1.png'),
  require('../../assets/backgrounds/bg-2.png'),
  require('../../assets/backgrounds/bg-3.png'),
  require('../../assets/backgrounds/bg-4.png'),
  require('../../assets/backgrounds/bg-5.png'),
  require('../../assets/backgrounds/bg-6.png'),
];

const logo = require('../../assets/backgrounds/logo.png');

interface ScreenBackgroundProps {
  children: React.ReactNode;
  imageIndex?: number;
  showLogo?: boolean;
}

export default function ScreenBackground({
  children,
  imageIndex = 0,
  showLogo = false,
}: ScreenBackgroundProps) {
  const bgImage = backgroundImages[imageIndex % backgroundImages.length];

  return (
    <View style={styles.container}>
      {/* Background basketball image - faint silhouette */}
      <Image source={bgImage} style={styles.bgImage} resizeMode="cover" />
      {/* Dark overlay to make it very faint */}
      <View style={styles.overlay} />
      {/* Logo watermark */}
      {showLogo && (
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      )}
      {/* Screen content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    opacity: 0.15,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: Colors.background,
    opacity: 0.7,
  },
  logo: {
    position: 'absolute',
    top: 0,
    left: 12,
    width: 160,
    height: 160,
    opacity: 1,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
});
