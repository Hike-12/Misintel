// components/ShinyEarth.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ShinyEarth() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true
    });
    
    // Perfect size - 220px for good visibility but not too big
    renderer.setSize(220, 220);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create Earth sphere with high resolution
    const geometry = new THREE.SphereGeometry(1, 96, 96);
    
    const textureLoader = new THREE.TextureLoader();
    
    // Load all Earth textures
    const earthDayTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const earthNightTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_night_2048.jpg');
    const earthSpecularTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
    const earthNormalTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
    const earthCloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');

    // Create day Earth material (shiny and bright)
    const earthDayMaterial = new THREE.MeshPhongMaterial({
      map: earthDayTexture,
      specularMap: earthSpecularTexture,
      normalMap: earthNormalTexture,
      normalScale: new THREE.Vector2(0.6, 0.6),
      specular: new THREE.Color(0x333333),
      shininess: 30,
      transparent: true,
      opacity: 1
    });

    // Create night Earth material with city lights
    const earthNightMaterial = new THREE.MeshBasicMaterial({
      map: earthNightTexture,
      transparent: true,
      opacity: 0.9
    });

    // Create Earth group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Day side Earth
    const earthDay = new THREE.Mesh(geometry, earthDayMaterial);
    earthGroup.add(earthDay);

    // Night side Earth with city lights
    const earthNight = new THREE.Mesh(geometry, earthNightMaterial);
    earthNight.rotation.y = Math.PI; // Rotate to show night side
    earthGroup.add(earthNight);

    // Clouds layer
    const cloudGeometry = new THREE.SphereGeometry(1.01, 96, 96);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: earthCloudTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(clouds);

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.05, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x7EC8E3,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x333333, 0.4);
    scene.add(ambientLight);
    
    // Main sunlight - creates day/night effect
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Additional lights to enhance shininess
    const fillLight = new THREE.DirectionalLight(0x88CCFF, 0.5);
    fillLight.position.set(-3, -1, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFFFFFF, 0.6);
    rimLight.position.set(-2, 1, -3);
    scene.add(rimLight);

    // Set camera position for perfect view
    camera.position.z = 2.6;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Smooth rotation
      earthGroup.rotation.y += 0.002;
      
      // Rotate clouds slightly faster for realistic effect
      clouds.rotation.y += 0.0022;

      // Update day/night materials based on rotation
      const rotation = earthGroup.rotation.y % (Math.PI * 2);
      const dayOpacity = Math.sin(rotation) * 0.5 + 0.5;
      const nightOpacity = 1 - dayOpacity;
      
      earthDayMaterial.opacity = Math.min(1, dayOpacity * 1.5);
      earthNightMaterial.opacity = Math.min(1, nightOpacity * 1.2);

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const { width, height } = mountRef.current.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-[240px] flex items-center justify-center">
      <div 
        ref={mountRef} 
        className="w-[220px] h-[220px]"
        style={{
          filter: 'drop-shadow(0 0 20px rgba(100, 150, 255, 0.25))'
        }}
      />
    </div>
  );
}