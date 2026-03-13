import React from 'react';
import { View, Image, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const backgroundImages = [
  require('../../assets/backgrounds/Pull up in hoop one.png'),
  require('../../assets/backgrounds/Pull up a hoop two.png'),
  require('../../assets/backgrounds/Pull up the heat three.png'),
  require('../../assets/backgrounds/Pull up and hoop for.png'),
  require('../../assets/backgrounds/Pull up a hoop file.png'),
  require('../../assets/backgrounds/Pull up the hoop six.png'),
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
